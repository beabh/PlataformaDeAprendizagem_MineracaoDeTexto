from app import regras


def test_cpf_valido_e_invalido():
    assert regras.cpf_valido("529.982.247-25")
    assert not regras.cpf_valido("123.456.789-00")
    assert not regras.cpf_valido("111.111.111-11")
    assert not regras.cpf_valido("529.982.247-26")


def test_normalizacao_igual_ao_navegador():
    assert regras.normalizar_texto("  NÃO  ") == "nao"
    assert regras.normalizar_texto("Vacina   Covid") == "vacina covid"


def test_pontos_do_acerto():
    assert regras.pontos_do_acerto(0) == 10
    assert regras.pontos_do_acerto(1) == 5
    assert regras.pontos_do_acerto(2) == 0


def test_perda_nunca_passa_do_saldo():
    assert regras.perda_limitada(2, 5) == 2
    assert regras.perda_limitada(2, 1) == 1
    assert regras.perda_limitada(2, 0) == 0


def test_limite_de_aprovacao_sem_erro_de_arredondamento():
    assert regras.prova_aprovada(7, 10)
    assert not regras.prova_aprovada(6, 10)
    assert regras.prova_aprovada(7, 9) is True
    assert not regras.prova_aprovada(6, 9)
    assert not regras.prova_aprovada(0, 0)


def test_verificacao_de_resposta():
    assert regras.verificar_resposta("escolha", "1", 1, None)
    assert not regras.verificar_resposta("escolha", "0", 1, None)
    assert regras.verificar_resposta("digitar", "  TOKENS ", None, ["token", "tokens"])
    assert regras.verificar_resposta("digitar", "não", None, ["nao", "não"])
    assert not regras.verificar_resposta("digitar", "frase", None, ["token"])
