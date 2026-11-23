"""Tabelas do banco. Descrição em docs/backend-simples.md (seção 1)."""
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .banco import Base


class Turma(Base):
    __tablename__ = "turma"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    nome: Mapped[str] = mapped_column(String(120))


class Usuario(Base):
    __tablename__ = "usuario"
    id: Mapped[int] = mapped_column(primary_key=True)
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    nome_google: Mapped[str] = mapped_column(String(120))
    nome_exibicao: Mapped[str | None] = mapped_column(String(60))
    curso: Mapped[str | None] = mapped_column(String(80))
    meta_minutos: Mapped[int] = mapped_column(Integer, default=15)
    # Dados do certificado: só existem depois que o estudante pede o certificado.
    nome_certificado: Mapped[str | None] = mapped_column(String(120))
    email_certificado: Mapped[str | None] = mapped_column(String(255))
    cpf_cifrado: Mapped[str | None] = mapped_column(Text)
    turma_id: Mapped[int | None] = mapped_column(ForeignKey("turma.id"))
    anonimizado: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Modulo(Base):
    __tablename__ = "modulo"
    codigo: Mapped[str] = mapped_column(String(10), primary_key=True)
    ordem: Mapped[int] = mapped_column(Integer)
    titulo: Mapped[str] = mapped_column(String(200))
    tipo: Mapped[str] = mapped_column(String(15))          # "preparacao" ou "modulo"
    tem_prova: Mapped[bool] = mapped_column(Boolean, default=False)


class Aula(Base):
    __tablename__ = "aula"
    codigo: Mapped[str] = mapped_column(String(10), primary_key=True)
    modulo_codigo: Mapped[str] = mapped_column(ForeignKey("modulo.codigo"))
    ordem: Mapped[int] = mapped_column(Integer)
    titulo: Mapped[str] = mapped_column(String(200))


class Exercicio(Base):
    __tablename__ = "exercicio"
    __table_args__ = (UniqueConstraint("aula_codigo", "ordem"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    aula_codigo: Mapped[str] = mapped_column(ForeignKey("aula.codigo"))
    ordem: Mapped[int] = mapped_column(Integer)
    tipo: Mapped[str] = mapped_column(String(10))           # "escolha" ou "digitar"
    enunciado: Mapped[str] = mapped_column(Text)
    opcoes: Mapped[list | None] = mapped_column(JSON)       # só em "escolha"
    # Gabarito: nunca é enviado ao navegador. Só "correta" ou "respostas" é usado, conforme o tipo.
    correta: Mapped[int | None] = mapped_column(Integer)
    respostas: Mapped[list | None] = mapped_column(JSON)
    explicacao: Mapped[str] = mapped_column(Text)


class Tentativa(Base):
    __tablename__ = "tentativa"
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), index=True)
    exercicio_id: Mapped[int] = mapped_column(ForeignKey("exercicio.id"), index=True)
    resposta: Mapped[str] = mapped_column(Text)
    correta: Mapped[bool] = mapped_column(Boolean)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ResultadoExercicio(Base):
    __tablename__ = "resultado_exercicio"
    __table_args__ = (UniqueConstraint("usuario_id", "exercicio_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), index=True)
    exercicio_id: Mapped[int] = mapped_column(ForeignKey("exercicio.id"))
    situacao: Mapped[str] = mapped_column(String(10))        # "acerto", "erro" ou "pulo"
    erros: Mapped[int] = mapped_column(Integer, default=0)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MovimentoPontos(Base):
    """Livro-razão: o saldo é a soma. saldo_apos guarda o total depois do lançamento."""
    __tablename__ = "movimento_pontos"
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), index=True)
    tipo: Mapped[str] = mapped_column(String(10))            # "ganho" ou "perda"
    pontos: Mapped[int] = mapped_column(Integer)
    referencia: Mapped[str] = mapped_column(String(60))      # ex.: "1.1#2", "1.1", "prova-1"
    motivo: Mapped[str] = mapped_column(String(200))
    saldo_apos: Mapped[int] = mapped_column(Integer)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConclusaoAula(Base):
    __tablename__ = "conclusao_aula"
    __table_args__ = (UniqueConstraint("usuario_id", "aula_codigo"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), index=True)
    aula_codigo: Mapped[str] = mapped_column(ForeignKey("aula.codigo"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProvaQuestao(Base):
    __tablename__ = "prova_questao"
    __table_args__ = (UniqueConstraint("modulo_codigo", "ordem"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    modulo_codigo: Mapped[str] = mapped_column(ForeignKey("modulo.codigo"))
    ordem: Mapped[int] = mapped_column(Integer)
    enunciado: Mapped[str] = mapped_column(Text)
    opcoes: Mapped[list] = mapped_column(JSON)
    correta: Mapped[int] = mapped_column(Integer)
    explicacao: Mapped[str] = mapped_column(Text)


class ProvaTentativa(Base):
    __tablename__ = "prova_tentativa"
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), index=True)
    modulo_codigo: Mapped[str] = mapped_column(ForeignKey("modulo.codigo"))
    acertos: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    aprovado: Mapped[bool] = mapped_column(Boolean)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
