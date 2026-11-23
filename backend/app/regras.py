"""Regras de pontuação, aprovação e validação. Funções puras, sem banco de dados.

Os valores espelham js/progresso.js e js/exercicios.js do protótipo. Mudar um valor aqui
exige mudar lá também (ou apagar o protótipo quando a API estiver em uso).
"""
import re
import unicodedata

APROVACAO_PERCENTUAL = 70          # 70% de acertos. Comparação em inteiros: acertos*100 >= 70*total
XP_AULA = 10
XP_PRIMEIRA_PROVA = 50
PONTOS_ACERTO_PRIMEIRA = 10
PONTOS_ACERTO_SEGUNDA = 5
PONTOS_PULAR = 2
MAXIMO_TENTATIVAS = 2              # a 2ª resposta errada encerra o exercício


def normalizar_texto(texto: str) -> str:
    """Minúsculas, sem acentos e com espaços simples. Mesma regra do navegador."""
    sem_acento = unicodedata.normalize("NFD", str(texto).strip().lower())
    sem_acento = "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", sem_acento)


def pontos_do_acerto(erros_antes: int) -> int:
    if erros_antes == 0:
        return PONTOS_ACERTO_PRIMEIRA
    if erros_antes == 1:
        return PONTOS_ACERTO_SEGUNDA
    return 0


def perda_limitada(pontos: int, saldo: int) -> int:
    """A perda nunca passa do saldo, então o total não fica negativo."""
    return max(0, min(pontos, saldo))


def prova_aprovada(acertos: int, total: int) -> bool:
    if total <= 0:
        return False
    return acertos * 100 >= APROVACAO_PERCENTUAL * total


def verificar_resposta(tipo: str, resposta: str, correta: int | None, respostas: list[str] | None) -> bool:
    if tipo == "escolha":
        try:
            return int(str(resposta).strip()) == correta
        except ValueError:
            return False
    r = normalizar_texto(resposta)
    return any(normalizar_texto(aceita) == r for aceita in (respostas or []))


def cpf_valido(cpf: str) -> bool:
    digitos = re.sub(r"\D", "", cpf or "")
    if len(digitos) != 11 or digitos == digitos[0] * 11:
        return False
    for posicao in (9, 10):
        soma = sum(int(digitos[i]) * (posicao + 1 - i) for i in range(posicao))
        digito = (soma * 10) % 11 % 10
        if digito != int(digitos[posicao]):
            return False
    return True


def cpf_somente_digitos(cpf: str) -> str:
    return re.sub(r"\D", "", cpf or "")


def cpf_mascarado(cpf: str) -> str:
    d = cpf_somente_digitos(cpf)
    return f"***.{d[3:6]}.{d[6:9]}-**" if len(d) == 11 else ""
