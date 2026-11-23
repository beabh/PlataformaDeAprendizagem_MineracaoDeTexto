"""Limite de tentativas por chave (IP, e-mail...). Fica na memória do processo: basta para um servidor só."""
import time
from collections import defaultdict, deque

from .erros import ErroNegocio

_historico: dict[str, deque] = defaultdict(deque)


def verificar(chave: str, limite: int, janela: int) -> None:
    agora = time.monotonic()
    fila = _historico[chave]
    while fila and agora - fila[0] > janela:
        fila.popleft()
    if len(fila) >= limite:
        raise ErroNegocio("muitas_tentativas", "Muitas tentativas. Aguarde alguns minutos e tente de novo.", 429)
    fila.append(agora)


def limpar() -> None:
    _historico.clear()
