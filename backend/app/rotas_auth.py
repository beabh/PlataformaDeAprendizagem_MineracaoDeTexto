"""Login com Google (OpenID Connect) e login de teste para desenvolvimento."""
import httpx
from authlib.integrations.base_client.errors import OAuthError
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from . import servicos
from .dependencias import get_db
from .erros import ErroNegocio
from .modelos import Turma, Usuario

router = APIRouter()
oauth = OAuth()
DESCOBERTA_GOOGLE = "https://accounts.google.com/.well-known/openid-configuration"


def registrar_google(cfg) -> None:
    if cfg.google_client_id and cfg.google_client_secret:
        oauth.register(
            name="google",
            client_id=cfg.google_client_id,
            client_secret=cfg.google_client_secret,
            server_metadata_url=DESCOBERTA_GOOGLE,
            client_kwargs={"scope": "openid email profile"},
        )


def _turma_padrao(db, codigo: str) -> Turma:
    turma = db.scalar(select(Turma).where(Turma.codigo == codigo))
    if turma is None:
        turma = Turma(codigo=codigo, nome=codigo.replace("-", " ").title())
        db.add(turma)
        db.flush()
    return turma


def entrar_ou_criar(db, cfg, sub: str | None, email: str, nome: str) -> Usuario:
    usuario = db.scalar(select(Usuario).where(Usuario.google_sub == sub)) if sub else None
    if usuario is None:
        usuario = db.scalar(select(Usuario).where(Usuario.email == email))
    if usuario is None:
        usuario = Usuario(google_sub=sub, email=email, nome_google=nome or email,
                          turma_id=_turma_padrao(db, cfg.turma_padrao).id)
        db.add(usuario)
    elif usuario.anonimizado:
        raise ErroNegocio("conta_removida", "Esta conta foi removida.", 403)
    else:
        usuario.google_sub = sub or usuario.google_sub
        usuario.nome_google = nome or usuario.nome_google
    db.commit()
    return usuario


@router.get("/google")
async def google_entrar(request: Request):
    cfg = request.app.state.config
    if "google" not in oauth._registry:
        raise ErroNegocio("google_nao_configurado",
                          "O login com Google não está configurado neste servidor.", 503)
    destino = cfg.url_publica.rstrip("/") + "/auth/google/retorno"
    try:
        return await oauth.google.authorize_redirect(request, destino)
    except (httpx.HTTPError, OSError) as exc:
        # Sem conexão com o Google (rede, proxy ou DNS): avisa em vez de responder 500.
        raise ErroNegocio("google_indisponivel",
                          "Não foi possível conectar ao Google agora. Tente de novo em instantes.", 503) from exc


@router.get("/google/retorno")
async def google_retorno(request: Request, db=Depends(get_db)):
    if "google" not in oauth._registry:
        raise ErroNegocio("google_nao_configurado", "O login com Google não está configurado.", 503)
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as exc:
        # Estado expirado ou login recusado: o estudante tenta de novo a partir do início.
        raise ErroNegocio("login_invalido", "O login não pôde ser concluído. Tente entrar de novo.", 400) from exc
    except (httpx.HTTPError, OSError) as exc:
        raise ErroNegocio("google_indisponivel",
                          "Não foi possível conectar ao Google agora. Tente de novo em instantes.", 503) from exc
    info = token.get("userinfo") or {}
    if not info.get("email_verified"):
        raise ErroNegocio("email_nao_verificado", "Use uma conta Google com e-mail verificado.", 403)
    usuario = entrar_ou_criar(db, request.app.state.config, info.get("sub"), info["email"], info.get("name", ""))
    request.session["usuario_id"] = usuario.id
    return RedirectResponse("/painel.html", status_code=303)


@router.get("/desenvolvimento")
def entrar_desenvolvimento(request: Request, db=Depends(get_db),
                           email: str = Query(..., max_length=255), nome: str = Query("Estudante", max_length=120)):
    """Login de teste. Só existe quando PLN_AMBIENTE=desenvolvimento."""
    cfg = request.app.state.config
    if cfg.em_producao:
        raise ErroNegocio("nao_encontrado", "Página não encontrada.", 404)
    usuario = entrar_ou_criar(db, cfg, None, email, nome)
    request.session["usuario_id"] = usuario.id
    return RedirectResponse("/painel.html", status_code=303)


@router.post("/sair", status_code=204)
def sair(request: Request):
    request.session.clear()
    return None
