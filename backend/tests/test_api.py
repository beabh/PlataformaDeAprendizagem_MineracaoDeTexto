import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app import cifra
from app.modelos import Aula, ConclusaoAula, Modulo, MovimentoPontos, ProvaTentativa, Usuario
from tests.conftest import delete, novo_cliente, post, put

DADOS = Path(__file__).resolve().parents[1] / "dados"
GABARITO_PROVA_1 = [q["correta"] for q in json.loads((DADOS / "provas.json").read_text())["1"]["questoes"]]


def _ids(cliente, aula):
    return {e["ordem"]: e["id"] for e in cliente.get(f"/api/aulas/{aula}").json()["exercicios"]}


def _pontos(cliente):
    return cliente.get("/api/me/pontos").json()


def test_sem_login_nao_acessa_a_api(app):
    from fastapi.testclient import TestClient
    r = TestClient(app).get("/api/trilha")
    assert r.status_code == 401
    assert r.json()["codigo"] == "nao_autenticado"


def test_trilha_inicial_libera_so_o_primeiro_passo(app):
    c = novo_cliente(app, "ana@teste.dev", "Ana Paula Souza")
    trilha = c.get("/api/trilha").json()
    estados = {m["codigo"]: m["estado"] for m in trilha["modulos"]}
    assert estados["P"] == "disponivel" and estados["1"] == "disponivel" and estados["2"] == "bloqueado"
    aulas = {a["codigo"]: a["estado"] for m in trilha["modulos"] for a in m["aulas"]}
    assert aulas["P.1"] == "atual" and aulas["P.2"] == "bloqueada"
    assert trilha["pontos"] == {"ganhos": 0, "perdas": 0, "total": 0}
    assert trilha["proxima_aula"]["codigo"] == "P.1"
    assert [m["liberado"] for m in trilha["modulos"]][:3] == [True, True, False]


def test_gabarito_nunca_vai_para_o_navegador(app):
    c = novo_cliente(app, "gabarito@teste.dev")
    texto = c.get("/api/aulas/1.1").text
    assert '"correta"' not in texto and '"respostas"' not in texto
    assert '"explicacao"' not in texto  # só aparece depois de resolvido
    assert c.get("/api/aulas/2.1").status_code == 403


def test_fluxo_de_exercicios_pontos_e_conclusao(app):
    c = novo_cliente(app, "fluxo@teste.dev")
    ex = _ids(c, "1.1")

    # Escolha: acerto na 1ª tentativa vale 10
    r = post(c, f"/api/exercicios/{ex[1]}/tentativas", {"resposta": "1"}).json()
    assert r["correta"] and r["finalizado"] and r["ganho"] == 10 and r["saldo"] == 10
    assert r["resposta_certa"] == "Documento"
    assert post(c, f"/api/exercicios/{ex[1]}/tentativas", {"resposta": "1"}).status_code == 409

    # Digitar: erro na 1ª tentativa não tira ponto; acerto na 2ª vale 5
    r = post(c, f"/api/exercicios/{ex[2]}/tentativas", {"resposta": "Tokenz"}).json()
    assert not r["correta"] and not r["finalizado"] and r["tentativas_restantes"] == 1 and r["saldo"] == 10
    r = post(c, f"/api/exercicios/{ex[2]}/tentativas", {"resposta": "  TOKEN "}).json()
    assert r["correta"] and r["ganho"] == 5 and r["saldo"] == 15

    # Escolha: dois erros encerram sem pontos e revelam a resposta certa
    post(c, f"/api/exercicios/{ex[3]}/tentativas", {"resposta": "0"})
    r = post(c, f"/api/exercicios/{ex[3]}/tentativas", {"resposta": "2"}).json()
    assert r["finalizado"] and r["situacao"] == "erro" and r["ganho"] == 0
    assert r["resposta_certa"] == "Comunicado oficial em texto corrido"
    assert "campos fixos" in r["explicacao"]

    # Digitar com acento e maiúscula diferentes conta como acerto
    r = post(c, f"/api/exercicios/{ex[4]}/tentativas", {"resposta": "NÃO"}).json()
    assert r["correta"] and r["saldo"] == 25

    # Concluir a aula: +10, uma única vez
    r = post(c, "/api/aulas/1.1/concluir").json()
    assert r["concluida"] and r["ganho"] == 10 and r["saldo"] == 35
    r = post(c, "/api/aulas/1.1/concluir").json()
    assert r["ja_concluida"] and r["ganho"] == 0 and r["saldo"] == 35

    placar = c.get("/api/aulas/1.1/placar").json()
    assert placar["ganhos"] == 10 + 5 + 10 and placar["perdas"] == 0 and placar["resolvidos"] == 4

    # Ao reabrir a aula, cada exercício mostra o que valeu
    aula = c.get("/api/aulas/1.1").json()
    assert [e["ganho"] for e in aula["exercicios"]] == [10, 5, 0, 10]
    assert aula["anterior"] == "P.4" and aula["proxima"] == "2.1" and aula["prova_liberada"] is True
    assert aula["valores"] == {"acerto_primeira": 10, "acerto_segunda": 5, "pular": 2, "concluir": 10}


