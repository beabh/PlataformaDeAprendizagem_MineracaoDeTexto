/* Preenche o painel do estudante com o progresso salvo no navegador. */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var P = window.PLN;
    var unidades = P.unidadesConcluidas();

    document.querySelectorAll('[data-unidades-concluidas]').forEach(function (el) { el.textContent = String(unidades); });
    document.querySelectorAll('[data-sequencia]').forEach(function (el) { el.textContent = String(P.sequencia()); });
    document.querySelectorAll('[data-xp]').forEach(function (el) { el.textContent = String(P.xp()); });
    document.querySelectorAll('[data-tentativas]').forEach(function (el) { el.textContent = String(P.totalTentativas()); });

    var pct = Math.round((unidades / 10) * 100);
    document.querySelectorAll('[data-barra]').forEach(function (el) { el.style.width = pct + '%'; });
    var barra = document.querySelector('[role="progressbar"]');
    if (barra) barra.setAttribute('aria-valuenow', String(unidades));

    var proxima = P.proximaAula();
    var titulo = document.querySelector('[data-proxima-titulo]');
    var modulo = document.querySelector('[data-proxima-modulo]');
    var texto = document.querySelector('[data-proxima-texto]');
    var link = document.querySelector('[data-proxima-link]');
    if (!proxima) {
      if (titulo) titulo.textContent = 'Todas as aulas concluídas';
      if (texto) texto.textContent = 'Faça as provas que ainda estiverem pendentes na trilha.';
      if (link) link.setAttribute('href', 'trilha.html');
      return;
    }
    if (modulo) modulo.textContent = proxima.modulo.tipo === 'preparacao' ? 'Python' : 'Unidade ' + proxima.modulo.id;
    if (titulo) titulo.textContent = proxima.aula.cod + ' · ' + proxima.aula.titulo;
    if (texto) texto.textContent = proxima.modulo.titulo + '.';
    if (link) link.setAttribute('href', 'aula.html?aula=' + encodeURIComponent(proxima.aula.cod));
  });
})();
