"""Conexão com o banco (PostgreSQL ou SQLite) e base dos modelos."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


def criar_fabrica(url: str):
    argumentos = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}
    engine = create_engine(url, pool_pre_ping=True, **argumentos)
    return engine, sessionmaker(bind=engine, expire_on_commit=False)
