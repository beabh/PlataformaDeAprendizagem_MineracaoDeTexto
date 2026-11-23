"""Painel do professor e do administrador. Estudantes não acessam nada daqui."""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from . import painel
from .dependencias import exige_perfil, get_db
from .erros import ErroNegocio
from .modelos import Usuario

router = APIRouter()
PAINEL = exige_perfil("professor", "administrador")


class DadosPerfil(BaseModel):
    perfil: Literal["estudante", "professor", "administrador"]


@router.get("/estudantes")
def estudantes(db=Depends(get_db), _: Usuario = Depends(PAINEL)):
    return painel.estudantes(db)


@router.get("/modulos")
def modulos(db=Depends(get_db), _: Usuario = Depends(PAINEL)):
    return painel.modulos(db)


@router.put("/usuarios/{uid}/perfil")
def alterar_perfil(uid: int, dados: DadosPerfil, db=Depends(get_db),
                   administrador: Usuario = Depends(exige_perfil("administrador"))):
    if uid == administrador.id:
        raise ErroNegocio("nao_permitido", "Peça a outro administrador para alterar o seu perfil.", 403)
    alvo = db.get(Usuario, uid)
    if alvo is None or alvo.anonimizado:
        raise ErroNegocio("nao_encontrado", "Conta não encontrada.", 404)
    alvo.perfil = dados.perfil
    db.commit()
    return {"id": alvo.id, "perfil": alvo.perfil}