def test_pulo_custa_dois_pontos_e_respeita_o_saldo(app):
    c = novo_cliente(app, "pular@teste.dev")
    ex = _ids(c, "P.1")
    # Sem saldo, pular não tira pontos
    r = post(c, f"/api/exercicios/{ex[1]}/pulo").json()
    assert r["situacao"] == "pulo" and r["perda"] == 0 and r["saldo"] == 0
    assert r["resposta_certa"] == "8"  # len('Covid-19')
    # Acerta uma questão e pula outra: 10 - 2 = 8
    assert post(c, f"/api/exercicios/{ex[2]}/tentativas", {"resposta": "VACINA"}).json()["saldo"] == 10
    r = post(c, f"/api/exercicios/{ex[3]}/pulo").json()
    assert r["perda"] == 2 and r["saldo"] == 8
    aula = c.get("/api/aulas/P.1").json()
    assert [(e["ganho"], e["perda"]) for e in aula["exercicios"]] == [(0, 0), (10, 0), (0, 2)]


def test_concluir_exige_todos_os_exercicios(app):
    c = novo_cliente(app, "incompleta@teste.dev")
    r = post(c, "/api/aulas/1.1/concluir")
    assert r.status_code == 409 and r.json()["codigo"] == "aula_incompleta"
    assert r.json()["faltam"] == [1, 2, 3, 4]


def test_aula_sem_exercicios_fica_em_elaboracao(app):
    c = novo_cliente(app, "elaboracao@teste.dev")
    ex = _ids(c, "P.1")
    post(c, f"/api/exercicios/{ex[1]}/tentativas", {"resposta": "8"})
    post(c, f"/api/exercicios/{ex[2]}/tentativas", {"resposta": "VACINA"})
    post(c, f"/api/exercicios/{ex[3]}/tentativas", {"resposta": "0"})
    assert post(c, "/api/aulas/P.1/concluir").json()["concluida"]
    r = post(c, "/api/aulas/P.2/concluir")
    assert r.status_code == 409 and r.json()["codigo"] == "aula_em_elaboracao"


