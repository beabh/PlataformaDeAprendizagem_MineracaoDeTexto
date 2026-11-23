from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app import cifra
from app.modelos import Usuario


def post(c, url, json=None):
    return c.post(url, json=json, headers={"X-Requested-With": "fetch"})


def test_cadastro_entrada_e_saida(app):
    c = TestClient(app)
    r = post(c, "/auth/cadastro", {"nome": "Ana Paula", "email": "Ana.Auth@Teste.dev", "senha": "senha-forte-1"})
    assert r.status_code == 201 and r.json()["email"] == "ana.auth@teste.dev"
    assert c.get("/api/me").status_code == 200
    assert post(c, "/auth/sair").status_code == 204
    assert c.get("/api/me").status_code == 401
    assert post(c, "/auth/entrar", {"email": "ana.auth@teste.dev", "senha": "senha-forte-1"}).status_code == 200
    assert c.get("/api/me").status_code == 200


def test_senha_errada_e_conta_inexistente_dao_a_mesma_resposta(app):
    c = TestClient(app)
    post(c, "/auth/cadastro", {"nome": "Ana Paula", "email": "ana.erro@teste.dev", "senha": "senha-forte-1"})
    post(c, "/auth/sair")
    errada = post(c, "/auth/entrar", {"email": "ana.erro@teste.dev", "senha": "senha-errada"})
    inexistente = post(c, "/auth/entrar", {"email": "ninguem@teste.dev", "senha": "senha-forte-1"})
    assert errada.status_code == inexistente.status_code == 401
    assert errada.json()["codigo"] == inexistente.json()["codigo"] == "credenciais_invalidas"


def test_cadastro_repetido_e_validacoes(app):
    c = TestClient(app)
    dados = {"nome": "Bia Lima", "email": "bia.lima@teste.dev", "senha": "senha-forte-1"}
    assert post(c, "/auth/cadastro", dados).status_code == 201
    r = post(c, "/auth/cadastro", {**dados, "email": "BIA.LIMA@teste.dev"})
    assert r.status_code == 409 and r.json()["codigo"] == "email_ja_cadastrado"
    assert post(c, "/auth/cadastro", {**dados, "email": "outra@teste.dev", "senha": "curta"}).status_code == 422
    assert post(c, "/auth/cadastro", {**dados, "email": "sem-arroba", "senha": "senha-forte-1"}).status_code == 422


def test_dados_pessoais_e_senha_ficam_cifrados_no_banco(app_db):
    app, fabrica = app_db
    c = TestClient(app)
    post(c, "/auth/cadastro", {"nome": "Carlos Souza", "email": "carlos.cifra@teste.dev", "senha": "senha-forte-1"})
    with fabrica() as db:
        bruto = db.execute(text("select email, email_busca, nome, senha_hash from usuario")).one()
    texto = " ".join(str(v) for v in bruto)
    assert "carlos" not in texto.lower() and "Carlos Souza" not in texto
    assert bruto.senha_hash.startswith("scrypt$") and "senha-forte-1" not in bruto.senha_hash
    with fabrica() as db:
        u = db.scalar(select(Usuario))
        assert u.email == "carlos.cifra@teste.dev" and u.nome == "Carlos Souza"
        assert cifra.verificar_senha("senha-forte-1", u.senha_hash)
        assert not cifra.verificar_senha("outra-senha", u.senha_hash)
