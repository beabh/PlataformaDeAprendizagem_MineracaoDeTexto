"""Erro de negócio com formato único: { "codigo": "...", "mensagem": "..." }."""


class ErroNegocio(Exception):
    def __init__(self, codigo: str, mensagem: str, status: int = 400, **extra):
        super().__init__(mensagem)
        self.codigo = codigo
        self.mensagem = mensagem
        self.status = status
        self.extra = extra
