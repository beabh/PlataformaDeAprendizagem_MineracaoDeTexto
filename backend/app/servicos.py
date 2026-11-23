"""Operações do estudante. Cada função que mexe em pontos trava a linha do usuário
(SELECT ... FOR UPDATE) e grava tudo na mesma transação. Assim, dois cliques ou duas abas
não pontuam duas vezes, e uma falha no meio não deixa a pontuação pela metade."""
from __future__ import annotations

import hashlib
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from cryptography.fernet import Fernet
from sqlalchemy import func, select

from . import regras
from .erros import ErroNegocio
from .modelos import (
    Aula, ConclusaoAula, Exercicio, Modulo, MovimentoPontos, ProvaQuestao, ProvaTentativa,
    ResultadoExercicio, Tentativa, Turma, Usuario,
)

FUSO = ZoneInfo("America/Sao_Paulo")
INSTITUICAO = "Centro Universitário de Lins – UNILINS"


# ---------- Situação do estudante (liberação em sequência) ----------

@dataclass
class Situacao:
    modulos: list[Modulo]
    aulas_por_modulo: dict[str, list[Aula]]
    aula: dict[str, Aula]
    modulo: dict[str, Modulo]
    concluidas: set[str] = field(default_factory=set)
    aprovadas: set[str] = field(default_factory=set)


def situacao(db, usuario_id: int) -> Situacao:
    modulos = list(db.scalars(select(Modulo).order_by(Modulo.ordem)))
    aulas = list(db.scalars(select(Aula).order_by(Aula.modulo_codigo, Aula.ordem)))
    por_modulo: dict[str, list[Aula]] = defaultdict(list)
    for aula in aulas:
        por_modulo[aula.modulo_codigo].append(aula)
    return Situacao(
        modulos=modulos,
        aulas_por_modulo=dict(por_modulo),
        aula={a.codigo: a for a in aulas},
        modulo={m.codigo: m for m in modulos},
        concluidas=set(db.scalars(select(ConclusaoAula.aula_codigo).where(ConclusaoAula.usuario_id == usuario_id))),
        aprovadas=set(db.scalars(select(ProvaTentativa.modulo_codigo).where(
            ProvaTentativa.usuario_id == usuario_id, ProvaTentativa.aprovado.is_(True)))),
    )


def _modulos_com_liberacao(sit: Situacao) -> list[Modulo]:
    return [m for m in sit.modulos if m.tipo == "modulo"]


def modulo_liberado(sit: Situacao, codigo: str) -> bool:
    modulo = sit.modulo[codigo]
    if modulo.tipo == "preparacao":
        return True
    gatilhos = _modulos_com_liberacao(sit)
    posicao = next((i for i, m in enumerate(gatilhos) if m.codigo == codigo), -1)
    if posicao <= 0:
        return True
    return gatilhos[posicao - 1].codigo in sit.aprovadas


def aula_liberada(sit: Situacao, codigo: str) -> bool:
    aula = sit.aula[codigo]
    if not modulo_liberado(sit, aula.modulo_codigo):
        return False
    anteriores = sit.aulas_por_modulo[aula.modulo_codigo]
    if aula.ordem == 0:
        return True
    return anteriores[aula.ordem - 1].codigo in sit.concluidas


def todas_concluidas(sit: Situacao, modulo_codigo: str) -> bool:
    return all(a.codigo in sit.concluidas for a in sit.aulas_por_modulo.get(modulo_codigo, []))


def prova_liberada(sit: Situacao, modulo_codigo: str) -> bool:
    modulo = sit.modulo[modulo_codigo]
    return bool(modulo.tem_prova) and modulo_liberado(sit, modulo_codigo) and todas_concluidas(sit, modulo_codigo)


def estado_aula(sit: Situacao, codigo: str) -> str:
    if codigo in sit.concluidas:
        return "concluida"
    return "atual" if aula_liberada(sit, codigo) else "bloqueada"


def estado_modulo(sit: Situacao, codigo: str) -> str:
    modulo = sit.modulo[codigo]
    aulas = sit.aulas_por_modulo.get(codigo, [])
    concluido = (modulo.codigo in sit.aprovadas) if modulo.tem_prova else todas_concluidas(sit, codigo)
    if concluido:
        return "concluido"
    if not modulo_liberado(sit, codigo):
        return "bloqueado"
    alguma = any(a.codigo in sit.concluidas for a in aulas)
    return "andamento" if (alguma or prova_liberada(sit, codigo)) else "disponivel"


