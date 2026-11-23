/* Filtro simples do glossário: mostra os termos cujo nome ou definição contém o texto digitado. */
(function () {
  'use strict';

  function normalizar(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var busca = document.getElementById('busca');
    var termos = document.querySelectorAll('#lista-termos .termo');
    var vazio = document.getElementById('sem-resultado');
    if (!busca) return;

    busca.addEventListener('input', function () {
      var q = normalizar(busca.value.trim());
      var visiveis = 0;
      termos.forEach(function (t) {
        var texto = normalizar(t.textContent);
        var mostra = q === '' || texto.indexOf(q) >= 0;
        t.hidden = !mostra;
        if (mostra) visiveis += 1;
      });
      vazio.hidden = visiveis > 0;
    });
  });
})();
