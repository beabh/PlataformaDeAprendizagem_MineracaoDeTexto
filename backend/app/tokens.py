"""Links de uso único para verificar o e-mail e redefinir a senha. Só o hash do token fica no banco."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from .modelos import TokenAcao

VALIDADE = {"verificar_email": timedelta(days=3), "redefinir_senha": timedelta(hours=1)}


def _agora() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def criar(db, usuario_id: int, tipo: str) -> str:
    token = secrets.token_urlsafe(32)
    db.add(TokenAcao(usuario_id=usuario_id, tipo=tipo, hash_token=_hash(token),
                     expira_em=_agora() + VALIDADE[tipo]))
    db.commit()
    return token


def consumir(db, token: str, tipo: str) -> TokenAcao | None:
    """Marca o token como usado. Quem chama deve fazer commit. Retorna None se for inválido, usado ou vencido."""
    registro = db.scalar(select(TokenAcao).where(TokenAcao.hash_token == _hash(token), TokenAcao.tipo == tipo))
    if registro is None or registro.usado_em is not None or registro.expira_em < _agora():
        return None
    registro.usado_em = _agora()
    return registro
