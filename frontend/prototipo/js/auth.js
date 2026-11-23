/* Telas de entrada (login.html) e cadastro (cadastro.html) com e-mail e senha.
   O servidor valida tudo de novo; aqui só se mostram as mensagens. */
(function () {
  'use strict';

  function avisar(elemento, texto) {
    elemento.textContent = texto;
    elemento.hidden = false;
  }

  function enviar(formulario, aviso, url, corpo) {
    var botao = formulario.querySelector('button[type="submit"]');
    aviso.hidden = true;
    botao.disabled = true;
    window.API.post(url, corpo)
      .then(function () { window.location.href = 'painel.html'; })
      .catch(function (erro) {
        avisar(aviso, erro.message);
        botao.disabled = false;
      });
  }

  var entrar = document.getElementById('form-entrar');
  if (entrar) {
    entrar.addEventListener('submit', function (evento) {
      evento.preventDefault();
      enviar(entrar, document.getElementById('aviso-entrar'), '/auth/entrar', {
        email: document.getElementById('login-email').value.trim(),
        senha: document.getElementById('login-senha').value
      });
    });
  }

  var cadastro = document.getElementById('form-cadastro');
  if (cadastro) {
    cadastro.addEventListener('submit', function (evento) {
      evento.preventDefault();
      var aviso = document.getElementById('aviso-cadastro');
      var senha = document.getElementById('cad-senha').value;
      if (senha !== document.getElementById('cad-confirmar').value) {
        avisar(aviso, 'As senhas não conferem.');
        return;
      }
      enviar(cadastro, aviso, '/auth/cadastro', {
        nome: document.getElementById('cad-nome').value.trim(),
        email: document.getElementById('cad-email').value.trim(),
        senha: senha
      });
    });
  }

  /* Mensagens que chegam pela URL, depois de confirmar o e-mail ou de um link inválido. */
  var info = document.getElementById('aviso-info');
  if (info) {
    var params = new URLSearchParams(window.location.search);
    if (params.get('verificado')) { info.textContent = 'E-mail confirmado. Agora você pode entrar.'; info.hidden = false; }
    if (params.get('verificacao') === 'invalida') { info.textContent = 'Este link é inválido ou já foi usado.'; info.style.color = '#b00020'; info.hidden = false; }
  }

  function enviarLivre(formulario, aviso, url, corpo, mensagemOk) {
    var botao = formulario.querySelector('button[type="submit"]');
    aviso.hidden = true;
    botao.disabled = true;
    window.API.post(url, corpo)
      .then(function (dados) {
        aviso.textContent = mensagemOk || (dados && dados.mensagem) || 'Pronto.';
        aviso.style.color = '#1b5e20';
        aviso.hidden = false;
        botao.disabled = false;
      })
      .catch(function (erro) {
        aviso.textContent = erro.message;
        aviso.style.color = '#b00020';
        aviso.hidden = false;
        botao.disabled = false;
      });
  }

  var esqueci = document.getElementById('form-esqueci');
  if (esqueci) {
    esqueci.addEventListener('submit', function (evento) {
      evento.preventDefault();
      enviarLivre(esqueci, document.getElementById('aviso-esqueci'), '/auth/esqueci-senha',
        { email: document.getElementById('esqueci-email').value.trim() });
    });
  }

  var redefinir = document.getElementById('form-redefinir');
  if (redefinir) {
    var token = new URLSearchParams(window.location.search).get('token');
    var avisoRedef = document.getElementById('aviso-redefinir');
    if (!token) {
      avisoRedef.textContent = 'Este link está incompleto. Peça um novo na tela “Esqueci minha senha”.';
      avisoRedef.hidden = false;
      redefinir.querySelector('button[type="submit"]').disabled = true;
    }
    redefinir.addEventListener('submit', function (evento) {
      evento.preventDefault();
      var senha = document.getElementById('redef-senha').value;
      if (senha !== document.getElementById('redef-confirmar').value) {
        avisoRedef.textContent = 'As senhas não conferem.';
        avisoRedef.hidden = false;
        return;
      }
      enviarLivre(redefinir, avisoRedef, '/auth/redefinir-senha', { token: token, senha: senha },
        'Senha alterada. Entre com a nova senha.');
    });
  }
})();