# ---------- Livro-razão de pontos ----------

def _saldo(db, usuario_id: int) -> int:
    ganhos = db.scalar(select(func.coalesce(func.sum(MovimentoPontos.pontos), 0)).where(
        MovimentoPontos.usuario_id == usuario_id, MovimentoPontos.tipo == "ganho"))
    perdas = db.scalar(select(func.coalesce(func.sum(MovimentoPontos.pontos), 0)).where(
        MovimentoPontos.usuario_id == usuario_id, MovimentoPontos.tipo == "perda"))
    return int(ganhos) - int(perdas)


def _lancar(db, usuario_id: int, tipo: str, pontos: int, referencia: str, motivo: str) -> int:
    """Único ponto de entrada para pontos. Deve ser chamado com o usuário travado."""
    atual = _saldo(db, usuario_id)
    valor = pontos if tipo == "ganho" else regras.perda_limitada(pontos, atual)
    if valor <= 0:
        return 0
    novo = atual + valor if tipo == "ganho" else atual - valor
    db.add(MovimentoPontos(usuario_id=usuario_id, tipo=tipo, pontos=valor, referencia=referencia,
                           motivo=motivo, saldo_apos=novo))
    db.flush()
    return valor


def _travar(db, usuario_id: int) -> None:
    db.execute(select(Usuario.id).where(Usuario.id == usuario_id).with_for_update()).one()


def _resultado(db, usuario_id: int, exercicio_id: int) -> ResultadoExercicio | None:
    return db.scalar(select(ResultadoExercicio).where(
        ResultadoExercicio.usuario_id == usuario_id, ResultadoExercicio.exercicio_id == exercicio_id))


def _erros(db, usuario_id: int, exercicio_id: int) -> int:
    return int(db.scalar(select(func.count()).select_from(Tentativa).where(
        Tentativa.usuario_id == usuario_id, Tentativa.exercicio_id == exercicio_id,
        Tentativa.correta.is_(False))))


def _gravar_resultado(db, usuario_id: int, exercicio_id: int, situacao_final: str, erros: int) -> None:
    db.add(ResultadoExercicio(usuario_id=usuario_id, exercicio_id=exercicio_id,
                              situacao=situacao_final, erros=erros))
    db.flush()


def _revelacao(ex: Exercicio) -> dict:
    if ex.tipo == "escolha":
        resposta_certa = ex.opcoes[ex.correta]
    else:
        resposta_certa = (ex.respostas or [""])[0]
    return {"resposta_certa": resposta_certa, "explicacao": ex.explicacao}


def _exercicio_da_aula(db, codigo_aula: str) -> list[Exercicio]:
    return list(db.scalars(select(Exercicio).where(Exercicio.aula_codigo == codigo_aula).order_by(Exercicio.ordem)))


def _exigir_aula_liberada(sit: Situacao, codigo: str) -> None:
    if not aula_liberada(sit, codigo):
        raise ErroNegocio("aula_bloqueada", "Esta aula ainda não está liberada. Conclua a aula anterior.", 403)


# ---------- Aula e exercícios ----------

def obter_aula(db, usuario_id: int, codigo: str) -> dict:
    sit = situacao(db, usuario_id)
    aula = sit.aula.get(codigo)
    if aula is None:
        raise ErroNegocio("aula_inexistente", "Aula não encontrada.", 404)
    _exigir_aula_liberada(sit, codigo)
    exercicios = []
    resolvidos = 0
    for ex in _exercicio_da_aula(db, codigo):
        resultado = _resultado(db, usuario_id, ex.id)
        item = {"id": ex.id, "ordem": ex.ordem, "tipo": ex.tipo, "enunciado": ex.enunciado,
                "opcoes": ex.opcoes if ex.tipo == "escolha" else None,
                "situacao": resultado.situacao if resultado else None,
                "erros": resultado.erros if resultado else 0,
                "resolvido": resultado is not None}
        if resultado:
            resolvidos += 1
            item.update(_revelacao(ex))
        exercicios.append(item)
    concluida = codigo in sit.concluidas
    total = len(exercicios)
    return {
        "codigo": aula.codigo, "titulo": aula.titulo,
        "modulo": {"codigo": aula.modulo_codigo, "titulo": sit.modulo[aula.modulo_codigo].titulo},
        "estado": estado_aula(sit, codigo), "concluida": concluida,
        "pode_concluir": (not concluida) and total > 0 and resolvidos == total,
        "exercicios": exercicios,
        "placar": placar_aula(db, usuario_id, codigo),
    }