def test_prova_so_libera_com_aulas_concluidas_e_aprova_uma_vez(app):
    c = novo_cliente(app, "prova@teste.dev")
    assert c.get("/api/provas/1").status_code == 403
    ex = _ids(c, "1.1")
    post(c, f"/api/exercicios/{ex[1]}/tentativas", {"resposta": "1"})
    post(c, f"/api/exercicios/{ex[2]}/tentativas", {"resposta": "token"})
    post(c, f"/api/exercicios/{ex[3]}/pulo")
    post(c, f"/api/exercicios/{ex[4]}/tentativas", {"resposta": "nao"})
    post(c, "/api/aulas/1.1/concluir")

    prova = c.get("/api/provas/1").json()
    assert prova["total"] == 10 and prova["minimo"] == 7 and not prova["aprovada"]
    assert all("correta" not in q for q in prova["questoes"])  # a palavra aparece em enunciados; checa as chaves
    assert post(c, "/api/provas/1/tentativas", {"respostas": [0, 0]}).status_code == 422

    # 6 acertos de 10: reprova e não pontua
    erradas = [(g + 1) % 3 if i < 4 else g for i, g in enumerate(GABARITO_PROVA_1)]
    r = post(c, "/api/provas/1/tentativas", {"respostas": erradas}).json()
    assert r["acertos"] == 6 and not r["aprovada"] and r["ganho"] == 0
    saldo_antes = _pontos(c)["total"]

    # Acerta tudo: aprovada, +50 uma única vez
    r = post(c, "/api/provas/1/tentativas", {"respostas": GABARITO_PROVA_1}).json()
    assert r["aprovada"] and r["ganho"] == 50 and r["acertos"] == 10
    assert r["detalhe"][0]["explicacao"]
    assert post(c, "/api/provas/1/tentativas", {"respostas": GABARITO_PROVA_1}).status_code == 409
    assert _pontos(c)["total"] == saldo_antes + 50

    trilha = c.get("/api/trilha").json()
    assert {m["codigo"]: m["estado"] for m in trilha["modulos"]}["2"] == "disponivel"
    assert c.get("/api/aulas/2.1").status_code == 200


def test_ranking_da_turma_ordena_e_mostra_so_nome_abreviado(app):
    ana = novo_cliente(app, "ana.r@teste.dev", "Ana Paula Souza")
    bia = novo_cliente(app, "bia.r@teste.dev", "Bia Lima")
    ex = _ids(ana, "1.1")
    post(ana, f"/api/exercicios/{ex[1]}/tentativas", {"resposta": "1"})
    itens = bia.get("/api/ranking").json()["itens"]
    assert [i["nome"] for i in itens] == ["Ana S.", "Bia L."]
    assert itens[0]["total"] == 10 and itens[1]["total"] == 0
    assert itens[1]["eu"] and not itens[0]["eu"]
    assert "@" not in str(itens)


def test_desempate_favorece_quem_chegou_antes(app, app_db):
    _, fabrica = app_db
    a = novo_cliente(app, "a.empate@teste.dev", "Aline Costa")
    b = novo_cliente(app, "b.empate@teste.dev", "Bruno Dias")
    with fabrica() as db:
        ua = db.query(Usuario).filter_by(email_busca=cifra.codigo_busca("a.empate@teste.dev")).one()
        ub = db.query(Usuario).filter_by(email_busca=cifra.codigo_busca("b.empate@teste.dev")).one()
        t0 = datetime(2026, 11, 1, 10, tzinfo=timezone.utc)
        # B chega a 10 antes; A chega a 10 depois. Mesmo total: B fica à frente.
        db.add(MovimentoPontos(usuario_id=ub.id, tipo="ganho", pontos=10, referencia="x#1", motivo="m",
                               saldo_apos=10, criado_em=t0))
        db.add(MovimentoPontos(usuario_id=ua.id, tipo="ganho", pontos=10, referencia="x#1", motivo="m",
                               saldo_apos=10, criado_em=t0 + timedelta(hours=1)))
        db.commit()
    itens = a.get("/api/ranking").json()["itens"]
    assert [i["nome"] for i in itens] == ["Bruno D.", "Aline C."]


def test_perfil_salva_e_valida(app):
    c = novo_cliente(app, "perfil@teste.dev")
    assert put(c, "/api/perfil", {"nome_exibicao": "Lu", "meta_minutos": 7}).status_code == 422
    r = put(c, "/api/perfil", {"nome_exibicao": "  Lu Ferreira  ", "meta_minutos": 30, "curso": "Turma A"}).json()
    assert r["nome_exibicao"] == "Lu Ferreira" and r["meta_minutos"] == 30
    assert c.get("/api/perfil").json()["curso"] == "Turma A"


