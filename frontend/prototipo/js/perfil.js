/* Página de perfil: carrega e grava nome de exibição, meta e curso neste navegador (protótipo). */
(function () {
  'use strict';

  var form = document.getElementById('form-perfil');
  if (!form || !window.PLNPerfil) return;

  var nome = document.getElementById('perfil-nome');
  var meta = document.getElementById('perfil-meta');
  var curso = document.getElementById('perfil-curso');
  var aviso = document.getElementById('aviso-perfil');
  var textoPadrao = aviso ? aviso.textContent : '';

  // Preenche os campos com o que já foi salvo.
  var salvo = window.PLNPerfil.ler();
  if (salvo.nome) nome.value = salvo.nome;
  if (salvo.meta && meta.querySelector('option[value="' + salvo.meta + '"]')) meta.value = salvo.meta;
  if (salvo.curso) curso.value = salvo.curso;

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var dados = {
      nome: nome.value.trim().slice(0, 60),
      meta: meta.value,
      curso: curso.value.trim().slice(0, 80)
    };
    var ok = window.PLNPerfil.gravar(dados);
    if (aviso) {
      aviso.textContent = ok
        ? 'Perfil salvo. ' + (dados.nome ? 'O menu agora mostra "' + dados.nome + '".' : 'Sem nome, o menu mostra "Estudante".')
        : 'Não foi possível salvar neste navegador. ' + textoPadrao;
    }
  });
})();
