import os

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app import catalogo
from app.banco import Base, criar_fabrica
from app.config import Configuracao
from app.main import criar_app

URL_TESTE = os.environ.get("PLN_DATABASE_URL_TESTE", "postgresql+psycopg://pln:pln@localhost:5432/plataforma_pln_teste")
CHAVE = Fernet.generate_key().decode()


def configuracao() -> Configuracao:
    return Configuracao(database_url=URL_TESTE, segredo_sessao="teste-segredo", ambiente="desenvolvimento",
                        chave_cripto=CHAVE, turma_padrao="TURMA-TESTE")


@pytest.fixture
def app_db():
    engine, fabrica = criar_fabrica(URL_TESTE)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    app = criar_app(cfg=configuracao(), fabrica=fabrica, criar_tabelas=False)
    with fabrica() as db:
        catalogo.carregar(db)
    yield app, fabrica
    engine.dispose()


def novo_cliente(app, email: str, nome: str = "Aluno Teste") -> TestClient:
    cliente = TestClient(app, follow_redirects=False)
    r = cliente.get("/auth/desenvolvimento", params={"email": email, "nome": nome})
    assert r.status_code == 303, r.text
    return cliente


def post(cliente, url, json=None):
    return cliente.post(url, json=json, headers={"X-Requested-With": "fetch"})


def put(cliente, url, json=None):
    return cliente.put(url, json=json, headers={"X-Requested-With": "fetch"})


def delete(cliente, url):
    return cliente.delete(url, headers={"X-Requested-With": "fetch"})


@pytest.fixture
def app(app_db):
    return app_db[0]
