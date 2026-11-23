"""Configuração lida de variáveis de ambiente (ver .env.example)."""
import base64
import hashlib
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Configuracao:
    database_url: str
    segredo_sessao: str
    ambiente: str                 # "desenvolvimento" libera o login de teste; "producao" não
    google_client_id: str | None
    google_client_secret: str | None
    url_publica: str              # endereço onde o site é servido (usado no retorno do Google)
    chave_cpf: str                # chave Fernet (base64) para cifrar o CPF
    turma_padrao: str             # turma onde entram os novos estudantes

    @property
    def em_producao(self) -> bool:
        return self.ambiente == "producao"


def carregar() -> Configuracao:
    ambiente = os.environ.get("PLN_AMBIENTE", "desenvolvimento")
    segredo = os.environ.get("PLN_SEGREDO_SESSAO", "troque-este-segredo-em-producao")
    chave_cpf = os.environ.get("PLN_CHAVE_CPF")
    if not chave_cpf:
        if ambiente == "producao":
            raise RuntimeError("Defina PLN_CHAVE_CPF em produção.")
        # Em desenvolvimento, derivada do segredo. Não use em produção.
        chave_cpf = base64.urlsafe_b64encode(hashlib.sha256(segredo.encode()).digest()).decode()
    if ambiente == "producao" and segredo.startswith("troque-"):
        raise RuntimeError("Defina PLN_SEGREDO_SESSAO em produção.")
    return Configuracao(
        database_url=os.environ.get(
            "PLN_DATABASE_URL", "postgresql+psycopg://pln:pln@localhost:5432/plataforma_pln"
        ),
        segredo_sessao=segredo,
        ambiente=ambiente,
        google_client_id=os.environ.get("GOOGLE_CLIENT_ID") or None,
        google_client_secret=os.environ.get("GOOGLE_CLIENT_SECRET") or None,
        url_publica=os.environ.get("PLN_URL_PUBLICA", "http://localhost:8000"),
        chave_cpf=chave_cpf,
        turma_padrao=os.environ.get("PLN_TURMA_PADRAO", "TURMA-PADRAO"),
    )
