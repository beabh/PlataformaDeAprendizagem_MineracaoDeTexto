/* Classificação da turma, vinda de /api/ranking. Mostra nome abreviado e pontuação; nenhum dado pessoal extra. */
(function () {
  'use strict';

  function el(tag, attrs, texto) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  function preencher(itens) {
    var corpo = document.getElementById('corpo-ranking');
    corpo.innerHTML = '';
    if (!itens.length) {
      var vazio = el('tr');
      vazio.appendChild(el('td', { colspan: '5' }, 'Ainda não há estudantes na turma.'));
      corpo.appendChild(vazio);
      return;
    }
    itens.forEach(function (i) {
      var linha = el('tr', i.eu ? { class: 'linha-voce' } : null);
      linha.appendChild(el('td', null, String(i.posicao)));
      var nome = el('td');
      nome.appendChild(el('strong', null, i.nome));
      if (i.eu) {
        nome.appendChild(document.createTextNode(' '));
        nome.appendChild(el('span', { class: 'selo destaque' }, 'sua linha'));
      }
      linha.appendChild(nome);
      linha.appendChild(el('td', null, String(i.total)));
      linha.appendChild(el('td', null, String(i.aulas)));
      linha.appendChild(el('td', null, String(i.provas)));
      corpo.appendChild(linha);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.API.get('/api/ranking').then(function (r) {
      preencher(r.itens);
    }).catch(function (err) {
      var corpo = document.getElementById('corpo-ranking');
      corpo.innerHTML = '';
      var linha = el('tr');
      linha.appendChild(el('td', { colspan: '5' }, err.message));
      corpo.appendChild(linha);
    });
  });
})();
