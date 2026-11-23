/* Trilha de aprendizagem: aplica o estado que o servidor calcula a cada aula, prova e módulo.
   A tela não decide nada sozinha: só mostra o que /api/trilha devolve. */
(function () {
  'use strict';

  var ICONE = {
    play: '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    check: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cadeado: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    estrela: '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8-4.2-4.1 5.8-.8z"/></svg>'
  };

  var ESTADO = {
    concluida: { classe: 'concluido', texto: 'concluída' },
    atual: { classe: 'atual', texto: 'disponível agora' },
    bloqueada: { classe: 'bloqueado', texto: 'bloqueada' }
  };

  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
    if (est.classe === 'bloqueado') a.setAttribute('aria-disabled', 'true');
    else a.removeAttribute('aria-disabled');
  }

  function aplicar(trilha) {
    var aulas = {}, provas = {}, modulos = {};
    trilha.modulos.forEach(function (m) {
      modulos[m.codigo] = m;
      if (m.prova) provas[m.codigo] = m.prova;
      m.aulas.forEach(function (a) { aulas[a.codigo] = a; });
    });

    document.querySelectorAll('a[data-codigo]').forEach(function (a) {
      var cod = a.getAttribute('data-codigo');
      var aula = aulas[cod];
      if (!aula) return;
      var est = ESTADO[aula.estado] || ESTADO.bloqueada;
      var icone = aula.estado === 'concluida' ? ICONE.check : (aula.estado === 'atual' ? ICONE.play : ICONE.cadeado);
      pintar(a, est, icone, 'Aula ' + cod + ': ' + aula.titulo + '. ' + capital(est.texto) + '.');
      if (aula.estado === 'bloqueada') {
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          avisar('A aula ' + cod + ' está bloqueada. Conclua a aula anterior para liberá-la.');
        });
      }
    });

    document.querySelectorAll('a[data-prova]').forEach(function (a) {
      var id = a.getAttribute('data-prova');
      var prova = provas[id];
      if (!prova) return;
      var est = ESTADO[prova.estado] || ESTADO.bloqueada;
      var icone = prova.estado === 'bloqueada' ? ICONE.cadeado : ICONE.estrela;
      pintar(a, est, icone, 'Prova do módulo ' + id + '. ' + capital(est.texto) + '.');
      if (prova.estado === 'bloqueada') {
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          avisar('A prova do módulo ' + id + ' libera quando todas as aulas do módulo estiverem concluídas.');
        });
      }
    });

    document.querySelectorAll('section[data-unidade]').forEach(function (sec) {
      var m = modulos[sec.getAttribute('data-unidade')];
      sec.classList.toggle('unidade-concluida', !!m && m.estado === 'concluido');
    });

    var fixos = {
      'sequencia': trilha.sequencia,
      'aulas-concluidas': trilha.aulas_concluidas,
      'unidades-concluidas': trilha.unidades_concluidas
    };
    Object.keys(fixos).forEach(function (k) {
      document.querySelectorAll('[data-' + k + ']').forEach(function (el) { el.textContent = String(fixos[k]); });
    });

    var p = trilha.pontos;
    var valores = { 'pontos-ganhos': '+' + p.ganhos, 'pontos-perdas': '−' + p.perdas, 'pontos-total': String(p.total) };
    Object.keys(valores).forEach(function (k) {
      document.querySelectorAll('[data-' + k + ']').forEach(function (el) { el.textContent = valores[k]; });
    });

    document.querySelectorAll('[data-unidade-pontos]').forEach(function (bloco) {
      var m = modulos[bloco.getAttribute('data-unidade-pontos')];
      if (!m) return;
      var g = bloco.querySelector('[data-ganhos-unidade]');
      var pe = bloco.querySelector('[data-perdas-unidade]');
      if (g) g.textContent = '+' + m.pontos.ganhos;
      if (pe) pe.textContent = '−' + m.pontos.perdas;
    });
  }

  function posicaoNaTurma() {
    window.API.get('/api/ranking').then(function (r) {
      var eu = r.itens.filter(function (i) { return i.eu; })[0];
      document.querySelectorAll('[data-posicao]').forEach(function (el) {
        el.textContent = eu ? String(eu.posicao) : '—';
      });
    }).catch(function () { /* a posição é informativa */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.API.get('/api/trilha').then(aplicar).catch(function (err) {
      avisar(err.message);
    });
    posicaoNaTurma();
  });
})();