def test_csrf_bloqueia_escrita_sem_cabecalho(app):
    c = novo_cliente(app, "csrf@teste.dev")
    r = c.post("/api/aulas/1.1/concluir")
    assert r.status_code == 403 and r.json()["codigo"] == "csrf"


def test_certificado_so_depois_de_tudo_e_cifra_o_cpf(app, app_db):
    _, fabrica = app_db
    c = novo_cliente(app, "cert@teste.dev", "Carla Nunes")
    st = c.get("/api/certificado").json()
    assert not st["pronto"] and st["faltas"]
    r = post(c, "/api/certificado", {"nome": "Carla Nunes", "email": "carla@teste.dev", "cpf": "529.982.247-25"})
    assert r.status_code == 409 and r.json()["codigo"] == "certificado_indisponivel"

    # Simula a conclusão de todo o programa (o conteúdo ainda não tem exercícios para a maior parte das aulas)
    with fabrica() as db:
        u = db.query(Usuario).filter_by(email_busca=cifra.codigo_busca("cert@teste.dev")).one()
        for aula in db.query(Aula).all():
            db.add(ConclusaoAula(usuario_id=u.id, aula_codigo=aula.codigo))
        for modulo in db.query(Modulo).filter_by(tem_prova=True).all():
            db.add(ProvaTentativa(usuario_id=u.id, modulo_codigo=modulo.codigo, acertos=10, total=10, aprovado=True))
        db.commit()
    assert c.get("/api/certificado").json()["pronto"]

    r = post(c, "/api/certificado", {"nome": "Carla Nunes Silva", "email": "carla@teste.dev", "cpf": "529.982.247-25"})
    assert r.status_code == 200, r.text
    dados = r.json()
    assert dados["cpf"] == "***.982.247-**"
    assert dados["instituicao"] == "Centro Universitário de Lins – UNILINS"
    with fabrica() as db:
        u = db.query(Usuario).filter_by(email_busca=cifra.codigo_busca("cert@teste.dev")).one()
        assert u.cpf_cifrado and "52998224725" not in u.cpf_cifrado

    exportado = c.get("/api/me/exportar").text
    assert "52998224725" not in exportado and "cpf_cadastrado" in exportado


def test_cpf_invalido_no_certificado(app):
    c = novo_cliente(app, "cpfruim@teste.dev")
    r = post(c, "/api/certificado", {"nome": "Teste Nome", "email": "x@teste.dev", "cpf": "123.456.789-00"})
    assert r.status_code == 422 and r.json()["codigo"] == "cpf_invalido"


def test_excluir_conta_anonimiza_e_encerra_sessao(app, app_db):
    _, fabrica = app_db
    c = novo_cliente(app, "sair@teste.dev", "Quem Sai")
    ex = _ids(c, "1.1")
    post(c, f"/api/exercicios/{ex[1]}/tentativas", {"resposta": "1"})
    assert delete(c, "/api/me").status_code == 204
    assert c.get("/api/trilha").status_code == 401
    with fabrica() as db:
        u = db.query(Usuario).filter_by(anonimizado=True).one()
        assert u.email.endswith("@anonimizado.invalido") and u.nome == "Anônimo"
        assert db.query(MovimentoPontos).filter_by(usuario_id=u.id).count() == 1  # resultado preservado


def test_exercicio_aberto_informa_erros_ja_cometidos(app):
    c = novo_cliente(app, "pendente@teste.dev")
    ex = _ids(c, "1.1")
    post(c, f"/api/exercicios/{ex[2]}/tentativas", {"resposta": "Errado"})
    aberto = next(e for e in c.get("/api/aulas/1.1").json()["exercicios"] if e["ordem"] == 2)
    assert not aberto["resolvido"] and aberto["erros"] == 1
