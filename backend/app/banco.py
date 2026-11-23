"""Conexão com o PostgreSQL e base dos modelos."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


def criar_fabrica(url: str):
    engine = create_engine(url, pool_pre_ping=True)
    return engine, sessionmaker(bind=engine, expire_on_commit=False)
