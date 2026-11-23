/* Página da aula: placar, exercícios e conclusão.
   Todo o estado vem do servidor (/api/aulas e /api/trilha). Esta tela só exibe e envia ações.
   Regra: a aula só conclui quando todos os exercícios tiverem resultado; o servidor confere. */
(function () {
  'use strict';

  var cod = new URLSearchParams(window.location.search).get('aula') || '1.1';
  var valores = { acerto_primeira: 10, acerto_segunda: 5, pular: 2, concluir: 10 };
  var mapa = {};   // código da aula -> { codigo, titulo, modulo_codigo, modulo_titulo }

  function el(tag, attrs, texto) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  function selo(tipo, rotulo) {
    return window.UI ? window.UI.selo(tipo, rotulo) : el('span', null, rotulo);
  }

  function pontosTexto(n) { return n + (n === 1 ? ' ponto' : ' pontos'); }

  function valorAtual(erros) {
    if (erros === 0) return valores.acerto_primeira;
    if (erros === 1) return valores.acerto_segunda;
    return 0;
  }

  function linkAula(codigo, texto) {
    var a = el('a', { class: 'btn btn-secundario', href: 'aula.html?aula=' + encodeURIComponent(codigo) }, texto);
    a.setAttribute('data-manter-sessao', '');
    return a;
  }

  function linkProva(modulo, texto, primario) {
    var a = el('a', { class: primario ? 'btn btn-primario' : 'btn btn-secundario', href: 'prova.html?modulo=' + encodeURIComponent(modulo) }, texto);
    a.setAttribute('data-manter-sessao', '');
    return a;
  }

  // Cartão já respondido: resultado, pontos, resposta certa e explicação
  function cartaoResolvido(ex) {
    var art = el('article', { class: 'exercicio resolvido', id: 'ex-' + ex.ordem, 'aria-labelledby': 'ex-tit-' + ex.ordem });
    var topo = el('div', { class: 'exercicio-topo' });
    topo.appendChild(el('span', { class: 'exercicio-num' }, 'Exercício ' + ex.ordem));
    art.appendChild(topo);
    art.appendChild(el('h3', { id: 'ex-tit-' + ex.ordem, class: 'exercicio-enunciado' }, ex.enunciado));

    var tipo, texto;
    if (ex.situacao === 'acerto') {
      tipo = 'ok';
      texto = 'Acertou' + (ex.erros === 0 ? ' na primeira tentativa' : ' na segunda tentativa') + ': +' + pontosTexto(ex.ganho || 0);
    } else if (ex.situacao === 'pulo') {
      tipo = 'perda';
      texto = 'Pulado: −' + pontosTexto(ex.perda || 0);
    } else {
      tipo = 'neutro';
      texto = 'Não foi desta vez: 0 pontos';
    }
    art.appendChild(el('div', { class: 'resultado-faixa ' + tipo, role: 'status' }, texto));
    art.appendChild(el('p', { class: 'exercicio-explicacao' }, 'Resposta certa: ' + ex.resposta_certa + '.'));
    art.appendChild(el('p', { class: 'exercicio-explicacao apoio-texto' }, ex.explicacao));
    return art;
  }

  // Cartão pendente: campo de resposta, Responder (principal) e Pular (secundário)
  function cartaoPendente(ex, aoResolver) {
    var erros = ex.erros || 0;
    var nome = 'resp-' + ex.ordem;
    var art = el('article', { class: 'exercicio', id: 'ex-' + ex.ordem, 'aria-labelledby': 'ex-tit-' + ex.ordem });

    var topo = el('div', { class: 'exercicio-topo' });
    topo.appendChild(el('span', { class: 'exercicio-num' }, 'Exercício ' + ex.ordem));
    var pilula = el('span', { class: 'pilula-pontos' }, 'Vale ' + pontosTexto(valorAtual(erros)));
    topo.appendChild(pilula);
    art.appendChild(topo);
    art.appendChild(el('h3', { id: 'ex-tit-' + ex.ordem, class: 'exercicio-enunciado' }, ex.enunciado));

    var entrada = null;
    if (ex.tipo === 'escolha') {
      var fs = el('fieldset', { class: 'exercicio-opcoes' });
      fs.appendChild(el('legend', { class: 'sr-only' }, ex.enunciado));
      (ex.opcoes || []).forEach(function (texto, j) {
        var lab = el('label', { class: 'opcao' });
        lab.appendChild(el('input', { type: 'radio', name: nome, value: String(j) }));
        lab.appendChild(document.createTextNode(texto));
        fs.appendChild(lab);
      });
      art.appendChild(fs);
    } else {
      var campo = el('div', { class: 'campo exercicio-campo' });
      campo.appendChild(el('label', { for: 'in-' + ex.ordem }, 'Sua resposta'));
      entrada = el('input', { type: 'text', id: 'in-' + ex.ordem, name: nome, autocomplete: 'off', placeholder: 'Digite aqui' });
      campo.appendChild(entrada);
      art.appendChild(campo);
    }

    var aviso = el('p', { class: 'exercicio-feedback', role: 'status' });
    art.appendChild(aviso);

    var acoes = el('div', { class: 'exercicio-acoes' });
    var responder = el('button', { class: 'btn btn-escuro', type: 'button' }, erros ? 'Tentar de novo' : 'Responder');
    var pular = el('button', { class: 'btn btn-secundario-texto', type: 'button' }, 'Pular (perde ' + pontosTexto(valores.pular) + ')');
    acoes.appendChild(responder);
    acoes.appendChild(pular);
    art.appendChild(acoes);

    function lerResposta() {
      if (ex.tipo === 'escolha') {
        var marcada = art.querySelector('input[name="' + nome + '"]:checked');
        return marcada ? marcada.value : null;
      }
      var t = entrada.value.trim();
      return t === '' ? null : t;
    }

    function ocupado(on) {
      responder.disabled = on;
      pular.disabled = on;
    }

    function falhou(err) {
      aviso.className = 'exercicio-feedback erro';
      aviso.textContent = err.message;
      ocupado(false);
      if (err.status === 409) aoResolver();   // exercício já resolvido em outra aba: atualiza a tela
    }

    responder.addEventListener('click', function () {
      var r = lerResposta();
      if (r === null) {
        aviso.className = 'exercicio-feedback erro';
        aviso.textContent = ex.tipo === 'escolha' ? 'Escolha uma alternativa antes de responder.' : 'Digite uma resposta antes de responder.';
        return;
      }
      ocupado(true);
      window.API.post('/api/exercicios/' + ex.id + '/tentativas', { resposta: r }).then(function (d) {
        if (d.finalizado) {
          art.replaceWith(cartaoResolvido(Object.assign({}, ex, d, { resolvido: true })));
          aoResolver();
          return;
        }
        // Primeiro erro: a questão continua aberta, com o novo valor visível
        erros = d.erros;
        pilula.textContent = 'Vale ' + pontosTexto(valorAtual(erros));
        aviso.className = 'exercicio-feedback erro';
        aviso.textContent = 'Não foi dessa vez. Tente de novo: agora o acerto vale ' + pontosTexto(valorAtual(erros)) + '.';
        responder.textContent = 'Tentar de novo';
        if (entrada) entrada.value = '';
        ocupado(false);
      }).catch(falhou);
    });

    pular.addEventListener('click', function () {
      ocupado(true);
      window.API.post('/api/exercicios/' + ex.id + '/pulo').then(function (d) {
        art.replaceWith(cartaoResolvido(Object.assign({}, ex, d, { resolvido: true })));
        aoResolver();
      }).catch(falhou);
    });

    return art;
  }

  function atualizarPlacar(aula, trilha) {
    var total = aula.exercicios.length;
    var p = aula.placar;
    var st = document.getElementById('placar-status');
    st.innerHTML = '';
    st.appendChild(aula.concluida ? selo('concluido', 'Aula concluída') : selo('disponivel', 'Disponível agora'));

    var pct = total ? Math.round((p.resolvidos / total) * 100) : (aula.concluida ? 100 : 0);
    document.getElementById('placar-barra').setAttribute('aria-valuenow', String(pct));
    document.getElementById('placar-barra-valor').style.width = pct + '%';

    document.getElementById('placar-texto').textContent = total
      ? p.resolvidos + ' de ' + total + (total === 1 ? ' exercício resolvido' : ' exercícios resolvidos')
      : 'Esta aula ainda não tem exercícios nesta versão.';

    var novos = {
      'placar-ganhos': '+' + p.ganhos,
      'placar-perdas': '−' + p.perdas,
      'placar-saldo': String(p.saldo_aula),
      'placar-total': String(trilha.pontos.total)
    };
    Object.keys(novos).forEach(function (id) {
      var no = document.getElementById(id);
      var antes = no.textContent;
      no.textContent = novos[id];
      if (antes !== novos[id]) {
        no.classList.remove('pulso');
        void no.offsetWidth;
        no.classList.add('pulso');
      }
    });
  }

  function mostrarMensagem(area, msg) {
    var texto = typeof msg === 'string' ? msg : msg.texto;
    var tipo = typeof msg === 'string' ? 'ok' : msg.tipo;
    area.appendChild(el('p', { class: 'mensagem ' + tipo, role: 'status' }, texto));
  }

  function renderTudo(aula, trilha, msg) {
    var area = document.getElementById('area-conclusao');
    area.innerHTML = '';
    document.getElementById('area-bloqueio').hidden = true;
    atualizarPlacar(aula, trilha);
    if (msg) mostrarMensagem(area, msg);

    var areaEx = document.getElementById('area-exercicios');
    var lista = document.getElementById('lista-exercicios');
    lista.innerHTML = '';
    areaEx.hidden = false;
    if (!aula.exercicios.length) {
      lista.appendChild(el('div', { class: 'vazio' }, 'Os exercícios desta aula ainda estão em elaboração.'));
    } else {
      aula.exercicios.forEach(function (ex) {
        lista.appendChild(ex.resolvido ? cartaoResolvido(ex) : cartaoPendente(ex, function () { carregarPagina(); }));
      });
    }

    if (!aula.concluida) {
      var faltam = aula.exercicios.filter(function (e) { return !e.resolvido; }).length;
      var botao = el('button', { class: 'btn btn-primario botao-concluir', type: 'button', id: 'botao-concluir' }, 'Concluir aula');
      var ajuda = el('p', { class: 'apoio', id: 'ajuda-concluir' });
      botao.disabled = !aula.pode_concluir;
      if (!aula.exercicios.length) {
        ajuda.textContent = 'Esta aula ainda não tem exercícios, então não pode ser concluída nesta versão.';
      } else if (faltam > 0) {
        botao.setAttribute('aria-describedby', 'ajuda-concluir');
        ajuda.textContent = 'Faltam ' + faltam + (faltam === 1 ? ' exercício' : ' exercícios') + ' para liberar a conclusão.';
      } else {
        ajuda.textContent = 'Todos os exercícios foram resolvidos. Agora você pode concluir a aula.';
      }
      botao.addEventListener('click', concluir);
      area.appendChild(botao);
      area.appendChild(ajuda);
    }

    // Próximo passo: fica separado da ação principal
    if (aula.concluida) {
      var passos = el('div', { class: 'proximos-passos' });
      var moduloTrilha = trilha.modulos.filter(function (m) { return m.codigo === aula.modulo.codigo; })[0];
      if (aula.proxima) {
        var mesmoModulo = mapa[aula.proxima] && mapa[aula.proxima].modulo_codigo === aula.modulo.codigo;
        if (!mesmoModulo && moduloTrilha && moduloTrilha.prova && moduloTrilha.prova.liberada && !moduloTrilha.prova.aprovada) {
          passos.appendChild(linkProva(aula.modulo.codigo, 'Fazer a prova do módulo ' + aula.modulo.codigo, true));
        } else {
          passos.appendChild(linkAula(aula.proxima, 'Próxima aula: ' + aula.proxima));
        }
      } else {
        passos.appendChild(el('p', { class: 'apoio' }, 'Você chegou ao fim do programa.'));
      }
      area.appendChild(passos);
    }
  }

  function concluir() {
    var botao = document.getElementById('botao-concluir');
    if (botao) botao.disabled = true;
    window.API.post('/api/aulas/' + encodeURIComponent(cod) + '/concluir').then(function (r) {
      carregarPagina({ texto: r.ja_concluida ? 'Esta aula já estava concluída.' : 'Aula concluída. Você ganhou ' + r.ganho + ' pontos.', tipo: 'ok' });
    }).catch(function (err) {
      carregarPagina({ texto: err.message, tipo: 'erro' });
    });
  }

  // Aula bloqueada: aponta o que falta. Dentro do módulo, a aula anterior; no início do módulo, a prova do módulo anterior.
  function bloqueada(trilha) {
    document.getElementById('area-exercicios').hidden = true;
    var area = document.getElementById('area-conclusao');
    area.innerHTML = '';
    var bloqueio = document.getElementById('area-bloqueio');
    bloqueio.hidden = false;

    var modulo = trilha.modulos.filter(function (m) {
      return m.aulas.some(function (a) { return a.codigo === cod; });
    })[0];
    if (!modulo) return;
    var idx = -1;
    modulo.aulas.forEach(function (a, i) { if (a.codigo === cod) idx = i; });

    if (idx > 0) {
      bloqueio.textContent = 'Esta aula está bloqueada. Conclua a aula anterior antes de continuar.';
      area.appendChild(linkAula(modulo.aulas[idx - 1].codigo, 'Ir para ' + modulo.aulas[idx - 1].codigo));
      return;
    }
    var gatilhos = trilha.modulos.filter(function (m) { return m.tipo === 'modulo'; });
    var pos = gatilhos.indexOf(modulo);
    var anterior = pos > 0 ? gatilhos[pos - 1] : null;
    if (anterior) {
      bloqueio.textContent = 'Esta aula está bloqueada. Conclua a prova do módulo ' + anterior.codigo + ' para liberar este módulo.';
      area.appendChild(linkProva(anterior.codigo, 'Ir para a prova do módulo ' + anterior.codigo));
    } else {
      bloqueio.textContent = 'Esta aula ainda não está liberada.';
    }
  }

  function naoEncontrada() {
    document.getElementById('titulo-aula').textContent = 'Aula não encontrada';
    document.getElementById('subtitulo-aula').textContent = 'Verifique o endereço ou volte à trilha.';
    document.getElementById('placar-status').hidden = true;
    document.getElementById('area-conclusao').appendChild(el('a', { class: 'btn btn-secundario', href: 'trilha.html' }, 'Voltar à trilha'));
  }

  function indexar(trilha) {
    trilha.modulos.forEach(function (m) {
      m.aulas.forEach(function (a) {
        mapa[a.codigo] = { codigo: a.codigo, titulo: a.titulo, modulo_codigo: m.codigo, modulo_titulo: m.titulo };
      });
    });
  }

  function cabecalho(aula) {
    var m = aula.modulo;
    var unidade = m.codigo === 'P' ? 'Trilha de Python aplicado a texto' : 'Unidade ' + m.codigo + ' · ' + m.titulo;
    document.getElementById('titulo-aula').textContent = aula.titulo;
    document.getElementById('subtitulo-aula').textContent = unidade + ' · Aula ' + aula.codigo;
    var migalhas = document.getElementById('migalhas-aula');
    migalhas.innerHTML = '';
    var a = el('a', { href: 'trilha.html' }, 'Trilha');
    a.setAttribute('data-manter-sessao', '');
    migalhas.appendChild(a);
    migalhas.appendChild(document.createTextNode(' / ' + unidade + ' / Aula ' + aula.codigo));
    document.getElementById(aula.codigo === '1.1' ? 'conteudo-1-1' : 'conteudo-padrao').hidden = false;
  }

  // Busca trilha (para navegação e pontos) e aula; trata aula bloqueada e inexistente
  function carregarPagina(msg) {
    return window.API.get('/api/trilha').then(function (trilha) {
      indexar(trilha);
      return window.API.get('/api/aulas/' + encodeURIComponent(cod)).then(function (aula) {
        valores = aula.valores;
        cabecalho(aula);
        renderTudo(aula, trilha, msg);
      }, function (err) {
        if (err.status === 403) return bloqueada(trilha);
        if (err.status === 404) return naoEncontrada();
        throw err;
      });
    }).catch(function (err) {
      mostrarMensagem(document.getElementById('area-conclusao'), { texto: err.message, tipo: 'erro' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    carregarPagina();
  });
})();
