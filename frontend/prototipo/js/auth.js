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
})();
