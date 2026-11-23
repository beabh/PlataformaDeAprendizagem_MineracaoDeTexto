/* Página da prova do módulo: exibe as questões, corrige e registra o resultado.
   Usa textContent para todo conteúdo dinâmico. */
(function () {
  'use strict';

  function el(tag, attrs, texto) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function mensagem(area, texto, tipo, extra) {
    area.innerHTML = '';
    var box = el('div', { class: 'card', role: 'status' });
    box.appendChild(el('p', null, texto));
    if (extra) box.appendChild(extra);
    area.appendChild(box);
  }

  function linkTrilha(texto) {
    var a = el('a', { class: 'btn btn-escuro', href: 'trilha.html' }, texto || 'Voltar à trilha');
    a.setAttribute('data-manter-sessao', '');
    return a;
  }

  function desenharFormulario(id, area, resumo) {
    var prova = window.PROVAS[id];
    area.innerHTML = '';
    var form = el('form', { class: 'formulario', novalidate: '' });
    form.style.maxWidth = 'none';

    prova.questoes.forEach(function (q, i) {
      var fs = el('fieldset', { class: 'questao', id: 'q-' + i });
      fs.appendChild(el('legend', null, (i + 1) + '. ' + q.enunciado));
      q.opcoes.forEach(function (texto, j) {
        var lab = el('label', { class: 'opcao' });
        var input = el('input', { type: 'radio', name: 'q' + i, value: String(j) });
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(' ' + texto));
        fs.appendChild(lab);
      });
      var fb = el('div', { class: 'feedback', hidden: '' });
      fb.setAttribute('data-feedback', String(i));
      fs.appendChild(fb);
      form.appendChild(fs);
    });

    var botoes = el('div', { class: 'acoes' });
    botoes.appendChild(el('button', { class: 'btn btn-escuro', type: 'submit' }, 'Corrigir prova'));
    form.appendChild(botoes);
    var placar = el('p', { role: 'status', 'data-placar': '' });
    placar.style.marginTop = '.8rem';
    form.appendChild(placar);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var respostas = prova.questoes.map(function (q, i) {
        var marcada = form.querySelector('input[name="q' + i + '"]:checked');
        return marcada ? parseInt(marcada.value, 10) : null;
      });
      var faltam = respostas.filter(function (r) { return r === null; }).length;
      if (faltam > 0) {
        placar.className = 'mensagem erro';
        placar.textContent = 'Responda todas as questões antes de corrigir. Faltam ' + faltam + '.';
        return;
      }

      var acertos = 0;
      prova.questoes.forEach(function (q, i) {
        var f = form.querySelector('[data-feedback="' + i + '"]');
        var ok = respostas[i] === q.correta;
        if (ok) acertos += 1;
        f.hidden = false;
        f.className = 'feedback ' + (ok ? 'ok' : 'erro');
        f.textContent = (ok ? 'Correta. ' : 'Incorreta. ') + 'Resposta certa: ' + q.opcoes[q.correta] + '. ' + q.explicacao;
        form.querySelectorAll('input[name="q' + i + '"]').forEach(function (inp) { inp.disabled = true; });
      });

      var registro = window.PLN.registrarProva(id, acertos, prova.questoes.length);
      var minimo = Math.ceil(window.PLN.APROVACAO * prova.questoes.length);
      placar.className = 'mensagem ' + (acertos >= minimo ? 'ok' : 'erro');
      placar.textContent = 'Você acertou ' + acertos + ' de ' + prova.questoes.length + '. ' +
        (acertos >= minimo
          ? 'Prova aprovada. O próximo módulo já está liberado na trilha.'
          : 'Não atingiu o mínimo de ' + minimo + '. Você pode refazer a prova.') +
        (registro ? ' Tentativa ' + registro.tentativas + '.' : '');

      var refazer = el('button', { class: 'btn-fantasma', type: 'button', style: 'margin-top:.8rem' }, 'Refazer a prova');
      refazer.addEventListener('click', function () { desenharFormulario(id, area, resumo); });
      placar.parentNode.appendChild(refazer);
      if (acertos >= minimo) placar.parentNode.appendChild(linkTrilha('Ir para a trilha'));
    });

    area.appendChild(form);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var titulo = document.getElementById('titulo-prova');
    var resumo = document.getElementById('resumo-prova');
    var area = document.getElementById('area-prova');
    var id = new URLSearchParams(window.location.search).get('modulo') || '';
    var modulo = window.PLN.moduloPorId(id);

    if (!modulo || !modulo.prova) {
      titulo.textContent = 'Prova não encontrada';
      resumo.textContent = 'Este módulo não tem prova.';
      mensagem(area, 'Verifique o link ou volte à trilha para escolher um módulo.', 'erro', linkTrilha());
      return;
    }

    var banco = window.PROVAS[id];
    titulo.textContent = banco ? banco.titulo : 'Prova do Módulo ' + id + ' · ' + modulo.titulo;
    resumo.textContent = banco
      ? banco.questoes.length + ' questões de múltipla escolha. Mínimo para aprovação: ' +
        Math.ceil(window.PLN.APROVACAO * banco.questoes.length) + '.'
      : 'Prova ainda não disponível.';

    if (!banco) {
      mensagem(area, 'O banco de questões deste módulo ainda está em elaboração.', 'info', linkTrilha());
      return;
    }

    if (!window.PLN.provaLiberada(id)) {
      mensagem(area, 'A prova libera quando todas as aulas do módulo forem concluídas.', 'info', linkTrilha('Voltar à trilha para estudar'));
      return;
    }

    desenharFormulario(id, area, resumo);

    if (window.PLN.provaAprovada(id)) {
      var p = window.PLN.estado().provas[id];
      var aviso = el('p', { class: 'mensagem ok' }, 'Você já foi aprovado nesta prova (melhor resultado: ' + p.melhor + ' de ' + banco.questoes.length + '). Você pode refazê-la.');
      area.insertBefore(aviso, area.firstChild);
    }
  });
})();
