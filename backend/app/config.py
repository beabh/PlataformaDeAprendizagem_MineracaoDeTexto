"""Configuração lida de variáveis de ambiente (ver .env.example)."""
import base64
import hashlib
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Configuracao:
    database_url: str
    segredo_sessao: str
    ambiente: str                 # "desenvolvimento" libera o login de teste; "producao" não
    chave_cripto: str             # chave Fernet (base64) para cifrar dados pessoais e o CPF
    turma_padrao: str             # turma onde entram os novos estudantes

    @property
    def em_producao(self) -> bool:
        return self.ambiente == "producao"


def carregar() -> Configuracao:
    # Lê backend/.env se existir. Variáveis já definidas no sistema têm prioridade.
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
    ambiente = os.environ.get("PLN_AMBIENTE", "desenvolvimento")
    segredo = os.environ.get("PLN_SEGREDO_SESSAO", "troque-este-segredo-em-producao")
    chave_cripto = os.environ.get("PLN_CHAVE_CRIPTO")
    if not chave_cripto:
        if ambiente == "producao":
            raise RuntimeError("Defina PLN_CHAVE_CRIPTO em produção.")
        # Em desenvolvimento, derivada do segredo. Não use em produção.
        chave_cripto = base64.urlsafe_b64encode(hashlib.sha256(segredo.encode()).digest()).decode()
    if ambiente == "producao" and segredo.startswith("troque-"):
        raise RuntimeError("Defina PLN_SEGREDO_SESSAO em produção.")
    url = os.environ.get("PLN_DATABASE_URL", "postgresql+psycopg://pln:pln@localhost:5432/plataforma_pln")
    if url.startswith("sqlite:///./"):
        # Caminho relativo ao backend, não à pasta de onde o servidor foi iniciado.
        url = "sqlite:///" + str(Path(__file__).resolve().parents[1] / url[len("sqlite:///./"):])
    return Configuracao(
        database_url=url,
        segredo_sessao=segredo,
        ambiente=ambiente,
        chave_cripto=chave_cripto,
        turma_padrao=os.environ.get("PLN_TURMA_PADRAO", "TURMA-PADRAO"),
    )