def responder_exercicio(db, usuario_id: int, exercicio_id: int, resposta: str) -> dict:
    ex = db.get(Exercicio, exercicio_id)
    if ex is None:
        raise ErroNegocio("exercicio_inexistente", "Exercício não encontrado.", 404)
    _exigir_aula_liberada(situacao(db, usuario_id), ex.aula_codigo)
    _travar(db, usuario_id)
    if _resultado(db, usuario_id, ex.id):
        raise ErroNegocio("exercicio_resolvido", "Este exercício já foi resolvido.", 409)

    erros = _erros(db, usuario_id, ex.id)
    correta = regras.verificar_resposta(ex.tipo, resposta, ex.correta, ex.respostas)
    db.add(Tentativa(usuario_id=usuario_id, exercicio_id=ex.id, resposta=str(resposta)[:500], correta=correta))
    db.flush()

    if correta:
        ganho = _lancar(db, usuario_id, "ganho", regras.pontos_do_acerto(erros), f"{ex.aula_codigo}#{ex.ordem}",
                        f"Exercício {ex.aula_codigo}#{ex.ordem}: acerto na {'1ª' if erros == 0 else '2ª'} tentativa")
        _gravar_resultado(db, usuario_id, ex.id, "acerto", erros)
        db.commit()
        return {"correta": True, "finalizado": True, "situacao": "acerto", "erros": erros,
                "ganho": ganho, "perda": 0, "saldo": _saldo(db, usuario_id), **_revelacao(ex)}

    erros += 1
    if erros >= regras.MAXIMO_TENTATIVAS:
        _gravar_resultado(db, usuario_id, ex.id, "erro", erros)
        db.commit()
        return {"correta": False, "finalizado": True, "situacao": "erro", "erros": erros,
                "ganho": 0, "perda": 0, "saldo": _saldo(db, usuario_id), **_revelacao(ex)}
    db.commit()
    return {"correta": False, "finalizado": False, "situacao": None, "erros": erros,
            "tentativas_restantes": regras.MAXIMO_TENTATIVAS - erros,
            "ganho": 0, "perda": 0, "saldo": _saldo(db, usuario_id)}


def pular_exercicio(db, usuario_id: int, exercicio_id: int) -> dict:
    ex = db.get(Exercicio, exercicio_id)
    if ex is None:
        raise ErroNegocio("exercicio_inexistente", "Exercício não encontrado.", 404)
    _exigir_aula_liberada(situacao(db, usuario_id), ex.aula_codigo)
    _travar(db, usuario_id)
    if _resultado(db, usuario_id, ex.id):
        raise ErroNegocio("exercicio_resolvido", "Este exercício já foi resolvido.", 409)
    erros = _erros(db, usuario_id, ex.id)
    perda = _lancar(db, usuario_id, "perda", regras.PONTOS_PULAR, f"{ex.aula_codigo}#{ex.ordem}",
                    f"Exercício {ex.aula_codigo}#{ex.ordem}: pulado")
    _gravar_resultado(db, usuario_id, ex.id, "pulo", erros)
    db.commit()
    return {"finalizado": True, "situacao": "pulo", "erros": erros, "ganho": 0, "perda": perda,
            "saldo": _saldo(db, usuario_id), **_revelacao(ex)}


def concluir_aula(db, usuario_id: int, codigo: str) -> dict:
    sit = situacao(db, usuario_id)
    if sit.aula.get(codigo) is None:
        raise ErroNegocio("aula_inexistente", "Aula não encontrada.", 404)
    _exigir_aula_liberada(sit, codigo)
    _travar(db, usuario_id)
    if codigo in sit.concluidas:
        return {"concluida": True, "ja_concluida": True, "ganho": 0, "saldo": _saldo(db, usuario_id)}
    exercicios = _exercicio_da_aula(db, codigo)
    if not exercicios:
        raise ErroNegocio("aula_em_elaboracao", "Esta aula ainda não tem exercícios e não pode ser concluída.", 409)
    faltam = [ex.ordem for ex in exercicios if _resultado(db, usuario_id, ex.id) is None]
    if faltam:
        raise ErroNegocio("aula_incompleta", "Resolva ou pule todos os exercícios para concluir a aula.", 409,
                          faltam=faltam)
    db.add(ConclusaoAula(usuario_id=usuario_id, aula_codigo=codigo))
    ganho = _lancar(db, usuario_id, "ganho", regras.XP_AULA, codigo, f"Aula {codigo} concluída")
    db.commit()
    return {"concluida": True, "ja_concluida": False, "ganho": ganho, "saldo": _saldo(db, usuario_id)}


