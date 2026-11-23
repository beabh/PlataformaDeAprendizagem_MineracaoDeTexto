/* Meu perfil: carrega e salva nome de exibição, meta e curso (/api/perfil),
   e oferece a exclusão da conta em duas etapas (/api/me). */
(function () {
  'use strict';

  var form = document.getElementById('form-perfil');
  if (!form) return;

  var nome = document.getElementById('perfil-nome');
  var email = document.getElementById('perfil-email');
  var meta = document.getElementById('perfil-meta');
  var curso = document.getElementById('perfil-curso');
  var aviso = document.getElementById('aviso-perfil');

  function avisoTexto(texto, tipo) {
    aviso.textContent = texto;
    aviso.className = 'subtitulo ' + (tipo === 'erro' ? 'ajuda-erro' : '');
  }

  window.API.get('/api/perfil').then(function (p) {
    nome.value = p.nome_exibicao;
    email.value = p.email;
    meta.value = String(p.meta_minutos);
    curso.value = p.curso;
  }).catch(function (err) {
    avisoTexto(err.message, 'erro');
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    window.API.put('/api/perfil', {
      nome_exibicao: nome.value.trim(),
      meta_minutos: parseInt(meta.value, 10),
      curso: curso.value.trim()
    }).then(function (p) {
      nome.value = p.nome_exibicao;
      avisoTexto('Perfil salvo. ' + (p.nome_exibicao ? 'O menu agora mostra "' + p.nome_exibicao + '".' : 'Sem nome, o menu mostra o nome da sua conta Google.'));
      if (window.PLNConta) window.PLNConta.atualizar();
    }).catch(function (err) {
      avisoTexto(err.message, 'erro');
    });
  });

  var excluir = document.querySelector('[data-excluir-conta]');
  if (excluir) {
    var pendente = false;
    excluir.addEventListener('click', function () {
      if (!pendente) {
        pendente = true;
        excluir.textContent = 'Sim, excluir minha conta';
        avisoTexto('A exclusão remove seus dados pessoais e encerra sua sessão. Os resultados ficam sem identificação, para a estatística da disciplina. Clique de novo para confirmar.', 'erro');
        return;
      }
      window.API.del('/api/me').then(function () {
        window.location.href = 'login.html';
      }).catch(function (err) {
        avisoTexto(err.message, 'erro');
      });
    });
  }
})();
