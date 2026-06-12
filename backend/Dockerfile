FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Script de arranque: aguarda DB, corre migrations, inicia servidor
CMD ["sh", "-c", "\
  echo 'A iniciar AgroLink API...' && \
  alembic upgrade head && \
  echo 'Migrations concluídas. A iniciar servidor...' && \
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1\
"]