def placar_aula(db, usuario_id: int, codigo: str) -> dict:
    movimentos = db.scalars(select(MovimentoPontos).where(
        MovimentoPontos.usuario_id == usuario_id, MovimentoPontos.referencia.like(f"{codigo}#%"))).all()
    ganhos = sum(m.pontos for m in movimentos if m.tipo == "ganho")
    perdas = sum(m.pontos for m in movimentos if m.tipo == "perda")
    exercicios = [e.id for e in _exercicio_da_aula(db, codigo)]
    resolvidos = int(db.scalar(select(func.count()).select_from(ResultadoExercicio).where(
        ResultadoExercicio.usuario_id == usuario_id, ResultadoExercicio.exercicio_id.in_(exercicios)))) if exercicios else 0
    return {"ganhos": ganhos, "perdas": perdas, "saldo_aula": ganhos - perdas,
            "resolvidos": resolvidos, "total": len(exercicios)}


# ---------- Provas ----------

def _minimo(total: int) -> int:
    return (regras.APROVACAO_PERCENTUAL * total + 99) // 100  # inteiro, equivale a ceil(70% do total)


def obter_prova(db, usuario_id: int, modulo_codigo: str) -> dict:
    sit = situacao(db, usuario_id)
    modulo = sit.modulo.get(modulo_codigo)
    if modulo is None or not modulo.tem_prova:
        raise ErroNegocio("prova_inexistente", "Este módulo não tem prova.", 404)
    if not prova_liberada(sit, modulo_codigo):
        raise ErroNegocio("prova_bloqueada", "A prova libera depois que todas as aulas do módulo forem concluídas.", 403)
    questoes = list(db.scalars(select(ProvaQuestao).where(
        ProvaQuestao.modulo_codigo == modulo_codigo).order_by(ProvaQuestao.ordem)))
    tentativas = db.scalars(select(ProvaTentativa).where(
        ProvaTentativa.usuario_id == usuario_id, ProvaTentativa.modulo_codigo == modulo_codigo)).all()
    return {
        "modulo": {"codigo": modulo.codigo, "titulo": modulo.titulo},
        "total": len(questoes), "minimo": _minimo(len(questoes)),
        "aprovada": modulo_codigo in sit.aprovadas,
        "melhor": max((t.acertos for t in tentativas), default=0),
        "tentativas": len(tentativas),
        "questoes": [{"ordem": q.ordem, "enunciado": q.enunciado, "opcoes": q.opcoes} for q in questoes],
    }


def enviar_prova(db, usuario_id: int, modulo_codigo: str, respostas: list[int]) -> dict:
    sit = situacao(db, usuario_id)
    modulo = sit.modulo.get(modulo_codigo)
    if modulo is None or not modulo.tem_prova:
        raise ErroNegocio("prova_inexistente", "Este módulo não tem prova.", 404)
    if not prova_liberada(sit, modulo_codigo):
        raise ErroNegocio("prova_bloqueada", "A prova libera depois que todas as aulas do módulo forem concluídas.", 403)
    _travar(db, usuario_id)
    if modulo_codigo in situacao(db, usuario_id).aprovadas:
        raise ErroNegocio("prova_ja_aprovada", "Você já foi aprovado nesta prova.", 409)
    questoes = list(db.scalars(select(ProvaQuestao).where(
        ProvaQuestao.modulo_codigo == modulo_codigo).order_by(ProvaQuestao.ordem)))
    if len(respostas) != len(questoes):
        raise ErroNegocio("dados_invalidos", "Responda todas as questões antes de enviar.", 422)
    detalhe, acertos = [], 0
    for q, r in zip(questoes, respostas):
        if not (0 <= r < len(q.opcoes)):
            raise ErroNegocio("dados_invalidos", "Alguma resposta não corresponde a uma alternativa.", 422)
        acertou = r == q.correta
        acertos += int(acertou)
        detalhe.append({"ordem": q.ordem, "sua_resposta": r, "correta": q.correta,
                        "acertou": acertou, "explicacao": q.explicacao})
    aprovado = regras.prova_aprovada(acertos, len(questoes))
    db.add(ProvaTentativa(usuario_id=usuario_id, modulo_codigo=modulo_codigo, acertos=acertos,
                          total=len(questoes), aprovado=aprovado))
    db.flush()
    ganho = 0
    if aprovado:
        ganho = _lancar(db, usuario_id, "ganho", regras.XP_PRIMEIRA_PROVA, f"prova-{modulo_codigo}",
                        f"Prova do módulo {modulo_codigo} aprovada")
    db.commit()
    return {"acertos": acertos, "total": len(questoes), "minimo": _minimo(len(questoes)),
            "aprovada": aprovado, "ganho": ganho, "saldo": _saldo(db, usuario_id), "detalhe": detalhe}


