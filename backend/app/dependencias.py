"""Sessão do banco e usuário logado."""
from fastapi import Depends, Request
from sqlalchemy import select

from .erros import ErroNegocio
from .modelos import Usuario


def get_db(request: Request):
    db = request.app.state.fabrica()
    try:
        yield db
    finally:
        db.close()


def usuario_atual(request: Request, db=Depends(get_db)) -> Usuario:
    uid = request.session.get("usuario_id")
    if not uid:
        raise ErroNegocio("nao_autenticado", "Entre com sua conta para continuar.", 401)
    usuario = db.scalar(select(Usuario).where(Usuario.id == uid))
    if usuario is None or usuario.anonimizado:
        request.session.clear()
        raise ErroNegocio("nao_autenticado", "Entre com sua conta para continuar.", 401)
    return usuario


def exige_perfil(*perfis: str):
    """Dependência que deixa passar só quem tem um dos perfis indicados."""
    def dependencia(usuario: Usuario = Depends(usuario_atual)) -> Usuario:
        if usuario.perfil not in perfis:
            raise ErroNegocio("acesso_negado", "Você não tem permissão para esta área.", 403)
        return usuario
    return dependencia
