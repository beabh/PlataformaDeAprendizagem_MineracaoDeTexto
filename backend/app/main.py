"""Aplicação FastAPI. Rodar em desenvolvimento:

    uvicorn app.main:criar_app --factory --reload --port 8000

O mesmo servidor entrega as páginas do protótipo (frontend/prototipo), então o navegador
e a API ficam na mesma origem e o cookie de sessão funciona sem configuração extra.
"""
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles

from . import cifra
from . import catalogo, rotas, rotas_auth
from .banco import Base, criar_fabrica
from .config import Configuracao
from .config import carregar as carregar_configuracao
from .erros import ErroNegocio
from . import modelos  # noqa: F401  (registra as tabelas no metadata)

SITE = Path(__file__).resolve().parents[2] / "frontend" / "prototipo"
METODOS_ESCRITA = {"POST", "PUT", "PATCH", "DELETE"}


def criar_app(cfg: Configuracao | None = None, fabrica=None, criar_tabelas: bool = True) -> FastAPI:
    cfg = cfg or carregar_configuracao()
    engine = None
    if fabrica is None:
        engine, fabrica = criar_fabrica(cfg.database_url)
    app = FastAPI(title="Plataforma de Mineração de Texto e PLN", version="0.2.0")
    app.state.config = cfg
    cifra.configurar(cfg.chave_cripto)
    app.state.fabrica = fabrica

    app.add_middleware(SessionMiddleware, secret_key=cfg.segredo_sessao, session_cookie="pln_sessao",
                       same_site="lax", https_only=cfg.em_producao, max_age=8 * 3600)

    @app.middleware("http")
    async def protecao_csrf(request: Request, call_next):
        # Requisições que escrevem precisam de um cabeçalho que o navegador só envia do próprio site.
        # Um formulário de outro site não consegue colocá-lo, então o pedido é recusado.
        caminho = request.url.path
        if request.method in METODOS_ESCRITA and (caminho.startswith("/api") or caminho == "/auth/sair"):
            if request.headers.get("x-requested-with") != "fetch":
                return JSONResponse({"codigo": "csrf", "mensagem": "Pedido recusado."}, status_code=403)
        return await call_next(request)

    @app.exception_handler(ErroNegocio)
    async def erro_negocio(_: Request, exc: ErroNegocio):
        return JSONResponse({"codigo": exc.codigo, "mensagem": exc.mensagem, **exc.extra}, status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def dados_invalidos(_: Request, exc: RequestValidationError):
        return JSONResponse({"codigo": "dados_invalidos", "mensagem": "Confira os dados enviados."}, status_code=422)

    app.include_router(rotas_auth.router, prefix="/auth")
    app.include_router(rotas.router, prefix="/api")

    if criar_tabelas and engine is not None:
        Base.metadata.create_all(engine)
        with fabrica() as db:
            catalogo.carregar(db)

    app.mount("/", StaticFiles(directory=SITE, html=True), name="site")
    return app