# ---------- Trilha, pontos e classificação ----------

def _dias_com_atividade(db, usuario_id: int) -> set[date]:
    instantes = []
    instantes += db.scalars(select(Tentativa.criado_em).where(Tentativa.usuario_id == usuario_id)).all()
    instantes += db.scalars(select(ConclusaoAula.criado_em).where(ConclusaoAula.usuario_id == usuario_id)).all()
    instantes += db.scalars(select(ProvaTentativa.criado_em).where(ProvaTentativa.usuario_id == usuario_id)).all()
    return {i.astimezone(FUSO).date() for i in instantes if i is not None}


def sequencia(dias: set[date], hoje: date) -> int:
    cursor = hoje
    if cursor not in dias:
        cursor -= timedelta(days=1)  # hoje ainda não estudou: a sequência pode continuar de ontem
    n = 0
    while cursor in dias:
        n += 1
        cursor -= timedelta(days=1)
    return n


def obter_trilha(db, usuario_id: int) -> dict:
    sit = situacao(db, usuario_id)
    movimentos = db.scalars(select(MovimentoPontos).where(MovimentoPontos.usuario_id == usuario_id)).all()
    ganhos = sum(m.pontos for m in movimentos if m.tipo == "ganho")
    perdas = sum(m.pontos for m in movimentos if m.tipo == "perda")
    modulos = []
    for modulo in sit.modulos:
        codigos = {a.codigo for a in sit.aulas_por_modulo.get(modulo.codigo, [])}
        g = sum(m.pontos for m in movimentos if m.tipo == "ganho" and _pertence(m.referencia, codigos, modulo.codigo))
        p = sum(m.pontos for m in movimentos if m.tipo == "perda" and _pertence(m.referencia, codigos, modulo.codigo))
        modulos.append({
            "codigo": modulo.codigo, "titulo": modulo.titulo, "tipo": modulo.tipo, "tem_prova": modulo.tem_prova,
            "estado": estado_modulo(sit, modulo.codigo),
            "prova": None if not modulo.tem_prova else {
                "estado": "concluida" if modulo.codigo in sit.aprovadas
                else ("atual" if prova_liberada(sit, modulo.codigo) else "bloqueada")},
            "aulas": [{"codigo": a.codigo, "titulo": a.titulo, "estado": estado_aula(sit, a.codigo)}
                      for a in sit.aulas_por_modulo.get(modulo.codigo, [])],
            "pontos": {"ganhos": g, "perdas": p},
        })
    hoje = datetime.now(FUSO).date()
    return {
        "pontos": {"ganhos": ganhos, "perdas": perdas, "total": ganhos - perdas},
        "aulas_concluidas": len(sit.concluidas),
        "unidades_concluidas": sum(1 for m in sit.modulos if m.tipo == "modulo" and estado_modulo(sit, m.codigo) == "concluido"),
        "sequencia": sequencia(_dias_com_atividade(db, usuario_id), hoje),
        "modulos": modulos,
    }


def _pertence(referencia: str, codigos_aulas: set[str], codigo_modulo: str) -> bool:
    base = referencia.split("#")[0]
    return base in codigos_aulas or referencia == f"prova-{codigo_modulo}"


