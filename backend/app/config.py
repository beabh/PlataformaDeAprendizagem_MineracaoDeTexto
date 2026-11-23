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
    url_publica: str = "http://localhost:8000"
    smtp_host: str | None = None
    smtp_porta: int = 587
    smtp_usuario: str | None = None
    smtp_senha: str | None = None
    smtp_remetente: str = "plataforma@localhost"
    pasta_correio: str | None = None  # None: mensagens só na memória (testes)
    exigir_verificacao: bool = False  # se True, só entra quem confirmou o e-mail
    instituicao: str = "Instituição (nome a definir)"  # nome aparece no certificado

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
        url_publica=os.environ.get("PLN_URL_PUBLICA", "http://localhost:8000").rstrip("/"),
        smtp_host=os.environ.get("PLN_SMTP_HOST") or None,
        smtp_porta=int(os.environ.get("PLN_SMTP_PORTA", "587")),
        smtp_usuario=os.environ.get("PLN_SMTP_USUARIO") or None,
        smtp_senha=os.environ.get("PLN_SMTP_SENHA") or None,
        smtp_remetente=os.environ.get("PLN_SMTP_REMETENTE", "plataforma@localhost"),
        pasta_correio=os.environ.get("PLN_PASTA_CORREIO", str(Path(__file__).resolve().parents[1] / "caixa_de_saida")),
        exigir_verificacao=os.environ.get("PLN_EXIGIR_VERIFICACAO", "false").lower() == "true",
        instituicao=os.environ.get("PLN_INSTITUICAO", "Instituição (nome a definir)"),
    )
