"""Cadastro, entrada, saída, verificação de e-mail e redefinição de senha.
A entrada de teste (sem senha) existe só em desenvolvimento."""
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from . import cifra, correio, limitador, tokens
from .dependencias import get_db, usuario_atual
from .erros import ErroNegocio
from .modelos import Turma, Usuario

router = APIRouter()
PADRAO_EMAIL = r"[^@\s]+@[^@\s]+\.[^@\s]+"


class DadosCadastro(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255, pattern=PADRAO_EMAIL)
    senha: str = Field(min_length=8, max_length=128)


class DadosEntrada(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    senha: str = Field(min_length=1, max_length=128)


class DadosEmail(BaseModel):
    email: str = Field(min_length=1, max_length=255)


class DadosRedefinicao(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    senha: str = Field(min_length=8, max_length=128)


def _ip(request: Request) -> str:
    return request.client.host if request.client else "desconhecido"


def _turma_padrao(db, codigo: str) -> Turma:
    turma = db.scalar(select(Turma).where(Turma.codigo == codigo))
    if turma is None:
        turma = Turma(codigo=codigo, nome=codigo.replace("-", " ").title())
        db.add(turma)
        db.flush()
    return turma


def _buscar(db, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(Usuario.email_busca == cifra.codigo_busca(email)))


def _criar(db, cfg, email: str, nome: str, senha_hash: str | None, verificado: bool = False) -> Usuario:
    usuario = Usuario(email=email, email_busca=cifra.codigo_busca(email), nome=nome or email,
                      senha_hash=senha_hash, email_verificado=verificado,
                      turma_id=_turma_padrao(db, cfg.turma_padrao).id)
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError as exc:
        # Dois cadastros simultâneos com o mesmo e-mail: só um passa.
        db.rollback()
        raise ErroNegocio("email_ja_cadastrado", "Já existe uma conta com este e-mail. Entre com sua senha.", 409) from exc
    return usuario


def _abrir_sessao(request: Request, usuario: Usuario) -> dict:
    request.session.clear()
    request.session["usuario_id"] = usuario.id
    return {"nome": usuario.nome, "email": usuario.email}


def _enviar_verificacao(db, cfg, usuario: Usuario) -> None:
    token = tokens.criar(db, usuario.id, "verificar_email")
    correio.enviar(cfg, usuario.email, "Confirme seu e-mail na plataforma",
                   f"Olá, {usuario.nome}.\n\nPara confirmar seu e-mail, abra este link (válido por 3 dias):\n"
                   f"{cfg.url_publica}/auth/verificar?token={token}\n\n"
                   "Se você não criou esta conta, ignore esta mensagem.\n")


def _enviar_redefinicao(db, cfg, usuario: Usuario) -> None:
    token = tokens.criar(db, usuario.id, "redefinir_senha")
    correio.enviar(cfg, usuario.email, "Redefinir sua senha",
                   f"Olá, {usuario.nome}.\n\nPara criar uma nova senha, abra este link (válido por 1 hora):\n"
                   f"{cfg.url_publica}/redefinir-senha.html?token={token}\n\n"
                   "Se você não pediu isso, ignore esta mensagem. Sua senha continua a mesma.\n")


@router.post("/cadastro", status_code=201)
def cadastrar(dados: DadosCadastro, request: Request, db=Depends(get_db)):
    cfg = request.app.state.config
    nome = dados.nome.strip()
    if len(nome) < 2:
        raise ErroNegocio("dados_invalidos", "Informe seu nome.", 422)
    email = dados.email.strip().lower()
    if _buscar(db, email) is not None:
        raise ErroNegocio("email_ja_cadastrado", "Já existe uma conta com este e-mail. Entre com sua senha.", 409)
    usuario = _criar(db, cfg, email, nome, cifra.hash_senha(dados.senha))
    try:
        _enviar_verificacao(db, cfg, usuario)
        enviado = True
    except ErroNegocio:
        enviado = False  # a conta existe; a pessoa pode pedir o e-mail de novo depois
    resposta = _abrir_sessao(request, usuario)
    resposta["verificacao_enviada"] = enviado
    return resposta


@router.post("/entrar")
def entrar(dados: DadosEntrada, request: Request, db=Depends(get_db)):
    cfg = request.app.state.config
    email = dados.email.strip().lower()
    limitador.verificar(f"entrar:{_ip(request)}:{email}", limite=10, janela=900)
    usuario = _buscar(db, email)
    senha_ok = cifra.verificar_senha(dados.senha, usuario.senha_hash if usuario else None)
    if usuario is None or usuario.anonimizado or not senha_ok:
        raise ErroNegocio("credenciais_invalidas", "E-mail ou senha incorretos.", 401)
    if cfg.exigir_verificacao and not usuario.email_verificado:
        raise ErroNegocio("conta_nao_verificada",
                          "Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.", 403)
    return _abrir_sessao(request, usuario)


@router.post("/reenviar-verificacao", status_code=204)
def reenviar_verificacao(request: Request, db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    if not usuario.email_verificado:
        limitador.verificar(f"reenvio:{usuario.id}", limite=3, janela=3600)
        _enviar_verificacao(db, request.app.state.config, usuario)
    return None


@router.get("/verificar")
def verificar_email(db=Depends(get_db), token: str = Query(..., max_length=200)):
    registro = tokens.consumir(db, token, "verificar_email")
    if registro is None:
        return RedirectResponse("/login.html?verificacao=invalida", status_code=303)
    usuario = db.get(Usuario, registro.usuario_id)
    usuario.email_verificado = True
    db.commit()
    return RedirectResponse("/login.html?verificado=1", status_code=303)


@router.post("/esqueci-senha")
def esqueci_senha(dados: DadosEmail, request: Request, db=Depends(get_db)):
    limitador.verificar(f"esqueci:{_ip(request)}", limite=5, janela=3600)
    usuario = _buscar(db, dados.email.strip().lower())
    if usuario is not None and not usuario.anonimizado:
        try:
            _enviar_redefinicao(db, request.app.state.config, usuario)
        except ErroNegocio:
            pass  # a resposta é a mesma para não revelar quais e-mails existem
    return {"mensagem": "Se este e-mail estiver cadastrado, enviamos as instruções para criar uma nova senha."}


@router.post("/redefinir-senha")
def redefinir_senha(dados: DadosRedefinicao, db=Depends(get_db)):
    registro = tokens.consumir(db, dados.token, "redefinir_senha")
    if registro is None:
        raise ErroNegocio("token_invalido", "Este link é inválido ou expirou. Peça um novo.", 400)
    usuario = db.get(Usuario, registro.usuario_id)
    usuario.senha_hash = cifra.hash_senha(dados.senha)
    db.commit()
    return {"mensagem": "Senha alterada. Entre com a nova senha."}


@router.get("/desenvolvimento")
def entrar_desenvolvimento(request: Request, db=Depends(get_db),
                           email: str = Query(..., max_length=255), nome: str = Query("Estudante", max_length=120)):
    """Entrada de teste (sem senha), para testes automatizados. Só existe em PLN_AMBIENTE=desenvolvimento."""
    cfg = request.app.state.config
    if cfg.em_producao:
        raise ErroNegocio("nao_encontrado", "Página não encontrada.", 404)
    email = email.strip().lower()
    usuario = _buscar(db, email) or _criar(db, cfg, email, nome, None, verificado=True)
    if usuario.anonimizado:
        raise ErroNegocio("conta_removida", "Esta conta foi removida.", 403)
    request.session.clear()
    request.session["usuario_id"] = usuario.id
    return RedirectResponse("/painel.html", status_code=303)


@router.post("/sair", status_code=204)
def sair(request: Request):
    request.session.clear()
    return None
