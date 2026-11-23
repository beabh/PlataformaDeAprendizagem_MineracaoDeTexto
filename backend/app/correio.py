"""Envio de e-mails. Com SMTP configurado, envia de verdade. Sem SMTP, em desenvolvimento, grava a mensagem
na pasta PLN_PASTA_CORREIO (backend/caixa_de_saida por padrão) para você abrir e clicar no link."""
import smtplib
from datetime import datetime
from email.message import EmailMessage
from itertools import count

from .erros import ErroNegocio

ENVIADOS: list[dict] = []  # usado pelos testes, quando não há SMTP nem pasta configurados
_contador = count(1)


def configurado(cfg) -> bool:
    return bool(cfg.smtp_host) or not cfg.em_producao


def enviar(cfg, destinatario: str, assunto: str, corpo: str) -> None:
    if not configurado(cfg):
        raise ErroNegocio("correio_indisponivel", "Não foi possível enviar o e-mail agora. Tente mais tarde.", 503)
    mensagem = EmailMessage()
    mensagem["From"] = cfg.smtp_remetente
    mensagem["To"] = destinatario
    mensagem["Subject"] = assunto
    mensagem.set_content(corpo)
    if cfg.smtp_host:
        try:
            with smtplib.SMTP(cfg.smtp_host, cfg.smtp_porta, timeout=15) as servidor:
                servidor.starttls()
                if cfg.smtp_usuario:
                    servidor.login(cfg.smtp_usuario, cfg.smtp_senha or "")
                servidor.send_message(mensagem)
        except (smtplib.SMTPException, OSError) as exc:
            raise ErroNegocio("correio_indisponivel", "Não foi possível enviar o e-mail agora. Tente mais tarde.", 503) from exc
    elif cfg.pasta_correio:
        from pathlib import Path
        pasta = Path(cfg.pasta_correio)
        pasta.mkdir(parents=True, exist_ok=True)
        nome = f"{datetime.now():%Y%m%d-%H%M%S}-{next(_contador)}.eml"
        (pasta / nome).write_text(mensagem.as_string(), encoding="utf-8")
    else:
        ENVIADOS.append({"para": destinatario, "assunto": assunto, "corpo": corpo})
