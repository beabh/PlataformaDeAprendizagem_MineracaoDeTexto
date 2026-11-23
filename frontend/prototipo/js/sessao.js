/* Preenche dados do estudante a partir da URL (simulação do protótipo).
   Não há autenticação real: os valores vêm de ?nome= e ?meta=, usando textContent. */
(function () {
  'use strict';

  function parametros() {
    var p = {};
    new URLSearchParams(window.location.search).forEach(function (v, k) { p[k] = v; });
    return p;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var p = parametros();
    var nome = (p.nome || '').trim().slice(0, 60) || 'Estudante';
    var meta = /^(10|15|30)$/.test(p.meta || '') ? p.meta : '15';

    document.querySelectorAll('[data-nome]').forEach(function (el) { el.textContent = nome; });
    document.querySelectorAll('[data-meta]').forEach(function (el) { el.textContent = meta + ' minutos'; });

    // Acrescenta nome e meta aos links internos da área logada, preservando os demais parâmetros (ex.: ?aula=1.2).
    document.querySelectorAll('a[data-manter-sessao]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      var u = new URL(href, window.location.href);
      u.searchParams.set('nome', nome);
      u.searchParams.set('meta', meta);
      var arquivo = u.pathname.split('/').pop();
      a.setAttribute('href', arquivo + u.search + u.hash);
    });
  });
})();