def historico_pontos(db, usuario_id: int, limite: int = 200) -> dict:
    movimentos = db.scalars(select(MovimentoPontos).where(
        MovimentoPontos.usuario_id == usuario_id).order_by(MovimentoPontos.id.desc()).limit(limite)).all()
    ganhos = db.scalar(select(func.coalesce(func.sum(MovimentoPontos.pontos), 0)).where(
        MovimentoPontos.usuario_id == usuario_id, MovimentoPontos.tipo == "ganho"))
    perdas = db.scalar(select(func.coalesce(func.sum(MovimentoPontos.pontos), 0)).where(
        MovimentoPontos.usuario_id == usuario_id, MovimentoPontos.tipo == "perda"))
    return {
        "ganhos": int(ganhos), "perdas": int(perdas), "total": int(ganhos) - int(perdas),
        "historico": [{"tipo": m.tipo, "pontos": m.pontos, "motivo": m.motivo, "referencia": m.referencia,
                       "saldo_apos": m.saldo_apos, "criado_em": m.criado_em.isoformat()} for m in movimentos],
    }


def _abreviar(nome: str) -> str:
    """Primeiro nome e inicial do sobrenome, para não expor o nome completo na turma."""
    partes = (nome or "").split()
    if not partes:
        return "Estudante"
    if len(partes) == 1:
        return partes[0]
    return f"{partes[0]} {partes[-1][0]}."


def classificacao(db, usuario: Usuario) -> dict:
    if usuario.turma_id is None:
        return {"turma": None, "itens": []}
    turma = db.get(Turma, usuario.turma_id)
    colegas = db.scalars(select(Usuario).where(
        Usuario.turma_id == usuario.turma_id, Usuario.anonimizado.is_(False))).all()
    ids = [u.id for u in colegas]
    movimentos = db.scalars(select(MovimentoPontos).where(
        MovimentoPontos.usuario_id.in_(ids)).order_by(MovimentoPontos.id)).all() if ids else []
    por_usuario: dict[int, list[MovimentoPontos]] = defaultdict(list)
    for m in movimentos:
        por_usuario[m.usuario_id].append(m)
    aulas = dict(db.execute(select(ConclusaoAula.usuario_id, func.count()).where(
        ConclusaoAula.usuario_id.in_(ids)).group_by(ConclusaoAula.usuario_id)).all()) if ids else {}
    provas = dict(db.execute(select(ProvaTentativa.usuario_id, func.count(func.distinct(ProvaTentativa.modulo_codigo))).where(
        ProvaTentativa.usuario_id.in_(ids), ProvaTentativa.aprovado.is_(True)).group_by(ProvaTentativa.usuario_id)).all()) if ids else {}

    linhas = []
    for u in colegas:
        lista = por_usuario.get(u.id, [])
        total = sum(m.pontos if m.tipo == "ganho" else -m.pontos for m in lista)
        # Desempate: instante em que o total atual foi atingido pela última vez e não caiu depois.
        marco = None
        for m in lista:
            if m.saldo_apos >= total:
                marco = marco or m.criado_em
            else:
                marco = None
        linhas.append({"id": u.id, "nome": _abreviar(u.nome_exibicao or u.nome_google), "total": total,
                       "aulas": int(aulas.get(u.id, 0)), "provas": int(provas.get(u.id, 0)),
                       "marco": marco or datetime.min.replace(tzinfo=FUSO), "eu": u.id == usuario.id})
    linhas.sort(key=lambda x: (-x["total"], x["marco"], x["id"]))
    itens = [{"posicao": i + 1, "nome": l["nome"], "total": l["total"], "aulas": l["aulas"],
              "provas": l["provas"], "eu": l["eu"]} for i, l in enumerate(linhas)]
    return {"turma": {"codigo": turma.codigo, "nome": turma.nome} if turma else None, "itens": itens}


# ---------- Perfil, certificado e dados pessoais ----------

def ler_perfil(usuario: Usuario) -> dict:
    return {"email": usuario.email, "nome_exibicao": usuario.nome_exibicao or "",
            "meta_minutos": usuario.meta_minutos, "curso": usuario.curso or ""}


def atualizar_perfil(db, usuario: Usuario, nome_exibicao: str, meta_minutos: int, curso: str) -> dict:
    if meta_minutos not in (10, 15, 30):
        raise ErroNegocio("dados_invalidos", "A meta diária deve ser 10, 15 ou 30 minutos.", 422)
    usuario.nome_exibicao = nome_exibicao.strip()[:60] or None
    usuario.meta_minutos = meta_minutos
    usuario.curso = curso.strip()[:80] or None
    db.commit()
    return ler_perfil(usuario)


