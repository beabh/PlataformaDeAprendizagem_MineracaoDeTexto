"""Cadastro, entrada e saída com e-mail e senha. A entrada de teste existe só em desenvolvimento."""
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from . import cifra
from .dependencias import get_db
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


def _turma_padrao(db, codigo: str) -> Turma:
    turma = db.scalar(select(Turma).where(Turma.codigo == codigo))
    if turma is None:
        turma = Turma(codigo=codigo, nome=codigo.replace("-", " ").title())
        db.add(turma)
        db.flush()
    return turma


def _buscar(db, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(Usuario.email_busca == cifra.codigo_busca(email)))


def _criar(db, cfg, email: str, nome: str, senha_hash: str | None) -> Usuario:
    usuario = Usuario(email=email, email_busca=cifra.codigo_busca(email), nome=nome or email,
                      senha_hash=senha_hash, turma_id=_turma_padrao(db, cfg.turma_padrao).id)
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


@router.post("/cadastro", status_code=201)
def cadastrar(dados: DadosCadastro, request: Request, db=Depends(get_db)):
    nome = dados.nome.strip()
    if len(nome) < 2:
        raise ErroNegocio("dados_invalidos", "Informe seu nome.", 422)
    email = dados.email.strip().lower()
    if _buscar(db, email) is not None:
        raise ErroNegocio("email_ja_cadastrado", "Já existe uma conta com este e-mail. Entre com sua senha.", 409)
    usuario = _criar(db, request.app.state.config, email, nome, cifra.hash_senha(dados.senha))
    return _abrir_sessao(request, usuario)


@router.post("/entrar")
def entrar(dados: DadosEntrada, request: Request, db=Depends(get_db)):
    usuario = _buscar(db, dados.email.strip().lower())
    senha_ok = cifra.verificar_senha(dados.senha, usuario.senha_hash if usuario else None)
    if usuario is None or usuario.anonimizado or not senha_ok:
        raise ErroNegocio("credenciais_invalidas", "E-mail ou senha incorretos.", 401)
    return _abrir_sessao(request, usuario)


@router.get("/desenvolvimento")
def entrar_desenvolvimento(request: Request, db=Depends(get_db),
                           email: str = Query(..., max_length=255), nome: str = Query("Estudante", max_length=120)):
    """Entrada de teste (sem senha), para testes automatizados. Só existe em PLN_AMBIENTE=desenvolvimento."""
    cfg = request.app.state.config
    if cfg.em_producao:
        raise ErroNegocio("nao_encontrado", "Página não encontrada.", 404)
    email = email.strip().lower()
    usuario = _buscar(db, email) or _criar(db, cfg, email, nome, None)
    if usuario.anonimizado:
        raise ErroNegocio("conta_removida", "Esta conta foi removida.", 403)
    request.session.clear()
    request.session["usuario_id"] = usuario.id
    return RedirectResponse("/painel.html", status_code=303)


@router.post("/sair", status_code=204)
def sair(request: Request):
    request.session.clear()
    return None
