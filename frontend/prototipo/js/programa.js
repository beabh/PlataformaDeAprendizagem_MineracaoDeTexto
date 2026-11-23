/* Página do programa: mostra a situação de cada módulo com ícone, texto e motivo.
   Princípios aplicados: visibilidade do progresso, feedback imediato, explicação de bloqueios
   e confirmação em duas etapas para ações destrutivas. */
(function () {
  'use strict';

  var PROVA_TEXTO = { concluida: 'Aprovada', atual: 'Pode fazer', bloqueada: 'Bloqueada' };
  var PROVA_TIPO = { concluida: 'concluido', atual: 'disponivel', bloqueada: 'bloqueado' };

  function avisar(texto, tipo) {
    var aviso = document.getElementById('aviso-acao');
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.className = 'mensagem ' + (tipo || 'info');
    aviso.hidden = false;
  }

  function anteriorGatilho(id) {
    var lista = window.PLN.CATALOGO.filter(function (m) { return m.tipo === 'modulo'; });
    var pos = lista.findIndex(function (m) { return m.id === id; });
    return pos > 0 ? lista[pos - 1] : null;
  }

  function celulaComTexto(texto, classe) {
    var p = document.createElement('p');
    p.className = classe || 'apoio';
    p.textContent = texto;
    return p;
  }

  function mini(percentual) {
    var b = document.createElement('div');
    b.className = 'progresso mini';
    b.setAttribute('role', 'img');
    b.setAttribute('aria-label', percentual + '% concluído');
    var s = document.createElement('span');
    s.style.width = percentual + '%';
    b.appendChild(s);
    return b;
  }

  function preencher(celula, nodes) {
    celula.innerHTML = '';
    nodes.forEach(function (n) { celula.appendChild(n); });
  }

  // Um botão por módulo: Começar/Continuar (principal), Revisar (secundário) ou Bloqueado (desabilitado)
  function botaoDeAcao(id, tipo, concluidas) {
    var a;
    if (tipo === 'disponivel' || tipo === 'andamento') {
      var prox = window.PLN.proximaAulaDoModulo(id);
      var iniciou = concluidas > 0;
      a = document.createElement('a');
      a.href = prox ? 'aula.html?aula=' + encodeURIComponent(prox) : 'trilha.html#u-' + id;
      a.className = 'btn btn-primario btn-compacto';
      a.textContent = prox ? (iniciou ? 'Continuar' : 'Começar') : 'Revisar';
      a.setAttribute('data-manter-sessao', '');
      a.setAttribute('aria-label', (prox ? (iniciou ? 'Continuar o módulo ' : 'Começar o módulo ') : 'Revisar o módulo ') + id);
      return a;
    }
    if (tipo === 'concluido') {
      a = document.createElement('a');
      a.href = 'trilha.html#u-' + id;
      a.className = 'btn btn-secundario btn-compacto';
      a.textContent = 'Revisar';
      a.setAttribute('data-manter-sessao', '');
      a.setAttribute('aria-label', 'Revisar o módulo ' + id);
      return a;
    }
    a = document.createElement('span');
    a.className = 'btn-fantasma btn-compacto';
    a.setAttribute('aria-disabled', 'true');
    a.textContent = 'Bloqueado';
    return a;
  }

  function atualizar() {
    var P = window.PLN;

    document.querySelectorAll('tr[data-modulo]').forEach(function (linha) {
      var id = linha.getAttribute('data-modulo');
      var m = P.moduloPorId(id);
      var total = m.aulas.length;
      var concluidas = m.aulas.filter(function (a) { return P.aulaConcluida(a.cod); }).length;
      var pct = total ? Math.round((concluidas / total) * 100) : 0;

      // Aulas: contagem e barra de progresso
      preencher(linha.querySelector('[data-aulas]'), [
        (function () { var s = document.createElement('span'); s.textContent = concluidas + ' de ' + total; return s; })(),
        mini(pct)
      ]);

      // Prova
      var celProva = linha.querySelector('[data-prova]');
      if (m.prova) {
        var estado = P.estadoProva(id);
        var nodesProva = [UI.selo(PROVA_TIPO[estado], PROVA_TEXTO[estado])];
        if (estado === 'bloqueada' && concluidas < total) {
          nodesProva.push(celulaComTexto('Termine as ' + (total - concluidas) + ' aula(s) restante(s).'));
        }
        preencher(celProva, nodesProva);
      } else {
        celProva.textContent = '—';
      }

      // Situação e motivo
      var tipoSit = P.estadoModulo(id);
      var nodesSit = [UI.selo(tipoSit)];
      if (tipoSit === 'bloqueado') {
        var ant = anteriorGatilho(id);
        nodesSit.push(celulaComTexto(ant ? 'Conclua a prova do módulo ' + ant.id + ' para liberar.' : 'Conclua o módulo anterior para liberar.'));
      } else if (tipoSit === 'disponivel') {
        nodesSit.push(celulaComTexto('Pronto para começar. Abra a primeira aula.'));
      } else if (tipoSit === 'andamento') {
        nodesSit.push(celulaComTexto('Continue de onde parou.'));
      } else if (tipoSit === 'concluido') {
        nodesSit.push(celulaComTexto('Módulo concluído.'));
      }
      preencher(linha.querySelector('[data-status]'), nodesSit);

      // Ação: um único botão por linha, sempre na mesma coluna
      var celAcao = linha.querySelector('[data-acao]');
      if (celAcao) preencher(celAcao, [botaoDeAcao(id, tipoSit, concluidas)]);

      // Link do tema: só abre módulos liberados
      var link = linha.querySelector('[data-link-modulo]');
      if (P.moduloLiberado(id)) {
        link.setAttribute('href', 'trilha.html#u-' + id);
        link.removeAttribute('aria-disabled');
      } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
      }
    });
  }

  function ligarEventos() {
    // Clique em módulo bloqueado: explica o motivo em vez de falhar em silêncio
    document.querySelectorAll('a[data-link-modulo]').forEach(function (link) {
      link.addEventListener('click', function (ev) {
        var id = link.getAttribute('data-link-modulo');
        if (!window.PLN.moduloLiberado(id)) {
          ev.preventDefault();
          var ant = anteriorGatilho(id);
          avisar('O módulo ' + id + ' ainda está bloqueado. ' +
            (ant ? 'Aprove a prova do módulo ' + ant.id + ' para liberá-lo.' : 'Conclua o módulo anterior.'), 'erro');
        }
      });
    });

    // Zerar progresso: confirmação em duas etapas, porque a ação não pode ser desfeita
    var zerar = document.querySelector('[data-zerar]');
    var cancelar = document.querySelector('[data-cancelar-zerar]');
    if (zerar) {
      var pendente = false;
      zerar.addEventListener('click', function () {
        if (!pendente) {
          pendente = true;
          zerar.textContent = 'Sim, apagar meu progresso';
          zerar.className = 'btn btn-escuro';
          if (cancelar) cancelar.hidden = false;
          avisar('Esta ação apaga aulas, provas e XP salvos neste navegador. Confirme se tiver certeza.', 'erro');
          return;
        }
        window.PLN.zerar();
        pendente = false;
        zerar.textContent = 'Zerar progresso deste protótipo';
        zerar.className = 'btn-fantasma';
        if (cancelar) cancelar.hidden = true;
        atualizar();
        avisar('Progresso apagado neste navegador.', 'ok');
      });
      if (cancelar) {
        cancelar.addEventListener('click', function () {
          pendente = false;
          zerar.textContent = 'Zerar progresso deste protótipo';
          zerar.className = 'btn-fantasma';
          cancelar.hidden = true;
          avisar('Nada foi apagado.', 'info');
        });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    atualizar();
    ligarEventos();
  });
})();
