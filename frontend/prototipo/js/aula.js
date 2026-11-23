/* Página de aula: placar, exercícios e conclusão.
   Regra: a aula só é concluída quando todos os exercícios dela tiverem resultado. */
(function () {
  'use strict';

  function el(tag, attrs, texto) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function selo(tipo, rotulo) {
    return window.UI ? window.UI.selo(tipo, rotulo) : el('span', null, rotulo);
  }

  function linkAula(cod, texto) {
    var a = el('a', { class: 'btn btn-secundario', href: 'aula.html?aula=' + encodeURIComponent(cod) }, texto);
    a.setAttribute('data-manter-sessao', '');
    return a;
  }

  function listaExercicios(cod) {
    return (window.EXERCICIOS || {})[cod] || null;
  }

  function faltamExercicios(cod) {
    var lista = listaExercicios(cod);
    if (!lista) return 0;
    return lista.length - window.PLN.exerciciosFeitos(cod);
  }

  function aulaAnterior(cod) {
    var lista = window.PLN.todasAsAulas();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].aula.cod === cod) return i > 0 ? lista[i - 1] : null;
    }
    return null;
  }

  function aulaSeguinte(cod) {
    var lista = window.PLN.todasAsAulas();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].aula.cod === cod) return i < lista.length - 1 ? lista[i + 1] : null;
    }
    return null;
  }

  function rotuloBotao(cod, loc) {
    if (listaExercicios(cod)) return 'Concluir aula';
    return loc.aula.conteudo ? 'Marcar aula como concluída' : 'Simular conclusão (protótipo)';
  }

  // Atualiza o placar. "pulso" destaca os números que acabaram de mudar.
  function atualizarPlacar(cod, estado) {
    var P = window.PLN;
    var lista = listaExercicios(cod);
    var total = lista ? lista.length : 0;
    var p = P.placarAula(cod);

    var st = document.getElementById('placar-status');
    st.innerHTML = '';
    if (estado === 'concluida') st.appendChild(selo('concluido', 'Aula concluída'));
    else if (estado === 'bloqueada') st.appendChild(selo('bloqueado', 'Bloqueada'));
    else st.appendChild(selo('disponivel', 'Disponível agora'));

    var pct = total ? Math.round((p.resolvidos / total) * 100) : (estado === 'concluida' ? 100 : 0);
    var barra = document.getElementById('placar-barra');
    barra.setAttribute('aria-valuenow', String(pct));
    document.getElementById('placar-barra-valor').style.width = pct + '%';

    document.getElementById('placar-texto').textContent = total
      ? p.resolvidos + ' de ' + total + (total === 1 ? ' exercício resolvido' : ' exercícios resolvidos')
      : 'Esta aula ainda não tem exercícios nesta versão.';

    var valores = {
      'placar-ganhos': '+' + p.ganhos,
      'placar-perdas': '−' + p.perdas,
      'placar-saldo': String(p.saldoAula),
      'placar-total': String(P.xp())
    };
    Object.keys(valores).forEach(function (id) {
      var nó = document.getElementById(id);
      var antes = nó.textContent;
      nó.textContent = valores[id];
      if (antes !== valores[id]) {
        nó.classList.remove('pulso');
        void nó.offsetWidth; // reinicia a animação
        nó.classList.add('pulso');
      }
    });
  }

  function render(cod, loc, mensagem) {
    var area = document.getElementById('area-conclusao');
    var bloqueio = document.getElementById('area-bloqueio');
    area.innerHTML = '';
    bloqueio.hidden = true;

    var estado = window.PLN.estadoAula(cod);
    atualizarPlacar(cod, estado);

    if (mensagem) {
      area.appendChild(el('p', { class: 'mensagem ok', role: 'status' }, mensagem));
    }

    var modulo = loc.modulo;
    var seguinte = aulaSeguinte(cod);

    if (estado === 'bloqueada') {
      var texto, link;
      if (loc.indice > 0) {
        texto = 'Esta aula está bloqueada. Conclua a aula anterior antes de continuar.';
        link = linkAula(modulo.aulas[loc.indice - 1].cod, 'Ir para ' + modulo.aulas[loc.indice - 1].cod);
      } else {
        texto = 'Esta aula está bloqueada. Conclua a prova do módulo anterior para liberar este módulo.';
        var anterior = aulaAnterior(cod);
        var prev = anterior ? anterior.modulo : null;
        link = el('a', { class: 'btn btn-secundario', href: 'prova.html?modulo=' + encodeURIComponent(prev ? prev.id : '') }, 'Ir para a prova anterior');
        link.setAttribute('data-manter-sessao', '');
      }
      bloqueio.textContent = texto;
      bloqueio.hidden = false;
      area.appendChild(link);
      return;
    }

    if (estado !== 'concluida') {
      var faltam = faltamExercicios(cod);
      var temLista = !!listaExercicios(cod);

      var botao = el('button', { class: 'btn btn-primario botao-concluir', type: 'button', id: 'botao-concluir' }, rotuloBotao(cod, loc));
      var ajuda = el('p', { class: 'apoio', id: 'ajuda-concluir' });

      if (temLista && faltam > 0) {
        botao.disabled = true;
        botao.setAttribute('aria-describedby', 'ajuda-concluir');
        ajuda.textContent = 'Faltam ' + faltam + (faltam === 1 ? ' exercício' : ' exercícios') + ' para liberar a conclusão.';
      } else {
        ajuda.textContent = temLista
          ? 'Todos os exercícios foram resolvidos. Agora você pode concluir a aula.'
          : 'Esta aula ainda não tem exercícios. Use o botão para registrar a conclusão.';
      }

      botao.addEventListener('click', function () {
        var ok = window.PLN.marcarAulaConcluida(cod);
        var msg = ok
          ? 'Aula concluída. Você ganhou ' + window.PLN.XP_AULA + ' pontos.'
          : 'Esta aula ainda não está liberada.';
        render(cod, loc, msg);
      });

      area.appendChild(botao);
      area.appendChild(ajuda);
    }

    // Próximo passo: separado da ação principal
    var passos = el('div', { class: 'proximos-passos' });
    if (estado === 'concluida') {
      if (seguinte && seguinte.modulo.id !== modulo.id) {
        if (window.PLN.provaLiberada(modulo.id) || window.PLN.provaAprovada(modulo.id)) {
          var pa = el('a', { class: 'btn btn-primario', href: 'prova.html?modulo=' + encodeURIComponent(modulo.id) }, 'Fazer a prova do módulo');
          pa.setAttribute('data-manter-sessao', '');
          passos.appendChild(pa);
        }
      } else if (seguinte) {
        passos.appendChild(linkAula(seguinte.aula.cod, 'Próxima aula: ' + seguinte.aula.cod));
      } else {
        passos.appendChild(el('p', { class: 'apoio' }, 'Você chegou ao fim do programa.'));
      }
    }
    if (passos.childNodes.length) area.appendChild(passos);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var cod = new URLSearchParams(window.location.search).get('aula') || '1.1';
    var loc = window.PLN.localizarAula(cod);

    var titulo = document.getElementById('titulo-aula');
    var sub = document.getElementById('subtitulo-aula');
    var migalhas = document.getElementById('migalhas-aula');

    if (!loc) {
      titulo.textContent = 'Aula não encontrada';
      sub.textContent = 'Verifique o endereço ou volte à trilha.';
      document.getElementById('placar-status').hidden = true;
      document.getElementById('area-conclusao').appendChild(el('a', { class: 'btn btn-secundario', href: 'trilha.html' }, 'Voltar à trilha'));
      return;
    }

    var unidade = loc.modulo.tipo === 'preparacao' ? 'Trilha de Python aplicado a texto' : 'Unidade ' + loc.modulo.id + ' · ' + loc.modulo.titulo;
    titulo.textContent = loc.aula.titulo;
    sub.textContent = unidade + ' · Aula ' + cod;
    migalhas.innerHTML = '';
    var a = el('a', { href: 'trilha.html' }, 'Trilha');
    a.setAttribute('data-manter-sessao', '');
    migalhas.appendChild(a);
    migalhas.appendChild(document.createTextNode(' / ' + unidade + ' / Aula ' + cod));

    var conteudo = document.getElementById(loc.aula.conteudo ? 'conteudo-1-1' : 'conteudo-padrao');
    conteudo.hidden = false;

    var bloqueada = window.PLN.estadoAula(cod) === 'bloqueada';
    var areaEx = document.getElementById('area-exercicios');
    areaEx.hidden = bloqueada || !listaExercicios(cod);
    if (!areaEx.hidden && window.Exercicios) {
      window.Exercicios.render(document.getElementById('lista-exercicios'), cod, function () {
        // Atualiza placar e conclusão sem redesenhar os exercícios
        render(cod, loc);
      });
    }

    render(cod, loc);
  });
})();
