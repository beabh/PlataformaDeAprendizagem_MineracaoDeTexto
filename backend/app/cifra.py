"""Proteção dos dados pessoais e das senhas.

- Dados pessoais (nome, e-mail, nome e e-mail do certificado, CPF): cifrados com Fernet. A cifra é
  reversível, porque o sistema precisa mostrar esses dados de volta ao próprio estudante. No banco,
  ficam ilegíveis sem a chave PLN_CHAVE_CRIPTO.
- Código de busca do e-mail: HMAC-SHA256 com chave derivada. Serve para achar a conta no login e
  impedir e-mails repetidos, sem guardar o e-mail em texto.
- Senhas: hash scrypt com sal. Não tem volta: nem quem administra o banco consegue ler a senha.
"""
import base64
import hashlib
import hmac
import secrets

from cryptography.fernet import Fernet
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

_fernet: Fernet | None = None
_chave_busca: bytes | None = None
_SCRYPT = {"n": 2**14, "r": 8, "p": 1}


def configurar(chave: str) -> None:
    global _fernet, _chave_busca
    _fernet = Fernet(chave.encode())
    _chave_busca = hashlib.sha256(b"busca|" + chave.encode()).digest()


def cifrar(texto: str) -> str:
    return _fernet.encrypt(texto.encode()).decode()


def decifrar(cifrado: str) -> str:
    return _fernet.decrypt(cifrado.encode()).decode()


def codigo_busca(valor: str) -> str:
    normalizado = valor.strip().lower()
    return hmac.new(_chave_busca, normalizado.encode(), hashlib.sha256).hexdigest()


class CifradoTexto(TypeDecorator):
    """Coluna de texto cifrada: grava cifrado e devolve texto normal ao código da aplicação."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else cifrar(value)

    def process_result_value(self, value, dialect):
        return None if value is None else decifrar(value)


def hash_senha(senha: str) -> str:
    sal = secrets.token_bytes(16)
    chave = hashlib.scrypt(senha.encode(), salt=sal, dklen=32, **_SCRYPT)
    return "scrypt${n}${r}${p}${sal}${chave}".format(
        n=_SCRYPT["n"], r=_SCRYPT["r"], p=_SCRYPT["p"],
        sal=base64.b64encode(sal).decode(), chave=base64.b64encode(chave).decode())


def verificar_senha(senha: str, armazenado: str | None) -> bool:
    if not armazenado:
        # Gasta o mesmo tempo de uma verificação real, para não revelar que a conta não existe.
        hashlib.scrypt(b"x", salt=b"0" * 16, dklen=32, **_SCRYPT)
        return False
    try:
        _, n, r, p, sal, esperado = armazenado.split("$")
        calculada = hashlib.scrypt(senha.encode(), salt=base64.b64decode(sal), dklen=32,
                                   n=int(n), r=int(r), p=int(p))
    except ValueError:
        return False
    return hmac.compare_digest(calculada, base64.b64decode(esperado))
