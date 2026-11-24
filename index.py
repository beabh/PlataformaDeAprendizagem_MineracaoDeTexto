"""Ponto de entrada para o Vercel (o Vercel procura o objeto `app` neste arquivo).

Não rode este arquivo diretamente. Localmente, use o servidor a partir da pasta backend/
(ver backend/README.md). Este arquivo só expõe a mesma aplicação para a hospedagem.
"""
from backend.app.main import criar_app

app = criar_app()
