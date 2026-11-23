"""Formatos de entrada da API."""
from pydantic import BaseModel, Field


class RespostaExercicio(BaseModel):
    resposta: str = Field(..., max_length=500)


class RespostaProva(BaseModel):
    respostas: list[int] = Field(..., max_length=50)


class Perfil(BaseModel):
    nome_exibicao: str = Field("", max_length=120)
    meta_minutos: int = 15
    curso: str = Field("", max_length=160)


class DadosCertificado(BaseModel):
    nome: str = Field(..., max_length=160)
    email: str = Field(..., max_length=255)
    cpf: str = Field(..., max_length=20)
