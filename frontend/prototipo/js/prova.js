/* Página da prova do módulo. As questões e o gabarito ficam no servidor:
   o navegador envia as respostas e recebe a correção (/api/provas/{modulo}). */
(function () {
  'use strict';

  var modulo = new URLSearchParams(window.location.search).get('modulo') || '';

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

  function desenharFormulario(prova, area, aprovadaAntes) {
    area.innerHTML = '';
    var form = el('form', { class: 'formulario', novalidate: '' });
    form.style.maxWidth = 'none';

    prova.questoes.forEach(function (q, i) {
      var fs = el('fieldset', { class: 'questao', id: 'q-' + i });
      fs.appendChild(el('legend', null, (i + 1) + '. ' + q.enunciado));
      q.opcoes.forEach(function (texto, j) {
        var lab = el('label', { class: 'opcao' });
        lab.appendChild(el('input', { type: 'radio', name: 'q' + i, value: String(j) }));
        lab.appendChild(document.createTextNode(' ' + texto));
        fs.appendChild(lab);
      });
      var fb = el('div', { class: 'feedback', hidden: '' });
      fb.setAttribute('data-feedback', String(i));
      fs.appendChild(fb);
      form.appendChild(fs);
    });

    var botoes = el('div', { class: 'acoes' });
    var corrigir = el('button', { class: 'btn btn-escuro', type: 'submit' }, 'Corrigir prova');
    if (aprovadaAntes) corrigir.disabled = true;
    botoes.appendChild(corrigir);
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
      corrigir.disabled = true;
      window.API.post('/api/provas/' + encodeURIComponent(modulo) + '/tentativas', { respostas: respostas }).then(function (r) {
        mostrarResultado(form, prova, r, placar, area);
      }).catch(function (err) {
        placar.className = 'mensagem erro';
        placar.textContent = err.message;
        corrigir.disabled = aprovadaAntes;
      });
    });

    area.appendChild(form);
  }

  function mostrarResultado(form, prova, r, placar, area) {
    r.detalhe.forEach(function (d) {
      var f = form.querySelector('[data-feedback="' + (d.ordem - 1) + '"]');
      f.hidden = false;
      f.className = 'feedback ' + (d.acertou ? 'ok' : 'erro');
      f.textContent = (d.acertou ? 'Correta. ' : 'Incorreta. ') + 'Resposta certa: ' +
        prova.questoes[d.ordem - 1].opcoes[d.correta] + '. ' + d.explicacao;
      form.querySelectorAll('input[name="q' + (d.ordem - 1) + '"]').forEach(function (inp) { inp.disabled = true; });
    });

    placar.className = 'mensagem ' + (r.aprovada ? 'ok' : 'erro');
    placar.textContent = 'Você acertou ' + r.acertos + ' de ' + r.total + '. ' +
      (r.aprovada
        ? 'Prova aprovada. O próximo módulo já está liberado na trilha.'
        : 'Não atingiu o mínimo de ' + r.minimo + '. Você pode refazer a prova.') +
      (r.ganho ? ' Você ganhou ' + r.ganho + ' pontos.' : '');

    if (!r.aprovada) {
      var refazer = el('button', { class: 'btn-fantasma', type: 'button', style: 'margin-top:.8rem' }, 'Refazer a prova');
      refazer.addEventListener('click', function () { window.location.reload(); });
      placar.parentNode.appendChild(refazer);
    } else {
      placar.parentNode.appendChild(linkTrilha('Ir para a trilha'));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var titulo = document.getElementById('titulo-prova');
    var resumo = document.getElementById('resumo-prova');
    var area = document.getElementById('area-prova');

    window.API.get('/api/provas/' + encodeURIComponent(modulo)).then(function (prova) {
      titulo.textContent = 'Prova do Módulo ' + prova.modulo.codigo + ' · ' + prova.modulo.titulo;
      resumo.textContent = prova.total + ' questões de múltipla escolha. Mínimo para aprovação: ' + prova.minimo + '.';
      if (prova.aprovada) {
        area.appendChild(el('p', { class: 'mensagem ok' }, 'Você já foi aprovado nesta prova (melhor resultado: ' + prova.melhor + ' de ' + prova.total + ').'));
      }
      var form = el('div');
      area.appendChild(form);
      desenharFormulario(prova, form, prova.aprovada);
    }).catch(function (err) {
      if (err.status === 403) {
        titulo.textContent = 'Prova ainda não liberada';
        resumo.textContent = err.message;
        mensagem(area, 'Conclua as aulas do módulo para liberar a prova.', 'info', linkTrilha('Voltar à trilha para estudar'));
      } else if (err.status === 404) {
        titulo.textContent = 'Prova não encontrada';
        resumo.textContent = 'Este módulo não tem prova.';
        mensagem(area, 'Verifique o link ou volte à trilha para escolher um módulo.', 'erro', linkTrilha());
      } else {
        mensagem(area, err.message, 'erro', linkTrilha());
      }
    });
  });
})();
