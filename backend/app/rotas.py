"""Endpoints do estudante (prefixo /api). Toda regra fica em servicos.py."""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from . import servicos
from .dependencias import get_db, usuario_atual
from .esquemas import DadosCertificado, Perfil, RespostaExercicio, RespostaProva
from .modelos import Usuario

router = APIRouter()


@router.get("/me")
def me(usuario: Usuario = Depends(usuario_atual)):
    return {"nome": usuario.nome_exibicao or usuario.nome, "email": usuario.email,
            "turma_id": usuario.turma_id}


@router.get("/perfil")
def ler_perfil(usuario: Usuario = Depends(usuario_atual)):
    return servicos.ler_perfil(usuario)


@router.put("/perfil")
def salvar_perfil(dados: Perfil, db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.atualizar_perfil(db, usuario, dados.nome_exibicao, dados.meta_minutos, dados.curso)


@router.get("/trilha")
def trilha(db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.obter_trilha(db, usuario.id)


@router.get("/aulas/{codigo}")
def aula(codigo: str, db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.obter_aula(db, usuario.id, codigo)


@router.post("/exercicios/{exercicio_id}/tentativas")
def responder(exercicio_id: int, dados: RespostaExercicio, db=Depends(get_db),
              usuario: Usuario = Depends(usuario_atual)):
    return servicos.responder_exercicio(db, usuario.id, exercicio_id, dados.resposta)


@router.post("/exercicios/{exercicio_id}/pulo")
def pular(exercicio_id: int, db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.pular_exercicio(db, usuario.id, exercicio_id)


@router.post("/aulas/{codigo}/concluir")
def concluir(codigo: str, db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.concluir_aula(db, usuario.id, codigo)


@router.get("/aulas/{codigo}/placar")
def placar(codigo: str, db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.placar_aula(db, usuario.id, codigo)


@router.get("/provas/{modulo}")
def prova(modulo: str, db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.obter_prova(db, usuario.id, modulo)


@router.post("/provas/{modulo}/tentativas")
def enviar_prova(modulo: str, dados: RespostaProva, db=Depends(get_db),
                 usuario: Usuario = Depends(usuario_atual)):
    return servicos.enviar_prova(db, usuario.id, modulo, dados.respostas)


@router.get("/me/pontos")
def pontos(db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.historico_pontos(db, usuario.id)


@router.get("/ranking")
def ranking(db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.classificacao(db, usuario)


@router.get("/certificado")
def status_certificado(db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.status_certificado(db, usuario)


@router.post("/certificado")
def emitir_certificado(dados: DadosCertificado, request: Request, db=Depends(get_db),
                       usuario: Usuario = Depends(usuario_atual)):
    return servicos.emitir_certificado(db, usuario, dados.nome, dados.email, dados.cpf)


@router.get("/me/exportar")
def exportar(db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    return servicos.exportar_dados(db, usuario)


@router.delete("/me", status_code=204)
def excluir(request: Request, db=Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    servicos.excluir_conta(db, usuario)
    request.session.clear()
    return None