def _faltas_certificado(sit: Situacao) -> list[str]:
    faltas = []
    for modulo in sit.modulos:
        if not todas_concluidas(sit, modulo.codigo):
            faltas.append(f"Concluir todas as aulas do módulo {modulo.codigo}")
        if modulo.tem_prova and modulo.codigo not in sit.aprovadas:
            faltas.append(f"Aprovar a prova do módulo {modulo.codigo}")
    return faltas


def status_certificado(db, usuario: Usuario) -> dict:
    faltas = _faltas_certificado(situacao(db, usuario.id))
    return {"pronto": not faltas, "faltas": faltas,
            "emitido": usuario.cpf_cifrado is not None,
            "nome": usuario.nome_certificado or "", "email": usuario.email_certificado or ""}


def emitir_certificado(db, usuario: Usuario, nome: str, email: str, cpf: str, chave_cpf: str) -> dict:
    nome = (nome or "").strip()
    email = (email or "").strip()
    if not (3 <= len(nome) <= 120):
        raise ErroNegocio("dados_invalidos", "Informe o nome completo para o certificado.", 422)
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ErroNegocio("dados_invalidos", "Informe um e-mail válido.", 422)
    if not regras.cpf_valido(cpf):
        raise ErroNegocio("cpf_invalido", "O CPF informado não é válido.", 422)
    faltas = _faltas_certificado(situacao(db, usuario.id))
    if faltas:
        raise ErroNegocio("certificado_indisponivel", "Ainda faltam etapas para o certificado.", 409, faltas=faltas)
    _travar(db, usuario.id)
    agora = datetime.now(FUSO)
    usuario.nome_certificado = nome
    usuario.email_certificado = email
    usuario.cpf_cifrado = Fernet(chave_cpf.encode()).encrypt(regras.cpf_somente_digitos(cpf).encode()).decode()
    db.commit()
    codigo = hashlib.sha256(f"{usuario.id}|{nome}|{agora.isoformat()}".encode()).hexdigest()[:12].upper()
    return {"nome": nome, "email": email, "cpf": regras.cpf_mascarado(cpf), "instituicao": INSTITUICAO,
            "emitido_em": agora.isoformat(), "codigo_verificacao": codigo}


def exportar_dados(db, usuario: Usuario) -> dict:
    """Cópia dos dados do estudante (LGPD: direito de acesso). Sem o CPF em texto."""
    uid = usuario.id
    return {
        "usuario": {"email": usuario.email, "nome_google": usuario.nome_google,
                    "nome_exibicao": usuario.nome_exibicao, "curso": usuario.curso,
                    "meta_minutos": usuario.meta_minutos, "cpf_cadastrado": usuario.cpf_cifrado is not None},
        "movimentos_pontos": [{"tipo": m.tipo, "pontos": m.pontos, "motivo": m.motivo, "saldo_apos": m.saldo_apos,
                               "criado_em": m.criado_em.isoformat()} for m in db.scalars(
            select(MovimentoPontos).where(MovimentoPontos.usuario_id == uid).order_by(MovimentoPontos.id))],
        "tentativas": [{"exercicio_id": t.exercicio_id, "resposta": t.resposta, "correta": t.correta,
                        "criado_em": t.criado_em.isoformat()} for t in db.scalars(
            select(Tentativa).where(Tentativa.usuario_id == uid).order_by(Tentativa.id))],
        "provas": [{"modulo": p.modulo_codigo, "acertos": p.acertos, "total": p.total, "aprovado": p.aprovado,
                    "criado_em": p.criado_em.isoformat()} for p in db.scalars(
            select(ProvaTentativa).where(ProvaTentativa.usuario_id == uid).order_by(ProvaTentativa.id))],
    }


def excluir_conta(db, usuario: Usuario) -> None:
    """Remove os dados pessoais e mantém os resultados sem identificação (estatística da disciplina)."""
    usuario.anonimizado = True
    usuario.google_sub = None
    usuario.email = f"removido-{usuario.id}@anonimizado.invalido"
    usuario.nome_google = "Anônimo"
    usuario.nome_exibicao = None
    usuario.curso = None
    usuario.nome_certificado = None
    usuario.email_certificado = None
    usuario.cpf_cifrado = None
    db.commit()
