/* Painel do estudante: indicadores e próxima aula, vindos de /api/trilha. */
(function () {
  'use strict';

  function preencherIndicadores(t) {
    var modulosDeConteudo = t.modulos.filter(function (m) { return m.tipo === 'modulo'; });
    var provasAprovadas = t.modulos.filter(function (m) { return m.prova && m.prova.aprovada; }).length;

    document.querySelectorAll('[data-unidades-concluidas]').forEach(function (el) { el.textContent = String(t.unidades_concluidas); });
    document.querySelectorAll('[data-sequencia]').forEach(function (el) { el.textContent = String(t.sequencia); });
    document.querySelectorAll('[data-xp]').forEach(function (el) { el.textContent = String(t.pontos.total); });
    document.querySelectorAll('[data-tentativas]').forEach(function (el) { el.textContent = String(provasAprovadas); });

    var pct = modulosDeConteudo.length ? Math.round((t.unidades_concluidas / modulosDeConteudo.length) * 100) : 0;
    document.querySelectorAll('[data-barra]').forEach(function (el) { el.style.width = pct + '%'; });
    var barra = document.querySelector('[role="progressbar"]');
    if (barra) barra.setAttribute('aria-valuenow', String(t.unidades_concluidas));
  }

  function preencherProxima(proxima) {
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
    if (modulo) modulo.textContent = proxima.modulo_codigo === 'P' ? 'Python' : 'Unidade ' + proxima.modulo_codigo;
    if (titulo) titulo.textContent = proxima.codigo + ' · ' + proxima.titulo;
    if (texto) texto.textContent = proxima.modulo_titulo + '.';
    if (link) link.setAttribute('href', 'aula.html?aula=' + encodeURIComponent(proxima.codigo));
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.API.get('/api/trilha').then(function (t) {
      preencherIndicadores(t);
      preencherProxima(t.proxima_aula);
    }).catch(function () { /* a tela continua com os textos padrão */ });
  });
})();
