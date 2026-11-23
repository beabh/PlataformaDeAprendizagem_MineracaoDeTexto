/* Exercícios da aula (protótipo).

   Pontuação (tabela PLN.PONTOS em js/progresso.js):
   - Acerto na 1ª tentativa: +10 pontos.
   - Erro na 1ª tentativa: nenhum ponto perdido; a pessoa tenta de novo, e o acerto passa a valer +5.
   - Erro na 2ª tentativa: 0 pontos; a resposta certa aparece com a explicação.
   - Pular: −2 pontos (limitado ao saldo), e a resposta certa aparece.

   Hierarquia de ações: "Responder" é a ação principal; "Pular" é a única ação secundária. */
(function () {
  'use strict';

  function el(tag, attrs, texto) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  function normalizar(s) {
    return String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  }

  function corrigir(ex, resposta) {
    if (ex.tipo === 'escolha') return resposta === ex.correta;
    var r = normalizar(resposta);
    return ex.respostas.some(function (aceita) { return normalizar(aceita) === r; });
  }

  function textoCorreto(ex) {
    return ex.tipo === 'escolha' ? ex.opcoes[ex.correta] : ex.respostas[0];
  }

  function pontosTexto(n) {
    return n + (n === 1 ? ' ponto' : ' pontos');
  }

  // Pontos que o exercício vale agora, conforme os erros já cometidos
  function valorAtual(erros) {
    var P = window.PLN;
    if (erros === 0) return P.PONTOS.acertoPrimeira;
    if (erros === 1) return P.PONTOS.acertoSegunda;
    return 0;
  }

  // Movimento de pontos registrado para este exercício (ganho ou perda)
  function movimentoDo(chave) {
    var lista = window.PLN.historico();
    for (var i = 0; i < lista.length; i++) if (lista[i].ref === chave) return lista[i];
    return null;
  }

  // Cartão já respondido: mostra o resultado, a resposta certa e a explicação
  function cartaoResolvido(cod, i, ex) {
    var chave = cod + '#' + i;
    var reg = window.PLN.estado().exercicios[chave];
    var mov = movimentoDo(chave);
    var art = el('article', { class: 'exercicio resolvido', id: 'ex-' + chave, 'aria-labelledby': 'ex-tit-' + chave });

    art.appendChild(cabecalho(i, ex, null));
    art.appendChild(el('h3', { id: 'ex-tit-' + chave, class: 'exercicio-enunciado' }, ex.enunciado));

    var tipoResultado, texto;
    if (reg.situacao === 'acerto') {
      tipoResultado = 'ok';
      texto = 'Acertou' + (reg.erros === 0 ? ' na primeira tentativa' : ' na segunda tentativa') + ': +' + pontosTexto(mov ? mov.pontos : 0);
    } else if (reg.situacao === 'pulo') {
      tipoResultado = 'perda';
      texto = 'Pulado: −' + pontosTexto(mov ? mov.pontos : 0);
    } else {
      tipoResultado = 'neutro';
      texto = 'Não foi desta vez: 0 pontos';
    }

    var faixa = el('div', { class: 'resultado-faixa ' + tipoResultado, role: 'status' }, texto);
    art.appendChild(faixa);
    art.appendChild(el('p', { class: 'exercicio-explicacao' }, 'Resposta certa: ' + textoCorreto(ex) + '.'));
    art.appendChild(el('p', { class: 'exercicio-explicacao apoio-texto' }, ex.explicacao));
    return art;
  }

  // Topo do cartão: número e valor em pontos, sempre visível
  function cabecalho(i, ex, valor) {
    var topo = el('div', { class: 'exercicio-topo' });
    topo.appendChild(el('span', { class: 'exercicio-num' }, 'Exercício ' + (i + 1)));
    if (valor !== null) {
      topo.appendChild(el('span', { class: 'pilula-pontos' }, 'Vale ' + pontosTexto(valor)));
    }
    return topo;
  }

  // Cartão pendente: campo de resposta, Responder (principal) e Pular (secundário)
  function cartaoPendente(cod, i, ex, aoMudar) {
    var P = window.PLN;
    var chave = cod + '#' + i;
    var erros = 0;
    var nome = 'resp-' + chave;
    var art = el('article', { class: 'exercicio', id: 'ex-' + chave, 'aria-labelledby': 'ex-tit-' + chave });

    var topo = cabecalho(i, ex, valorAtual(0));
    var pilula = topo.querySelector('.pilula-pontos');
    art.appendChild(topo);
    art.appendChild(el('h3', { id: 'ex-tit-' + chave, class: 'exercicio-enunciado' }, ex.enunciado));

    var entrada = null;
    if (ex.tipo === 'escolha') {
      var fs = el('fieldset', { class: 'exercicio-opcoes' });
      fs.appendChild(el('legend', { class: 'sr-only' }, ex.enunciado));
      ex.opcoes.forEach(function (texto, j) {
        var lab = el('label', { class: 'opcao' });
        lab.appendChild(el('input', { type: 'radio', name: nome, value: String(j) }));
        lab.appendChild(document.createTextNode(texto));
        fs.appendChild(lab);
      });
      art.appendChild(fs);
    } else {
      // Campo com o mesmo estilo dos formulários do site
      var campo = el('div', { class: 'campo exercicio-campo' });
      campo.appendChild(el('label', { for: 'in-' + chave }, 'Sua resposta'));
      entrada = el('input', { type: 'text', id: 'in-' + chave, name: nome, autocomplete: 'off', placeholder: 'Digite aqui' });
      campo.appendChild(entrada);
      art.appendChild(campo);
    }

    var aviso = el('p', { class: 'exercicio-feedback', role: 'status' });
    art.appendChild(aviso);

    var acoes = el('div', { class: 'exercicio-acoes' });
    var responder = el('button', { class: 'btn btn-escuro', type: 'button' }, 'Responder');
    var pular = el('button', { class: 'btn btn-secundario-texto', type: 'button' }, 'Pular (perde ' + pontosTexto(P.PONTOS.pular) + ')');
    acoes.appendChild(responder);
    acoes.appendChild(pular);
    art.appendChild(acoes);

    function lerResposta() {
      if (ex.tipo === 'escolha') {
        var m = art.querySelector('input[name="' + nome + '"]:checked');
        return m ? parseInt(m.value, 10) : null;
      }
      var t = entrada.value.trim();
      return t === '' ? null : t;
    }

    function concluir(acertou, pulou) {
      P.registrarExercicio(chave, { acertou: acertou, erros: erros, pulou: pulou });
      var novo = cartaoResolvido(cod, i, ex);
      art.replaceWith(novo);
      aoMudar && aoMudar();
    }

    responder.addEventListener('click', function () {
      var r = lerResposta();
      if (r === null) {
        aviso.className = 'exercicio-feedback erro';
        aviso.textContent = ex.tipo === 'escolha' ? 'Escolha uma alternativa antes de responder.' : 'Digite uma resposta antes de responder.';
        return;
      }
      if (corrigir(ex, r)) {
        concluir(true, false);
        return;
      }
      erros += 1;
      if (erros === 1) {
        // Primeiro erro: a questão continua aberta, com o novo valor visível
        aviso.className = 'exercicio-feedback erro';
        aviso.textContent = 'Não foi dessa vez. Tente de novo: agora o acerto vale ' + pontosTexto(valorAtual(1)) + '.';
        pilula.textContent = 'Vale ' + pontosTexto(valorAtual(1));
        responder.textContent = 'Tentar de novo';
        if (entrada) entrada.value = '';
        return;
      }
      concluir(false, false);
    });

    pular.addEventListener('click', function () {
      concluir(false, true);
    });

    return art;
  }

  // Renderiza os exercícios da aula dentro do contêiner.
  // aoMudar é chamado sempre que um resultado muda (para atualizar o placar).
  function render(container, cod, aoMudar) {
    var lista = (window.EXERCICIOS || {})[cod];
    container.innerHTML = '';
    if (!lista) {
      container.appendChild(el('div', { class: 'vazio' }, 'Os exercícios desta aula ainda estão em elaboração.'));
      return;
    }
    lista.forEach(function (ex, i) {
      var chave = cod + '#' + i;
      var card = window.PLN.exercicioRegistrado(chave) ? cartaoResolvido(cod, i, ex) : cartaoPendente(cod, i, ex, aoMudar);
      container.appendChild(card);
    });
  }

  // Todos os exercícios da aula já têm resultado? (Aula sem banco conta como resolvida.)
  function completos(cod) {
    var lista = (window.EXERCICIOS || {})[cod];
    if (!lista) return true;
    return lista.every(function (_, i) { return window.PLN.exercicioRegistrado(cod + '#' + i); });
  }

  window.Exercicios = { render: render, completos: completos };
})();
