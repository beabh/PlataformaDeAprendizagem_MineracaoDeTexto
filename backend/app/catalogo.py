"""Carrega o catálogo, os exercícios e as provas (dados/*.json, exportados do protótipo).

A carga só acontece quando as tabelas de módulos estão vazias. Para atualizar o conteúdo
depois, use `python -m app.catalogo --recarregar` (apaga e recarrega o catálogo).
"""
import json
import sys
from pathlib import Path

from sqlalchemy import func, select

from .modelos import Aula, Exercicio, Modulo, ProvaQuestao

DADOS = Path(__file__).resolve().parents[1] / "dados"


def _ler(nome: str):
    return json.loads((DADOS / nome).read_text(encoding="utf-8"))


def carregar(db) -> bool:
    if db.scalar(select(func.count()).select_from(Modulo)):
        return False
    catalogo_json = _ler("catalogo.json")
    for ordem, modulo in enumerate(catalogo_json):
        db.add(Modulo(codigo=modulo["id"], ordem=ordem, titulo=modulo["titulo"],
                      tipo=modulo["tipo"], tem_prova=bool(modulo["prova"])))
    db.flush()  # sem relationship, o SQLAlchemy não ordena os inserts: módulos antes das aulas
    for modulo in catalogo_json:
        for posicao, aula in enumerate(modulo["aulas"]):
            db.add(Aula(codigo=aula["cod"], modulo_codigo=modulo["id"], ordem=posicao, titulo=aula["titulo"]))
    for codigo_aula, lista in _ler("exercicios.json").items():
        for numero, ex in enumerate(lista, start=1):
            db.add(Exercicio(aula_codigo=codigo_aula, ordem=numero, tipo=ex["tipo"], enunciado=ex["enunciado"],
                             opcoes=ex.get("opcoes"), correta=ex.get("correta"), respostas=ex.get("respostas"),
                             explicacao=ex["explicacao"]))
    db.flush()  # aulas antes dos exercícios
    for codigo_modulo, prova in _ler("provas.json").items():
        for numero, q in enumerate(prova["questoes"], start=1):
            db.add(ProvaQuestao(modulo_codigo=codigo_modulo, ordem=numero, enunciado=q["enunciado"],
                                opcoes=q["opcoes"], correta=q["correta"], explicacao=q["explicacao"]))
    db.commit()
    return True


if __name__ == "__main__":
    from .config import carregar as carregar_config
    from .banco import criar_fabrica
    from .banco import Base
    from . import modelos  # noqa: F401  (registra as tabelas)

    cfg = carregar_config()
    engine, fabrica = criar_fabrica(cfg.database_url)
    Base.metadata.create_all(engine)
    with fabrica() as db:
        if "--recarregar" in sys.argv:
            for tabela in (ProvaQuestao, Exercicio, Aula, Modulo):
                db.query(tabela).delete()
            db.commit()
        print("catálogo carregado" if carregar(db) else "catálogo já existia")
