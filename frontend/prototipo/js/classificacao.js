/* Classificação (protótipo): mostra só a linha do próprio estudante, com os pontos salvos neste navegador.
   Na versão final, a tabela vem do servidor, ordenada pela pontuação total. */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var P = window.PLN;
    var t = P.totais();
    var aulas = P.aulasConcluidasTotal();
    var provas = P.CATALOGO.filter(function (m) { return m.prova && P.provaAprovada(m.id); }).length;

    var total = document.querySelector('[data-total-voce]');
    if (total) total.textContent = String(t.total);
    var aulasEl = document.querySelector('[data-aulas-voce]');
    if (aulasEl) aulasEl.textContent = String(aulas);
    var provasEl = document.querySelector('[data-provas-voce]');
    if (provasEl) provasEl.textContent = String(provas);
  });
})();
