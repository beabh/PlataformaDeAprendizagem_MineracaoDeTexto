"""Login de teste (simulação) e saída. O login com Google não está implementado nesta versão."""
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from .dependencias import get_db
from .erros import ErroNegocio
from .modelos import Turma, Usuario

router = APIRouter()


def _turma_padrao(db, codigo: str) -> Turma:
    turma = db.scalar(select(Turma).where(Turma.codigo == codigo))
    if turma is None:
        turma = Turma(codigo=codigo, nome=codigo.replace("-", " ").title())
        db.add(turma)
        db.flush()
    return turma


def entrar_ou_criar(db, cfg, email: str, nome: str) -> Usuario:
    usuario = db.scalar(select(Usuario).where(Usuario.email == email))
    if usuario is None:
        usuario = Usuario(email=email, nome_google=nome or email,
                          turma_id=_turma_padrao(db, cfg.turma_padrao).id)
        db.add(usuario)
    elif usuario.anonimizado:
        raise ErroNegocio("conta_removida", "Esta conta foi removida.", 403)
    db.commit()
    return usuario


@router.get("/desenvolvimento")
def entrar_desenvolvimento(request: Request, db=Depends(get_db),
                           email: str = Query(..., max_length=255), nome: str = Query("Estudante", max_length=120)):
    """Login de teste (simulação). Só existe quando PLN_AMBIENTE=desenvolvimento."""
    cfg = request.app.state.config
    if cfg.em_producao:
        raise ErroNegocio("nao_encontrado", "Página não encontrada.", 404)
    usuario = entrar_ou_criar(db, cfg, email, nome)
    request.session["usuario_id"] = usuario.id
    return RedirectResponse("/painel.html", status_code=303)


@router.post("/sair", status_code=204)
def sair(request: Request):
    request.session.clear()
    return None
