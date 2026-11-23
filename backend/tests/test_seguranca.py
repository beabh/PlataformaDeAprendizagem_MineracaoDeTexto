import dataclasses
import re
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from app import correio, painel
from app.cifra import codigo_busca
from app.modelos import TokenAcao, Usuario


def post(c, url, json=None):
    return c.post(url, json=json, headers={"X-Requested-With": "fetch"})


def cadastrar(app, email, senha="senha-forte-1", nome="Pessoa Teste"):
    c = TestClient(app)
    r = post(c, "/auth/cadastro", {"nome": nome, "email": email, "senha": senha})
    assert r.status_code == 201, r.text
    return c


def ultimo_token(assunto_parte):
    mensagem = [m for m in correio.ENVIADOS if assunto_parte in m["assunto"]][-1]
    return re.search(r"token=([A-Za-z0-9_\-]+)", mensagem["corpo"]).group(1)


def test_cadastro_envia_confirmacao_e_verificar_marca_o_e_mail(app):
    cadastrar(app, "verifica@teste.dev")
    assert len(correio.ENVIADOS) == 1 and correio.ENVIADOS[0]["para"] == "verifica@teste.dev"
    token = ultimo_token("Confirme")
    c = TestClient(app, follow_redirects=False)
    r = c.get(f"/auth/verificar?token={token}")
    assert r.status_code == 303 and "verificado=1" in r.headers["location"]
    # Link usado não vale de novo.
    assert "verificacao=invalida" in c.get(f"/auth/verificar?token={token}").headers["location"]


def test_exigir_verificacao_bloqueia_entrada_ate_confirmar(app):
    app.state.config = dataclasses.replace(app.state.config, exigir_verificacao=True)
    cadastrar(app, "bloqueado@teste.dev")
    c = TestClient(app)
    r = post(c, "/auth/entrar", {"email": "bloqueado@teste.dev", "senha": "senha-forte-1"})
    assert r.status_code == 403 and r.json()["codigo"] == "conta_nao_verificada"
    c.get(f"/auth/verificar?token={ultimo_token('Confirme')}")
    assert post(c, "/auth/entrar", {"email": "bloqueado@teste.dev", "senha": "senha-forte-1"}).status_code == 200


def test_redefinicao_de_senha_por_link_de_uso_unico(app):
    cadastrar(app, "esqueci@teste.dev")
    c = TestClient(app)
    assert post(c, "/auth/esqueci-senha", {"email": "esqueci@teste.dev"}).status_code == 200
    token = ultimo_token("Redefinir")
    r = post(c, "/auth/redefinir-senha", {"token": token, "senha": "nova-senha-123"})
    assert r.status_code == 200
    assert post(c, "/auth/entrar", {"email": "esqueci@teste.dev", "senha": "senha-forte-1"}).status_code == 401
    assert post(c, "/auth/entrar", {"email": "esqueci@teste.dev", "senha": "nova-senha-123"}).status_code == 200
    # O mesmo link não pode ser usado de novo.
    r = post(c, "/auth/redefinir-senha", {"token": token, "senha": "outra-senha-456"})
    assert r.status_code == 400 and r.json()["codigo"] == "token_invalido"


def test_link_de_redefinicao_expira(app_db):
    app, fabrica = app_db
    cadastrar(app, "vencido@teste.dev")
    c = TestClient(app)
    post(c, "/auth/esqueci-senha", {"email": "vencido@teste.dev"})
    token = ultimo_token("Redefinir")
    with fabrica() as db:
        registro = db.scalar(select(TokenAcao).where(TokenAcao.tipo == "redefinir_senha"))
        registro.expira_em = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1)
        db.commit()
    assert post(c, "/auth/redefinir-senha", {"token": token, "senha": "nova-senha-123"}).status_code == 400


def test_esqueci_senha_nao_revela_quais_e_mails_existem(app):
    cadastrar(app, "existe@teste.dev")
    c = TestClient(app)
    a = post(c, "/auth/esqueci-senha", {"email": "existe@teste.dev"})
    b = post(c, "/auth/esqueci-senha", {"email": "nao-existe@teste.dev"})
    assert a.status_code == b.status_code == 200 and a.json() == b.json()
    assert len(correio.ENVIADOS) == 2  # só a conta existente recebeu mensagem (a de cadastro e a de redefinição)


def test_entrada_tem_limite_de_tentativas(app):
    cadastrar(app, "forca@teste.dev")
    c = TestClient(app)
    for _ in range(10):
        assert post(c, "/auth/entrar", {"email": "forca@teste.dev", "senha": "errada-123"}).status_code == 401
    r = post(c, "/auth/entrar", {"email": "forca@teste.dev", "senha": "senha-forte-1"})
    assert r.status_code == 429 and r.json()["codigo"] == "muitas_tentativas"


def test_cadastro_nao_concede_perfil_administrativo(app_db):
    app, fabrica = app_db
    c = TestClient(app)
    post(c, "/auth/cadastro", {"nome": "Esperto Teste", "email": "esperto@teste.dev", "senha": "senha-forte-1",
                               "perfil": "administrador"})
    with fabrica() as db:
        assert db.scalar(select(Usuario).where(Usuario.email_busca == codigo_busca("esperto@teste.dev"))).perfil == "estudante"


def test_painel_so_para_professor_e_administrador(app_db):
    app, fabrica = app_db
    aluno = cadastrar(app, "aluno.painel@teste.dev")
    professor = cadastrar(app, "prof.painel@teste.dev")
    admin = cadastrar(app, "admin.painel@teste.dev")
    with fabrica() as db:
        painel.promover(db, codigo_busca("prof.painel@teste.dev"), "professor")
        painel.promover(db, codigo_busca("admin.painel@teste.dev"), "administrador")
        uid_aluno = db.scalar(select(Usuario.id).where(Usuario.email_busca == codigo_busca("aluno.painel@teste.dev")))

    assert aluno.get("/api/admin/estudantes").status_code == 403
    assert aluno.get("/api/admin/modulos").status_code == 403

    r = professor.get("/api/admin/estudantes")
    assert r.status_code == 200
    emails = {e["email"] for e in r.json()}
    assert "aluno.painel@teste.dev" in emails
    assert professor.get("/api/admin/modulos").status_code == 200

    # Professor não altera perfis; administrador altera, mas não o próprio.
    H = {"X-Requested-With": "fetch"}
    with fabrica() as db:
        uid_admin = db.scalar(select(Usuario.id).where(Usuario.email_busca == codigo_busca("admin.painel@teste.dev")))
    assert professor.put(f"/api/admin/usuarios/{uid_aluno}/perfil", json={"perfil": "professor"}, headers=H).status_code == 403
    assert admin.put(f"/api/admin/usuarios/{uid_aluno}/perfil", json={"perfil": "professor"}, headers=H).status_code == 200
    assert admin.put(f"/api/admin/usuarios/{uid_admin}/perfil", json={"perfil": "estudante"}, headers=H).status_code == 403


def test_promover_por_linha_de_comando_so_com_email_existente(app_db):
    app, fabrica = app_db
    cadastrar(app, "cli@teste.dev")
    with fabrica() as db:
        assert painel.promover(db, codigo_busca("cli@teste.dev"), "professor").perfil == "professor"
        assert painel.promover(db, codigo_busca("ninguem@teste.dev"), "professor") is None
