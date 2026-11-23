/* Laboratório de texto (versão simplificada do protótipo).
   - Análise ao vivo: atualiza enquanto a pessoa digita (com pausa de 250 ms), sem precisar clicar.
   - Entrada: texto colado, arquivo .txt ou exemplo pronto.
   - Modos: palavras, pares de palavras (bigramas) e documentos com TF-IDF (um documento por linha).
   Ordem da pipeline: minúsculas → pontuação → acentos → tokenização → stopwords → curtas → radicalização → contagem.
   Não é um pipeline completo de PLN. Os textos ficam só no navegador. */
(function () {
  'use strict';

  var STOPWORDS = [
    'a','o','as','os','um','uma','uns','umas','de','do','da','dos','das','em','no','na','nos','nas',
    'por','para','pra','com','sem','e','ou','mas','que','se','ao','aos','como','mais','menos',
    'muito','muitos','muita','muitas','sao','foi','ser','esta','estao','ter','tem','ha','isso',
    'este','estes','estas','esse','essa','esses','essas','aquele','aquela','seu','sua','seus','suas',
    'ele','ela','eles','elas','eu','nos','voce','voces','quando','onde','tambem','ja','nao','sim','pelo',
    'pela','pelos','pelas','entre','sobre','ate','apos','ainda','foram','vai','vao','pode','podem'
  ];

  function semAcento(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  var STOP = new Set(STOPWORDS.map(semAcento));

  // Terminações cortadas pela radicalização simplificada (trabalha sem acentos)
  var SUFIXOS = ['amentos', 'imentos', 'acoes', 'adores', 'mente', 'ando', 'endo', 'indo', 'ados', 'adas',
    'ado', 'ada', 'idos', 'idas', 'ido', 'ida', 'coes', 'acao', 'ador', 'ais', 'eis', 'es', 'as', 'os', 's', 'a', 'o']
    .sort(function (a, b) { return b.length - a.length; });

  var LIMITE = 5000;
  var EXEMPLO =
    'A campanha de vacinação avança nos municípios e a equipe de saúde orienta a população a manter as ' +
    'medidas de prevenção. A vacinação reduz o risco de casos graves, e a equipe reforça que a informação ' +
    'oficial deve ser consultada nos canais da secretaria de saúde.';

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function radicalizar(t) {
    if (t.length <= 4) return t;
    for (var i = 0; i < SUFIXOS.length; i++) {
      var suf = SUFIXOS[i];
      if (t.length - suf.length >= 3 && t.slice(-suf.length) === suf) return t.slice(0, -suf.length);
    }
    return t;
  }

  // Roda a pipeline sobre um texto e devolve os tokens e o efeito de cada etapa
  function processar(texto, op) {
    var passos = [];
    var s = texto;
    if (op.minusculas) s = s.toLowerCase();
    if (op.pontuacao) s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
    if (op.acentos) s = semAcento(s);
    var tokens = s.split(/\s+/).filter(Boolean);
    passos.push({ nome: 'Tokenização', antes: tokens.length, depois: tokens.length });

    if (op.stop) {
      var a1 = tokens.length;
      tokens = tokens.filter(function (t) { return !STOP.has(semAcento(t.toLowerCase())); });
      passos.push({ nome: 'Stopwords', antes: a1, depois: tokens.length });
    }
    if (op.curtas) {
      var a2 = tokens.length;
      tokens = tokens.filter(function (t) { return t.length >= 3 && !/^\d+$/.test(t); });
      passos.push({ nome: 'Palavras curtas', antes: a2, depois: tokens.length });
    }
    if (op.radical) {
      tokens = tokens.map(function (t) { return radicalizar(semAcento(t.toLowerCase())); });
      passos.push({ nome: 'Radicalização', antes: tokens.length, depois: tokens.length });
    }
    return { tokens: tokens, passos: passos };
  }

  // Conta palavras (unigramas) ou pares consecutivos (bigramas)
  function contar(tokens, modo) {
    var mapa = new Map();
    if (modo === 'pares') {
      for (var i = 0; i < tokens.length - 1; i++) {
        var par = tokens[i] + ' ' + tokens[i + 1];
        mapa.set(par, (mapa.get(par) || 0) + 1);
      }
    } else {
      tokens.forEach(function (t) { mapa.set(t, (mapa.get(t) || 0) + 1); });
    }
    return mapa;
  }

  // TF-IDF: frequência relativa no documento × log(N / documentos que contêm o termo)
  function tfidf(listaTokens) {
    var N = listaTokens.length;
    var df = new Map();
    listaTokens.forEach(function (tokens) {
      new Set(tokens).forEach(function (t) { df.set(t, (df.get(t) || 0) + 1); });
    });
    return listaTokens.map(function (tokens) {
      var tam = tokens.length || 1;
      var cont = new Map();
      tokens.forEach(function (t) { cont.set(t, (cont.get(t) || 0) + 1); });
      var pesos = [];
      cont.forEach(function (n, t) {
        var idf = Math.log(N / df.get(t));
        if (idf > 0) pesos.push([t, (n / tam) * idf]);
      });
      return pesos.sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
    });
  }

  function csvDe(linhas, cabecalho) {
    var corpo = linhas.map(function (l) {
      return l.map(function (c) {
        var s = String(c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');
    // BOM para o Excel abrir acentos corretamente
    return '﻿' + cabecalho.join(',') + '\n' + corpo;
  }

  function init() {
    var entrada = document.getElementById('texto-entrada');
    if (!entrada) return;

    var erro = document.getElementById('erro-entrada');
    var resultado = document.getElementById('resultado');
    var btnCsv = document.getElementById('btn-csv');
    var contador = document.getElementById('contador-texto');
    var ultimo = null; // dados da última análise, para exportar
    var pausa = null;

    function opcoes() {
      return {
        minusculas: document.getElementById('opt-minusculas').checked,
        pontuacao: document.getElementById('opt-pontuacao').checked,
        acentos: document.getElementById('opt-acentos').checked,
        stop: document.getElementById('opt-stop').checked,
        curtas: document.getElementById('opt-curtas').checked,
        radical: document.getElementById('opt-radical').checked
      };
    }

    function modo() {
      var m = document.querySelector('input[name="modo"]:checked');
      return m ? m.value : 'palavras';
    }

    function tabelaEfeito(passos) {
      var linhas = passos.map(function (p) {
        return '<tr><th scope="row">' + escapar(p.nome) + '</th><td>' + p.antes + '</td><td>' + p.depois +
          '</td><td>' + (p.antes - p.depois) + '</td></tr>';
      }).join('');
      return '<div class="tabela-wrap"><table class="tabela"><caption>Efeito de cada etapa (quantos termos entram e saem)</caption>' +
        '<thead><tr><th scope="col">Etapa</th><th scope="col">Entram</th><th scope="col">Saem</th><th scope="col">Removidos</th></tr></thead>' +
        '<tbody>' + linhas + '</tbody></table></div>';
    }

    function barras(pares, maximo) {
      return '<ul class="barras">' + pares.map(function (par) {
        var pct = maximo ? Math.round((par[1] / maximo) * 100) : 0;
        return '<li class="barra-linha"><span>' + escapar(par[0]) + '</span>' +
          '<div class="barra-trilho" role="img" aria-label="' + escapar(par[0]) + ': ' + par[1] + '">' +
          '<div class="barra-valor" style="width:' + pct + '%"></div></div>' +
          '<span class="num">' + par[1] + '</span></li>';
      }).join('') + '</ul>';
    }

    function limpaResultado() {
      resultado.innerHTML = '';
      ultimo = null;
      btnCsv.disabled = true;
    }

    // Análise de palavras ou pares
    function analisarTexto(texto, op, md) {
      var r = processar(texto, op);
      var contagem = contar(r.tokens, md);
      var ordenado = Array.from(contagem.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
      ultimo = { tipo: 'contagem', linhas: ordenado, cabecalho: ['termo', 'frequencia'], arquivo: md === 'pares' ? 'bigramas.csv' : 'frequencias.csv' };

      var html = tabelaEfeito(r.passos);
      if (ordenado.length === 0) {
        html += '<p class="vazio">Nenhum termo restou depois das etapas escolhidas. Desligue alguma etapa ou use um texto mais longo.</p>';
        return { html: html, exporta: false };
      }
      var top = ordenado.slice(0, 10);
      html += '<h3>' + (md === 'pares' ? 'Pares de palavras mais frequentes' : 'Termos mais frequentes') + '</h3>' +
        barras(top, top[0][1]) +
        '<p class="apoio">Termos distintos: ' + contagem.size + '. A frequência mostra repetição, não veracidade nem importância semântica.</p>';
      return { html: html, exporta: true };
    }

    // Análise de documentos (um por linha) com TF-IDF
    function analisarDocumentos(texto, op) {
      var docs = texto.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (docs.length < 2) {
        return { html: '<p class="vazio">Para comparar documentos, escreva pelo menos dois, cada um em uma linha.</p>', exporta: false };
      }
      var processados = docs.map(function (d) { return processar(d, op); });
      var pesos = tfidf(processados.map(function (p) { return p.tokens; }));

      ultimo = { tipo: 'documentos', linhas: [], cabecalho: ['documento', 'termo', 'tfidf'], arquivo: 'tfidf.csv' };
      var blocos = pesos.map(function (lista, i) {
        var top = lista.slice(0, 3);
        top.forEach(function (par) { ultimo.linhas.push([i + 1, par[0], par[1].toFixed(4)]); });
        var conteudo = top.length
          ? '<ol class="termos-doc">' + top.map(function (par) {
              return '<li><strong>' + escapar(par[0]) + '</strong> <span class="apoio">peso ' + par[1].toFixed(3) + '</span></li>';
            }).join('') + '</ol>'
          : '<p class="apoio">Nenhum termo característico: as palavras aparecem em todos os documentos.</p>';
        return '<article class="card doc-card"><h3>Documento ' + (i + 1) + '</h3>' +
          '<p class="apoio">' + processados[i].tokens.length + ' termos depois das etapas</p>' + conteudo + '</article>';
      }).join('');

      var html = '<h3>Termos característicos de cada documento</h3>' +
        '<div class="grade">' + blocos + '</div>' +
        '<p class="apoio">O peso sobe quando o termo aparece muito num documento e pouco nos outros. Um peso alto indica um termo distintivo, não um termo verdadeiro.</p>';
      return { html: html, exporta: ultimo.linhas.length > 0 };
    }

    function analisar(ehAcao) {
      erro.textContent = '';
      var bruto = entrada.value.trim();
      if (bruto.length === 0) {
        limpaResultado();
        if (ehAcao) erro.textContent = 'Digite, cole ou carregue um texto antes de analisar.';
        return;
      }
      if (bruto.length < 20) {
        limpaResultado();
        if (ehAcao) erro.textContent = 'Use pelo menos 20 caracteres para que a contagem faça sentido.';
        else resultado.innerHTML = '<p class="apoio">Continue escrevendo: a análise aparece com pelo menos 20 caracteres.</p>';
        return;
      }

      var op = opcoes();
      var md = modo();
      var r = md === 'documentos' ? analisarDocumentos(bruto, op) : analisarTexto(bruto, op, md);
      resultado.innerHTML = r.html;
      btnCsv.disabled = !(r.exporta && ultimo);
    }

    // Análise ao vivo: espera a pessoa parar de digitar por 250 ms
    function aoDigitar() {
      if (contador) {
        var n = entrada.value.length;
        contador.textContent = n + ' de 5.000 caracteres';
        contador.className = n > 4800 ? 'ajuda-erro' : '';
      }
      clearTimeout(pausa);
      pausa = setTimeout(function () { analisar(false); }, 250);
    }

    function exportar() {
      if (!ultimo || !ultimo.linhas.length) return;
      var blob = new Blob([csvDe(ultimo.linhas, ultimo.cabecalho)], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = ultimo.arquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    // Carregar .txt: lê o arquivo e respeita o limite de caracteres
    function carregarArquivo(ev) {
      var arq = ev.target.files && ev.target.files[0];
      if (!arq) return;
      erro.textContent = '';
      var leitor = new FileReader();
      leitor.onload = function () {
        var texto = String(leitor.result || '');
        if (texto.length > LIMITE) {
          erro.textContent = 'O arquivo tem mais de ' + LIMITE.toLocaleString('pt-BR') + ' caracteres. Use um trecho menor.';
          return;
        }
        entrada.value = texto;
        aoDigitar();
        analisar(true);
      };
      leitor.onerror = function () { erro.textContent = 'Não foi possível ler este arquivo. Tente outro .txt.'; };
      leitor.readAsText(arq, 'utf-8');
      ev.target.value = '';
    }

    document.getElementById('btn-analisar').addEventListener('click', function () { analisar(true); });
    document.getElementById('btn-exemplo').addEventListener('click', function () {
      entrada.value = EXEMPLO;
      aoDigitar();
      analisar(true);
    });
    document.getElementById('btn-limpar').addEventListener('click', function () {
      entrada.value = '';
      erro.textContent = '';
      limpaResultado();
      aoDigitar();
      entrada.focus();
    });
    btnCsv.addEventListener('click', exportar);
    document.getElementById('arquivo-txt').addEventListener('change', carregarArquivo);
    entrada.addEventListener('input', aoDigitar);
    document.querySelectorAll('.lab-etapas input').forEach(function (inp) {
      inp.addEventListener('change', function () { analisar(false); });
    });

    aoDigitar();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
