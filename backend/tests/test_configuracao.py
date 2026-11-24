import pytest

from app.config import carregar


def _producao(monkeypatch, **extra):
    monkeypatch.setenv("PLN_AMBIENTE", "producao")
    monkeypatch.setenv("PLN_SEGREDO_SESSAO", "segredo-de-teste-longo-o-bastante")
    monkeypatch.setenv("PLN_CHAVE_CRIPTO", "x" * 44)
    monkeypatch.delenv("PLN_DATABASE_URL", raising=False)
    for nome, valor in extra.items():
        monkeypatch.setenv(nome, valor)


def test_producao_exige_banco_externo_explicito(monkeypatch):
    _producao(monkeypatch)
    with pytest.raises(RuntimeError, match="PLN_DATABASE_URL"):
        carregar()


def test_producao_aceita_banco_informado(monkeypatch):
    _producao(monkeypatch, PLN_DATABASE_URL="postgresql+psycopg://u:p@host/db")
    cfg = carregar()
    assert cfg.database_url == "postgresql+psycopg://u:p@host/db"
    assert cfg.em_producao
