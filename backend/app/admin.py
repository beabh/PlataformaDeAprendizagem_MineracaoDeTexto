"""Comando de administração, fora do site (ninguém promove alguém pela internet).

    python -m app.admin promover EMAIL PERFIL     (PERFIL: estudante, professor ou administrador)
"""
import sys

from . import cifra, painel
from .banco import criar_fabrica
from .config import carregar


def main(argv: list[str]) -> int:
    if len(argv) != 3 or argv[0] != "promover" or argv[2] not in painel.PERFIS:
        print("Uso: python -m app.admin promover EMAIL PERFIL   (PERFIL: estudante, professor ou administrador)")
        return 2
    cfg = carregar()
    cifra.configurar(cfg.chave_cripto)
    _, fabrica = criar_fabrica(cfg.database_url)
    with fabrica() as db:
        usuario = painel.promover(db, cifra.codigo_busca(argv[1]), argv[2])
    if usuario is None:
        print("Nenhuma conta com este e-mail.")
        return 1
    print(f"Perfil alterado para {argv[2]}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
