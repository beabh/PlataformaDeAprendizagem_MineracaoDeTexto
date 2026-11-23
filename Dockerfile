# Servidor do projeto: API FastAPI + páginas do protótipo (frontend/prototipo) no mesmo processo.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY frontend /app/frontend

WORKDIR /app/backend
EXPOSE 8000
# A hospedagem informa a porta em PORT. Variáveis de ambiente: ver backend/.env.example.
CMD ["sh", "-c", "uvicorn app.main:criar_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
