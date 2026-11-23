/* Aplica o estado de cada nó da trilha (concluída, disponível, bloqueada) e os indicadores de progresso. */
(function () {
  'use strict';

  var ICONE = {
    // Ícones preenchidos, para destacar o estado do nó
    play: '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    check: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cadeado: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    estrela: '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8-4.2-4.1 5.8-.8z"/></svg>'
  };

  var ESTADO = {
    concluida: { classe: 'concluido', icone: ICONE.check, texto: 'concluída' },
    atual: { classe: 'atual', icone: ICONE.play, texto: 'disponível agora' },
    bloqueada: { classe: 'bloqueado', icone: ICONE.cadeado, texto: 'bloqueada' }
  };

  function avisar(texto) {
    var aviso = document.getElementById('aviso-acao');
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.hidden = false;
  }

  function pintar(a, est, icone, rotuloAria) {
    a.className = a.className.replace(/\b(concluido|atual|bloqueado)\b/g, '').trim();
    a.classList.add(est.classe);
    a.innerHTML = '';
    var span = document.createElement('span');
    span.className = 'codigo';
    span.innerHTML = icone;
    a.appendChild(span);
    a.setAttribute('aria-label', rotuloAria);
    if (est.classe === 'bloqueado') {
      a.setAttribute('aria-disabled', 'true');
    } else {
      a.removeAttribute('aria-disabled');
    }
  }

  function aplicarAula(a) {
    var P = window.PLN;
    var cod = a.getAttribute('data-codigo');
    var loc = P.localizarAula(cod);
    var chave = P.estadoAula(cod);
    var est = ESTADO[chave];
    var icone = chave === 'atual' ? ICONE.play : (chave === 'concluida' ? ICONE.check : ICONE.cadeado);
    pintar(a, est, icone, 'Aula ' + cod + ': ' + loc.aula.titulo + '. ' + est.texto.charAt(0).toUpperCase() + est.texto.slice(1) + '.');
    if (chave === 'bloqueada') {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        avisar('A aula ' + cod + ' está bloqueada. Conclua a aula anterior para liberá-la.');
      });
    }
  }

  function aplicarProva(a) {
    var P = window.PLN;
    var id = a.getAttribute('data-prova');
    var chave = P.estadoProva(id);
    var est = ESTADO[chave];
    var icone = chave === 'concluida' ? ICONE.estrela : (chave === 'atual' ? ICONE.estrela : ICONE.cadeado);
    pintar(a, est, icone, 'Prova do módulo ' + id + '. ' + est.texto.charAt(0).toUpperCase() + est.texto.slice(1) + '.');
    if (chave === 'bloqueada') {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        avisar('A prova do módulo ' + id + ' libera quando todas as aulas do módulo estiverem concluídas.');
      });
    }
  }

  function atualizarIndicadores() {
    var P = window.PLN;
    var mapa = {
      'sequencia': P.sequencia(),
      'xp': P.xp(),
      'aulas-concluidas': P.aulasConcluidasTotal(),
      'unidades-concluidas': P.unidadesConcluidas()
    };
    Object.keys(mapa).forEach(function (k) {
      document.querySelectorAll('[data-' + k + ']').forEach(function (el) { el.textContent = String(mapa[k]); });
    });

    // Painel de pontos: ganhos, perdidos e total
    var t = P.totais();
    var valores = { 'pontos-ganhos': '+' + t.ganhos, 'pontos-perdas': '−' + t.perdas, 'pontos-total': String(t.total) };
    Object.keys(valores).forEach(function (k) {
      document.querySelectorAll('[data-' + k + ']').forEach(function (el) { el.textContent = valores[k]; });
    });

    // Pontos de cada unidade
    document.querySelectorAll('[data-unidade-pontos]').forEach(function (bloco) {
      var pu = P.pontosDaUnidade(bloco.getAttribute('data-unidade-pontos'));
      var g = bloco.querySelector('[data-ganhos-unidade]');
      var p = bloco.querySelector('[data-perdas-unidade]');
      if (g) g.textContent = '+' + pu.ganhos;
      if (p) p.textContent = '−' + pu.perdas;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var P = window.PLN;

    document.querySelectorAll('a[data-codigo]').forEach(aplicarAula);
    document.querySelectorAll('a[data-prova]').forEach(aplicarProva);

    document.querySelectorAll('section[data-unidade]').forEach(function (sec) {
      var id = sec.getAttribute('data-unidade');
      sec.classList.toggle('unidade-concluida', P.estadoModulo(id) === 'concluido');
    });

    atualizarIndicadores();
  });
})();
