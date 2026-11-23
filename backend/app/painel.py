"""Visão da turma para professores e administradores: estudantes e desempenho por módulo."""
from sqlalchemy import func, select

from .modelos import ConclusaoAula, Modulo, MovimentoPontos, ProvaTentativa, Usuario


def estudantes(db) -> list[dict]:
    usuarios = db.scalars(select(Usuario).where(Usuario.anonimizado.is_(False)).order_by(Usuario.id)).all()
    ganhos = dict(db.execute(select(MovimentoPontos.usuario_id, func.sum(MovimentoPontos.pontos))
                             .where(MovimentoPontos.tipo == "ganho").group_by(MovimentoPontos.usuario_id)).all())
    perdas = dict(db.execute(select(MovimentoPontos.usuario_id, func.sum(MovimentoPontos.pontos))
                             .where(MovimentoPontos.tipo == "perda").group_by(MovimentoPontos.usuario_id)).all())
    aulas = dict(db.execute(select(ConclusaoAula.usuario_id, func.count())
                            .group_by(ConclusaoAula.usuario_id)).all())
    provas = dict(db.execute(select(ProvaTentativa.usuario_id, func.count())
                             .where(ProvaTentativa.aprovado.is_(True)).group_by(ProvaTentativa.usuario_id)).all())
    return [{"id": u.id, "nome": u.nome, "email": u.email, "perfil": u.perfil,
             "email_verificado": u.email_verificado,
             "pontos": int(ganhos.get(u.id, 0) - perdas.get(u.id, 0)),
             "aulas_concluidas": int(aulas.get(u.id, 0)), "provas_aprovadas": int(provas.get(u.id, 0))}
            for u in usuarios]


def modulos(db) -> list[dict]:
    tentativas = db.execute(select(ProvaTentativa.modulo_codigo, ProvaTentativa.usuario_id,
                                   ProvaTentativa.acertos, ProvaTentativa.total,
                                   ProvaTentativa.aprovado)).all()
    saida = []
    for m in db.scalars(select(Modulo).order_by(Modulo.ordem)).all():
        if not m.tem_prova:
            continue
        do_modulo = [t for t in tentativas if t.modulo_codigo == m.codigo]
        aprovados = {t.usuario_id for t in do_modulo if t.aprovado}
        percentuais = [t.acertos * 100 / t.total for t in do_modulo if t.total]
        saida.append({"codigo": m.codigo, "titulo": m.titulo, "alunos_aprovados": len(aprovados),
                      "media_acertos_percentual": round(sum(percentuais) / len(percentuais), 1) if percentuais else None})
    return saida


PERFIS = ("estudante", "professor", "administrador")


def promover(db, email_busca_codigo: str, perfil: str) -> Usuario | None:
    usuario = db.scalar(select(Usuario).where(Usuario.email_busca == email_busca_codigo))
    if usuario is None:
        return None
    usuario.perfil = perfil
    db.commit()
    return usuario
