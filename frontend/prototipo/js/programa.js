/* Página do programa: situação de cada módulo, com motivo e ação única por linha.
   Os estados vêm de /api/trilha. */
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

  function celulaComTexto(texto) {
    var p = document.createElement('p');
    p.className = 'apoio';
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
  function botaoDeAcao(m) {
    var proxima = m.aulas.filter(function (a) { return a.estado !== 'concluida'; })[0];
    var a;
    if (m.estado === 'disponivel' || m.estado === 'andamento') {
      a = document.createElement('a');
      a.href = proxima ? 'aula.html?aula=' + encodeURIComponent(proxima.codigo) : 'trilha.html#u-' + m.codigo;
      a.className = 'btn btn-primario btn-compacto';
      a.textContent = proxima ? (m.aulas_concluidas > 0 ? 'Continuar' : 'Começar') : 'Revisar';
      a.setAttribute('data-manter-sessao', '');
      a.setAttribute('aria-label', (proxima ? (m.aulas_concluidas > 0 ? 'Continuar o módulo ' : 'Começar o módulo ') : 'Revisar o módulo ') + m.codigo);
      return a;
    }
    if (m.estado === 'concluido') {
      a = document.createElement('a');
      a.href = 'trilha.html#u-' + m.codigo;
      a.className = 'btn btn-secundario btn-compacto';
      a.textContent = 'Revisar';
      a.setAttribute('data-manter-sessao', '');
      a.setAttribute('aria-label', 'Revisar o módulo ' + m.codigo);
      return a;
    }
    a = document.createElement('span');
    a.className = 'btn-fantasma btn-compacto';
    a.setAttribute('aria-disabled', 'true');
    a.textContent = 'Bloqueado';
    return a;
  }

  function atualizar(trilha) {
    var modulos = {};
    var ordem = trilha.modulos.filter(function (m) { return m.tipo === 'modulo'; });
    trilha.modulos.forEach(function (m) { modulos[m.codigo] = m; });

    document.querySelectorAll('tr[data-modulo]').forEach(function (linha) {
      var id = linha.getAttribute('data-modulo');
      var m = modulos[id];
      if (!m) return;
      var total = m.aulas.length;
      var concluidas = m.aulas_concluidas;
      var pct = total ? Math.round((concluidas / total) * 100) : 0;

      preencher(linha.querySelector('[data-aulas]'), [
        (function () { var s = document.createElement('span'); s.textContent = concluidas + ' de ' + total; return s; })(),
        mini(pct)
      ]);

      var celProva = linha.querySelector('[data-prova]');
      if (m.prova) {
        var estado = m.prova.estado;
        var nodes = [UI.selo(PROVA_TIPO[estado], PROVA_TEXTO[estado])];
        if (estado === 'bloqueada' && concluidas < total) {
          nodes.push(celulaComTexto('Termine as ' + (total - concluidas) + ' aula(s) restante(s).'));
        }
        preencher(celProva, nodes);
      } else {
        celProva.textContent = '—';
      }

      var nodesSit = [UI.selo(m.estado)];
      var idx = ordem.indexOf(m);
      var anterior = idx > 0 ? ordem[idx - 1] : null;
      if (m.estado === 'bloqueado') {
        nodesSit.push(celulaComTexto(anterior ? 'Conclua a prova do módulo ' + anterior.codigo + ' para liberar.' : 'Conclua o módulo anterior para liberar.'));
      } else if (m.estado === 'disponivel') {
        nodesSit.push(celulaComTexto('Pronto para começar. Abra a primeira aula.'));
      } else if (m.estado === 'andamento') {
        nodesSit.push(celulaComTexto('Continue de onde parou.'));
      } else if (m.estado === 'concluido') {
        nodesSit.push(celulaComTexto('Módulo concluído.'));
      }
      preencher(linha.querySelector('[data-status]'), nodesSit);

      var celAcao = linha.querySelector('[data-acao]');
      if (celAcao) preencher(celAcao, [botaoDeAcao(m)]);

      var link = linha.querySelector('[data-link-modulo]');
      if (m.liberado) {
        link.setAttribute('href', 'trilha.html#u-' + id);
        link.removeAttribute('aria-disabled');
      } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
      }
    });

    // Clique em módulo bloqueado explica o motivo
    document.querySelectorAll('a[data-link-modulo]').forEach(function (link) {
      link.addEventListener('click', function (ev) {
        var id = link.getAttribute('data-link-modulo');
        var m = modulos[id];
        if (m && !m.liberado) {
          ev.preventDefault();
          var idx = ordem.indexOf(m);
          var anterior = idx > 0 ? ordem[idx - 1] : null;
          avisar('O módulo ' + id + ' ainda está bloqueado. ' +
            (anterior ? 'Aprove a prova do módulo ' + anterior.codigo + ' para liberá-lo.' : 'Conclua o módulo anterior.'), 'erro');
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.API.get('/api/trilha').then(atualizar).catch(function (err) {
      avisar(err.message, 'erro');
    });
  });
})();
