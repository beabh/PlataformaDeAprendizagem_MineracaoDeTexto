/* Catálogo do programa e regras de progresso (protótipo).

   Regras:
   - Aulas de um módulo são liberadas em sequência: a aula N só abre quando a N-1 foi concluída.
   - A prova do módulo só libera quando todas as aulas do módulo foram concluídas.
   - Um módulo só libera quando a prova do módulo anterior foi aprovada.
   - O módulo de preparação (Python) não bloqueia o Módulo 1 e não tem prova (decisão a confirmar).

   Gamificação (valores padrão, a confirmar):
   - Concluir uma aula: 10 pontos de experiência (XP).
   - Primeira aprovação em uma prova: 50 XP.
   - Sequência: número de dias seguidos com alguma aula concluída ou prova aprovada.

   Armazenamento: localStorage do navegador. Apenas para o protótipo; a versão final
   guarda o progresso no servidor, vinculado à conta do estudante. */
(function () {
  'use strict';

  var CHAVE = 'pln-progresso-v4';
  var APROVACAO = 0.7; // 7 de 10 questões. Valor padrão a confirmar com a docente.
  var XP_AULA = 10;
  var XP_PRIMEIRA_PROVA = 50;

  // Tabela única de pontos dos exercícios (valores padrão, a confirmar)
  var PONTOS = {
    acertoPrimeira: 10,   // acerto na 1ª tentativa
    acertoSegunda: 5,     // acerto na 2ª tentativa
    pular: 2              // perda ao pular (limitada ao saldo disponível)
  };

  var CATALOGO = [
    { id: 'P', titulo: 'Python aplicado a texto', tipo: 'preparacao', prova: false, aulas: [
      { cod: 'P.1', titulo: 'Strings e textos da pandemia' },
      { cod: 'P.2', titulo: 'Listas e dicionários para tokens' },
      { cod: 'P.3', titulo: 'Contando palavras com Counter' },
      { cod: 'P.4', titulo: 'Lendo TXT e CSV do corpus, com validação' }
    ] },
    { id: '1', titulo: 'Introdução à mineração de texto', tipo: 'modulo', prova: true, aulas: [
      { cod: '1.1', titulo: 'Dados estruturados, não estruturados e mineração de texto', conteudo: true }
    ] },
    { id: '2', titulo: 'Fundamentos de linguagem natural', tipo: 'modulo', prova: true, aulas: [
      { cod: '2.1', titulo: 'O que é PLN e por que a linguagem é ambígua' },
      { cod: '2.2', titulo: 'Corpus e tokens: a unidade básica da análise' },
      { cod: '2.3', titulo: 'Normalização do texto' },
      { cod: '2.4', titulo: 'Stopwords: o que remover e o que manter' },
      { cod: '2.5', titulo: 'Stemming e lematização' },
      { cod: '2.6', titulo: 'Desafios do português brasileiro' }
    ] },
    { id: '3', titulo: 'Preparação e limpeza de dados textuais', tipo: 'modulo', prova: true, aulas: [
      { cod: '3.1', titulo: 'Coleta e preparação do corpus' },
      { cod: '3.2', titulo: 'Remoção de ruídos, pontuação e caracteres' },
      { cod: '3.3', titulo: 'Duplicatas e dados ausentes' },
      { cod: '3.4', titulo: 'Padronização e metadados: fonte, período e licença' },
      { cod: '3.5', titulo: 'Considerações éticas e de privacidade' }
    ] },
    { id: '4', titulo: 'Frequência e representação textual', tipo: 'modulo', prova: true, aulas: [
      { cod: '4.1', titulo: 'Frequência absoluta e relativa' },
      { cod: '4.2', titulo: 'N-gramas' },
      { cod: '4.3', titulo: 'Bag of Words e vetorização' },
      { cod: '4.4', titulo: 'TF-IDF' },
      { cod: '4.5', titulo: 'Similaridade do cosseno' },
      { cod: '4.6', titulo: 'Introdução a embeddings' }
    ] },
    { id: '5', titulo: 'Análise de sentimentos', tipo: 'modulo', prova: true, aulas: [
      { cod: '5.1', titulo: 'Conceito e classes: positiva, negativa e neutra' },
      { cod: '5.2', titulo: 'Abordagem por léxicos' },
      { cod: '5.3', titulo: 'Modelos supervisionados' },
      { cod: '5.4', titulo: 'Limitações: ironia, negação e linguagem informal' },
      { cod: '5.5', titulo: 'Sentimento textual não é emoção humana' }
    ] },
    { id: '6', titulo: 'Classificação automática de textos', tipo: 'modulo', prova: true, aulas: [
      { cod: '6.1', titulo: 'Classificação supervisionada: treino e teste' },
      { cod: '6.2', titulo: 'Naive Bayes' },
      { cod: '6.3', titulo: 'Regressão logística' },
      { cod: '6.4', titulo: 'Matriz de confusão, precisão, recall e F1' },
      { cod: '6.5', titulo: 'Overfitting e vazamento de dados' },
      { cod: '6.6', titulo: 'Introdução a Transformers' }
    ] },
    { id: '7', titulo: 'Modelagem de tópicos', tipo: 'modulo', prova: true, aulas: [
      { cod: '7.1', titulo: 'Descoberta de assuntos em grandes coleções' },
      { cod: '7.2', titulo: 'Agrupamento textual' },
      { cod: '7.3', titulo: 'Latent Dirichlet Allocation (LDA)' },
      { cod: '7.4', titulo: 'Interpretação e limitações dos tópicos' }
    ] },
    { id: '8', titulo: 'Reconhecimento de entidades nomeadas', tipo: 'modulo', prova: true, aulas: [
      { cod: '8.1', titulo: 'NER: pessoas, organizações, locais e datas' },
      { cod: '8.2', titulo: 'Modelos de identificação de entidades' },
      { cod: '8.3', titulo: 'Erros comuns e ambiguidades' }
    ] },
    { id: '9', titulo: 'Desinformação e análise crítica', tipo: 'modulo', prova: true, aulas: [
      { cod: '9.1', titulo: 'Circulação de desinformação na pandemia' },
      { cod: '9.2', titulo: 'Características linguísticas de conteúdos enganosos' },
      { cod: '9.3', titulo: 'Limites dos classificadores e viés de datasets' },
      { cod: '9.4', titulo: 'Checagem de fatos e avaliação crítica de evidências' },
      { cod: '9.5', titulo: 'Ética e responsabilidade em IA' }
    ] },
    { id: '10', titulo: 'Projeto prático final', tipo: 'modulo', prova: true, aulas: [
      { cod: '10.1', titulo: 'Selecionar e inspecionar o corpus' },
      { cod: '10.2', titulo: 'Limpeza e extração de termos' },
      { cod: '10.3', titulo: 'Análise, visualização e interpretação' },
      { cod: '10.4', titulo: 'Limitações e possíveis vieses' }
    ] }
  ];

  // ---------- Armazenamento ----------
  // Estrutura:
  //   movimentos: livro-razão de pontos. Cada item é { ref, tipo: 'ganho' | 'perda', pontos, motivo, data }.
  //   O saldo é a soma dos movimentos. Nenhum campo de XP é guardado separadamente.
  //   exercicios: resultado de cada exercício ('acerto' | 'erro' | 'pulo'), para não repetir a pontuação.
  function estadoVazio() {
    return { concluidas: [], provas: {}, dias: [], movimentos: [], exercicios: {} };
  }

  function estado() {
    try {
      var e = JSON.parse(localStorage.getItem(CHAVE));
      if (!e || typeof e !== 'object') throw new Error('vazio');
      e.concluidas = Array.isArray(e.concluidas) ? e.concluidas : [];
      e.provas = e.provas && typeof e.provas === 'object' ? e.provas : {};
      e.dias = Array.isArray(e.dias) ? e.dias : [];
      e.movimentos = Array.isArray(e.movimentos) ? e.movimentos : [];
      e.exercicios = e.exercicios && typeof e.exercicios === 'object' ? e.exercicios : {};
      return e;
    } catch (err) {
      return estadoVazio();
    }
  }

  // Único ponto de entrada para pontos: adiciona um movimento ao livro-razão.
  // Perdas nunca passam do saldo, então o total não fica negativo.
  function lancar(e, tipo, pontos, ref, motivo) {
    if (pontos <= 0) return 0;
    var valor = pontos;
    if (tipo === 'perda') valor = Math.min(pontos, saldo(e));
    if (valor <= 0) return 0;
    e.movimentos.push({ ref: ref, tipo: tipo, pontos: valor, motivo: motivo, data: new Date().toISOString() });
    return valor;
  }

  function saldo(e) {
    return e.movimentos.reduce(function (total, m) {
      return total + (m.tipo === 'ganho' ? m.pontos : -m.pontos);
    }, 0);
  }

  function salvar(e) {
    try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch (err) { /* armazenamento indisponível */ }
  }

  function dataLocal(d) {
    var m = String(d.getMonth() + 1), dia = String(d.getDate());
    return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (dia.length < 2 ? '0' + dia : dia);
  }

  function registrarDia(e) {
    var hoje = dataLocal(new Date());
    if (e.dias.indexOf(hoje) < 0) e.dias.push(hoje);
  }

  // ---------- Consultas ----------
  function moduloPorId(id) {
    for (var i = 0; i < CATALOGO.length; i++) if (CATALOGO[i].id === id) return CATALOGO[i];
    return null;
  }

  function localizarAula(cod) {
    for (var i = 0; i < CATALOGO.length; i++) {
      var m = CATALOGO[i];
      for (var j = 0; j < m.aulas.length; j++) {
        if (m.aulas[j].cod === cod) return { modulo: m, indice: j, aula: m.aulas[j] };
      }
    }
    return null;
  }

  function todasAsAulas() {
    var lista = [];
    CATALOGO.forEach(function (m) { m.aulas.forEach(function (a) { lista.push({ modulo: m, aula: a }); }); });
    return lista;
  }

  function aulaConcluida(cod) { return estado().concluidas.indexOf(cod) >= 0; }

  function provaAprovada(id) {
    var p = estado().provas[id];
    return !!(p && p.aprovado);
  }

  function gatilhos() {
    return CATALOGO.filter(function (x) { return x.tipo === 'modulo'; });
  }

  function moduloLiberado(id) {
    var m = moduloPorId(id);
    if (!m || m.tipo === 'preparacao') return true;
    var lista = gatilhos();
    var pos = lista.indexOf(m);
    if (pos <= 0) return true;
    return provaAprovada(lista[pos - 1].id);
  }

  function aulaLiberada(cod) {
    var loc = localizarAula(cod);
    if (!loc) return false;
    if (!moduloLiberado(loc.modulo.id)) return false;
    if (loc.indice === 0) return true;
    return aulaConcluida(loc.modulo.aulas[loc.indice - 1].cod);
  }

  function estadoAula(cod) {
    if (aulaConcluida(cod)) return 'concluida';
    return aulaLiberada(cod) ? 'atual' : 'bloqueada';
  }

  function provaLiberada(id) {
    var m = moduloPorId(id);
    if (!m || !m.prova) return false;
    if (!moduloLiberado(id)) return false;
    return m.aulas.every(function (a) { return aulaConcluida(a.cod); });
  }

  function estadoProva(id) {
    if (provaAprovada(id)) return 'concluida';
    return provaLiberada(id) ? 'atual' : 'bloqueada';
  }

  function estadoModulo(id) {
    var m = moduloPorId(id);
    if (!m) return 'bloqueado';
    var todasConcluidas = m.aulas.every(function (a) { return aulaConcluida(a.cod); });
    if (m.prova ? provaAprovada(id) : todasConcluidas) return 'concluido';
    if (!moduloLiberado(id)) return 'bloqueado';
    var algumaAula = m.aulas.some(function (a) { return aulaConcluida(a.cod); });
    return (algumaAula || provaLiberada(id)) ? 'andamento' : 'disponivel';
  }

  function aulasConcluidasTotal() { return estado().concluidas.length; }

  function unidadesConcluidas() {
    return gatilhos().filter(function (m) { return estadoModulo(m.id) === 'concluido'; }).length;
  }

  function totalTentativas() {
    var provas = estado().provas;
    return Object.keys(provas).reduce(function (soma, k) { return soma + (provas[k].tentativas || 0); }, 0);
  }

  function sequencia() {
    var dias = estado().dias;
    var cursor = new Date();
    if (dias.indexOf(dataLocal(cursor)) < 0) {
      cursor.setDate(cursor.getDate() - 1); // hoje ainda não estudou: a sequência pode continuar de ontem
    }
    var n = 0;
    while (dias.indexOf(dataLocal(cursor)) >= 0) {
      n += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }

  function proximaAula() {
    var lista = todasAsAulas();
    for (var i = 0; i < lista.length; i++) {
      if (!aulaConcluida(lista[i].aula.cod)) return lista[i];
    }
    return null;
  }

  // ---------- Ações ----------
  function marcarAulaConcluida(cod) {
    if (!aulaLiberada(cod)) return false;
    var e = estado();
    if (e.concluidas.indexOf(cod) < 0) {
      e.concluidas.push(cod);
      lancar(e, 'ganho', XP_AULA, cod, 'Aula ' + cod + ' concluída');
    }
    registrarDia(e);
    salvar(e);
    return true;
  }

  function registrarProva(id, acertos, total) {
    if (!provaLiberada(id) || !total) return null;
    var e = estado();
    var p = e.provas[id] || { tentativas: 0, melhor: 0, aprovado: false };
    var pct = acertos / total;
    p.tentativas += 1;
    p.melhor = Math.max(p.melhor, acertos);
    if (!p.aprovado && pct >= APROVACAO) {
      p.aprovado = true;
      lancar(e, 'ganho', XP_PRIMEIRA_PROVA, 'prova-' + id, 'Prova do módulo ' + id + ' aprovada');
      registrarDia(e);
    }
    e.provas[id] = p;
    salvar(e);
    return p;
  }

  // ---------- Exercícios ----------
  // chave = código da aula + '#' + número do exercício (ex.: '1.1#2')
  // resultado = { acertou: bool, erros: nº de erros antes do acerto, pulou: bool }

  // Pontos de um acerto, conforme as tentativas erradas antes dele
  function pontosDoAcerto(erros) {
    if (erros === 0) return PONTOS.acertoPrimeira;
    if (erros === 1) return PONTOS.acertoSegunda;
    return 0;
  }

  function exercicioRegistrado(chave) {
    return !!estado().exercicios[chave];
  }

  function exerciciosFeitos(cod) {
    var ex = estado().exercicios;
    return Object.keys(ex).filter(function (k) { return k.indexOf(cod + '#') === 0; }).length;
  }

  // Registra o resultado final de um exercício, uma única vez.
  // Devolve { situacao, ganho, perda } ou false se o exercício já tinha resultado.
  function registrarExercicio(chave, resultado) {
    var e = estado();
    if (e.exercicios[chave]) return false;
    var erros = resultado.erros || 0;
    var situacao = resultado.pulou ? 'pulo' : (resultado.acertou ? 'acerto' : 'erro');
    e.exercicios[chave] = { situacao: situacao, erros: erros };
    var ganho = 0, perda = 0;
    if (situacao === 'acerto') {
      ganho = lancar(e, 'ganho', pontosDoAcerto(erros), chave,
        'Exercício ' + chave + (erros === 0 ? ': acerto na 1ª tentativa' : ': acerto na 2ª tentativa'));
    }
    if (situacao === 'pulo') {
      perda = lancar(e, 'perda', PONTOS.pular, chave, 'Exercício ' + chave + ': pulado');
    }
    registrarDia(e);
    salvar(e);
    return { situacao: situacao, ganho: ganho, perda: perda };
  }

  // Placar de uma aula: pontos ganhos e perdidos nos exercícios dela, e quantos já foram resolvidos
  function placarAula(cod) {
    var e = estado();
    var prefixo = cod + '#';
    var ganhos = 0, perdas = 0;
    e.movimentos.forEach(function (m) {
      if (m.ref.indexOf(prefixo) !== 0) return;
      if (m.tipo === 'ganho') ganhos += m.pontos; else perdas += m.pontos;
    });
    return { ganhos: ganhos, perdas: perdas, saldoAula: ganhos - perdas, resolvidos: exerciciosFeitos(cod) };
  }

  // Totais gerais: pontos ganhos, perdidos e saldo
  function totais() {
    var g = 0, p = 0;
    estado().movimentos.forEach(function (m) { if (m.tipo === 'ganho') g += m.pontos; else p += m.pontos; });
    return { ganhos: g, perdas: p, total: g - p };
  }

  // Pontos de uma unidade: aulas (exercícios e conclusão) e prova
  function pontosDaUnidade(id) {
    var m = moduloPorId(id);
    var g = 0, p = 0;
    if (!m) return { ganhos: 0, perdas: 0 };
    var codigos = m.aulas.map(function (a) { return a.cod; });
    estado().movimentos.forEach(function (mv) {
      var base = mv.ref.split('#')[0];
      var pertence = codigos.indexOf(base) >= 0 || mv.ref === 'prova-' + id;
      if (!pertence) return;
      if (mv.tipo === 'ganho') g += mv.pontos; else p += mv.pontos;
    });
    return { ganhos: g, perdas: p };
  }

  // Primeira aula ainda não concluída do módulo, ou null se todas estiverem concluídas
  function proximaAulaDoModulo(id) {
    var m = moduloPorId(id);
    if (!m) return null;
    for (var i = 0; i < m.aulas.length; i++) {
      if (!aulaConcluida(m.aulas[i].cod)) return m.aulas[i].cod;
    }
    return null;
  }

  // Data do último movimento de pontos (usada para desempate no ranking)
  function ultimaPontuacao() {
    var lista = estado().movimentos;
    return lista.length ? lista[lista.length - 1].data : null;
  }

  // Histórico de pontos, do mais recente para o mais antigo
  function historico() {
    return estado().movimentos.slice().reverse();
  }

  function zerar() {
    salvar(estadoVazio());
  }

  window.PLN = {
    CATALOGO: CATALOGO,
    APROVACAO: APROVACAO,
    XP_AULA: XP_AULA,
    XP_PRIMEIRA_PROVA: XP_PRIMEIRA_PROVA,
    PONTOS: PONTOS,
    pontosDoAcerto: pontosDoAcerto,
    exercicioRegistrado: exercicioRegistrado,
    exerciciosFeitos: exerciciosFeitos,
    registrarExercicio: registrarExercicio,
    placarAula: placarAula,
    totais: totais,
    pontosDaUnidade: pontosDaUnidade,
    proximaAulaDoModulo: proximaAulaDoModulo,
    ultimaPontuacao: ultimaPontuacao,
    historico: historico,
    moduloPorId: moduloPorId,
    localizarAula: localizarAula,
    todasAsAulas: todasAsAulas,
    aulaConcluida: aulaConcluida,
    aulaLiberada: aulaLiberada,
    estadoAula: estadoAula,
    provaLiberada: provaLiberada,
    provaAprovada: provaAprovada,
    estadoProva: estadoProva,
    moduloLiberado: moduloLiberado,
    estadoModulo: estadoModulo,
    aulasConcluidasTotal: aulasConcluidasTotal,
    unidadesConcluidas: unidadesConcluidas,
    totalTentativas: totalTentativas,
    sequencia: sequencia,
    xp: function () { return saldo(estado()); },
    proximaAula: proximaAula,
    marcarAulaConcluida: marcarAulaConcluida,
    registrarProva: registrarProva,
    zerar: zerar,
    estado: estado
  };
})();
