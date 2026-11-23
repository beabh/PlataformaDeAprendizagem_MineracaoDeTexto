/* Teste de ponta a ponta do front-end: abre as telas com o servidor real (backend/), executa o JavaScript
   e simula o que o estudante faria. Requer o servidor rodando: BASE_URL (padrão http://127.0.0.1:8766).
   Uso: npm install && npm run teste */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8766';
const GABARITO_PROVA_1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'dados', 'provas.json'), 'utf8'))['1']
  .questoes.map((q) => q.correta);
// Conta nova a cada execução: o banco de teste mantém o progresso entre rodadas.
const EMAIL = `ana.${Date.now()}@teste.dev`;
const erros = [];
let passou = 0, falhas = 0;

function ok(cond, msg) {
  if (cond) { passou++; console.log('ok     ' + msg); } else { falhas++; console.log('FALHA  ' + msg); }
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function cookieDe(email, nome) {
  const r = await fetch(`${BASE}/auth/desenvolvimento?email=${encodeURIComponent(email)}&nome=${encodeURIComponent(nome)}`, { redirect: 'manual' });
  return r.headers.getSetCookie()[0].split(';')[0];
}

async function abrir(caminho, cookie) {
  const url = `${BASE}/${caminho}`;
  const html = await (await fetch(url, { headers: cookie ? { cookie } : {} })).text();
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => erros.push(caminho + ': ' + (e.message || e)));
  const dom = new JSDOM(html, {
    url, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      // O navegador envia o cookie da sessão; aqui o jsdom não tem fetch, então usamos o do Node.
      win.fetch = (u, o = {}) => fetch(new URL(u, win.location.href), { ...o, headers: { ...(o.headers || {}), ...(cookie ? { cookie } : {}) } });
    }
  });
  dom.window.addEventListener('error', (e) => erros.push(caminho + ' erro de janela: ' + e.message));
  await new Promise((r) => dom.window.addEventListener('load', r));
  return dom;
}

async function esperar(dom, condicao, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (condicao(dom.window.document)) return true; } catch (e) { /* ainda não existe */ }
    await dormir(50);
  }
  return false;
}

function botaoNo(doc, idCartao, padrao) {
  const art = doc.getElementById(idCartao);
  return art && [...art.querySelectorAll('button')].find((b) => padrao.test(b.textContent));
}

async function resolverPendente(dom, ordem, preencher) {
  const doc = dom.window.document;
  preencher(doc);
  const botao = botaoNo(doc, 'ex-' + ordem, /Responder|Tentar de novo/);
  if (!botao) throw new Error('exercício ' + ordem + ' não tem botão de resposta (já resolvido ou ausente)');
  botao.click();
  await esperar(dom, (d) => d.getElementById('ex-' + ordem) && d.getElementById('ex-' + ordem).classList.contains('resolvido'));
  await dormir(500); // a tela recarrega a aula inteira após cada resolução
}

(async () => {
  console.log('Servidor: ' + BASE + '\n');

  // ---------- Login e menu ----------
  const dl = await abrir('login.html', null);
  ok(dl.window.document.querySelector('form[action="/auth/desenvolvimento"]'), 'login: formulário de simulação aponta para a entrada de teste');

  const ana = await cookieDe(EMAIL, 'Ana Paula Souza');
  let d = await abrir('trilha.html', ana);
  await esperar(d, (doc) => doc.querySelector('[data-nome-conta]') && doc.querySelector('[data-nome-conta]').textContent === 'Ana Paula Souza');
  ok(d.window.document.querySelector('[data-nome-conta]').textContent === 'Ana Paula Souza', 'menu: mostra o nome vindo do servidor');
  ok(d.window.document.querySelector('[data-iniciais-conta]').textContent === 'AS', 'menu: iniciais corretas');
  await esperar(d, (doc) => doc.querySelector('a[data-codigo="P.1"]').className.includes('atual'));
  const doc0 = d.window.document;
  ok(doc0.querySelector('a[data-codigo="P.1"]').className.includes('atual'), 'trilha: P.1 aparece como disponível');
  ok(doc0.querySelector('a[data-codigo="2.1"]').className.includes('bloqueado'), 'trilha: 2.1 aparece bloqueada');
  ok(doc0.querySelector('[data-pontos-total]').textContent === '0', 'trilha: começa com zero pontos');

  // ---------- Aula com exercícios ----------
  d = await abrir('aula.html?aula=P.1', ana);
  await esperar(d, (doc) => doc.querySelectorAll('#lista-exercicios article').length === 3);
  ok(d.window.document.querySelectorAll('#lista-exercicios article').length === 3, 'aula P.1: três exercícios vindos do servidor');
  ok(!d.window.document.querySelector('#lista-exercicios').textContent.includes('Resposta certa'), 'aula P.1: a resposta certa não aparece antes de responder');

  await resolverPendente(d, 1, (doc) => { doc.getElementById('in-1').value = '8'; });
  ok(d.window.document.getElementById('ex-1').textContent.includes('Acertou na primeira tentativa: +10 pontos'), 'exercício 1 (digitar): acerto na primeira vale +10');
  await resolverPendente(d, 2, (doc) => { doc.getElementById('in-2').value = 'VACINA'; });
  ok(d.window.document.getElementById('ex-2').classList.contains('resolvido'), 'exercício 2: resposta digitada aceita sem diferença de maiúsculas');
  await resolverPendente(d, 3, (doc) => { doc.querySelector('input[name="resp-3"][value="0"]').checked = true; });
  await esperar(d, (doc) => doc.getElementById('botao-concluir') && !doc.getElementById('botao-concluir').disabled);
  ok(d.window.document.getElementById('placar-total').textContent === '30', 'placar: total de pontos após três acertos é 30');
  d.window.document.getElementById('botao-concluir').click();
  await esperar(d, (doc) => doc.getElementById('area-conclusao').textContent.includes('Aula concluída'));
  ok(d.window.document.getElementById('area-conclusao').textContent.includes('Você ganhou 10 pontos'), 'concluir aula: mostra +10 pontos');
  ok(d.window.document.querySelector('a[href="aula.html?aula=P.2"]'), 'concluir aula: oferece a próxima aula');

  // ---------- Aula bloqueada ----------
  d = await abrir('aula.html?aula=2.1', ana);
  await esperar(d, (doc) => !doc.getElementById('area-bloqueio').hidden);
  ok(d.window.document.getElementById('area-bloqueio').textContent.includes('Conclua a prova do módulo 1'), 'aula 2.1 bloqueada: aponta a prova do módulo 1');
  ok(d.window.document.querySelector('a[href="prova.html?modulo=1"]'), 'aula 2.1 bloqueada: link leva à prova do módulo 1');

  // ---------- Prova antes da liberação ----------
  d = await abrir('prova.html?modulo=1', ana);
  await esperar(d, (doc) => doc.getElementById('titulo-prova').textContent.includes('ainda não liberada'));
  ok(d.window.document.getElementById('titulo-prova').textContent.includes('ainda não liberada'), 'prova 1: não libera antes das aulas do módulo');

  // ---------- Aula 1.1 completa (com pulo) ----------
  d = await abrir('aula.html?aula=1.1', ana);
  await esperar(d, (doc) => doc.querySelectorAll('#lista-exercicios article').length === 4);
  await resolverPendente(d, 1, (doc) => { doc.querySelector('input[name="resp-1"][value="1"]').checked = true; });
  await resolverPendente(d, 2, (doc) => { doc.getElementById('in-2').value = 'token'; });
  // Pular o terceiro exercício (perde 2)
  const pular = botaoNo(d.window.document, 'ex-3', /Pular/);
  if (!pular) throw new Error('exercício 3 sem botão Pular');
  pular.click();
  await esperar(d, (doc) => doc.getElementById('ex-3') && doc.getElementById('ex-3').classList.contains('resolvido'));
  await dormir(500);
  ok(d.window.document.getElementById('ex-3').textContent.includes('Pulado: −2 pontos'), 'pulo: mostra a perda de 2 pontos');
  await resolverPendente(d, 4, (doc) => { doc.getElementById('in-4').value = 'não'; });
  await esperar(d, (doc) => doc.getElementById('botao-concluir') && !doc.getElementById('botao-concluir').disabled);
  d.window.document.getElementById('botao-concluir').click();
  await esperar(d, (doc) => doc.getElementById('area-conclusao').textContent.includes('Aula concluída'));
  // P.1 soma 40 (30 de exercícios + 10 da conclusão); 1.1 soma +38 (10+10-2+10+10 da conclusão). Total: 78.
  ok(d.window.document.getElementById('placar-total').textContent === '78', 'placar: total após 1.1 = 40 + 38 = 78 (valor: ' + d.window.document.getElementById('placar-total').textContent + ')');

  // ---------- Prova 1 ----------
  d = await abrir('prova.html?modulo=1', ana);
  await esperar(d, (doc) => doc.querySelectorAll('fieldset.questao').length === 10);
  const docP = d.window.document;
  ok(docP.querySelectorAll('fieldset.questao').length === 10, 'prova 1: dez questões vindas do servidor');
  ok(!docP.body.innerHTML.includes('"correta"'), 'prova 1: o gabarito não aparece na página');
  GABARITO_PROVA_1.forEach((c, i) => { docP.querySelector(`input[name="q${i}"][value="${c}"]`).checked = true; });
  docP.querySelector('form button[type="submit"]').click();
  await esperar(d, (doc) => doc.querySelector('[data-placar]') && doc.querySelector('[data-placar]').textContent.includes('Você acertou'));
  ok(d.window.document.querySelector('[data-placar]').textContent.includes('Você acertou 10 de 10'), 'prova 1: correção com todas as respostas certas');
  ok(d.window.document.querySelector('[data-placar]').textContent.includes('Prova aprovada'), 'prova 1: aprovada com 70% ou mais');

  // ---------- Painel, programa, classificação, perfil, certificado ----------
  d = await abrir('painel.html', ana);
  await esperar(d, (doc) => doc.querySelector('[data-xp]') && doc.querySelector('[data-xp]').textContent === '128');
  ok(d.window.document.querySelector('[data-xp]').textContent === '128', 'painel: pontos totais 78 + 50 da prova = 128 (valor: ' + d.window.document.querySelector('[data-xp]').textContent + ')');
  ok(d.window.document.querySelector('[data-proxima-titulo]').textContent.includes('P.2'), 'painel: próxima aula é P.2');

  d = await abrir('programa.html', ana);
  await esperar(d, (doc) => doc.querySelector('tr[data-modulo="1"] [data-acao]') && doc.querySelector('tr[data-modulo="1"] [data-acao]').textContent.trim() === 'Revisar');
  ok(d.window.document.querySelector('tr[data-modulo="1"] [data-acao]').textContent.trim() === 'Revisar', 'programa: módulo 1 concluído mostra Revisar');
  ok(d.window.document.querySelector('tr[data-modulo="2"] [data-acao]').textContent.trim() === 'Começar', 'programa: módulo 2 liberado mostra Começar');

  d = await abrir('classificacao.html', ana);
  await esperar(d, (doc) => doc.querySelector('#corpo-ranking tr') && doc.querySelector('#corpo-ranking tr').textContent.includes('sua linha'));
  const linhaEu = d.window.document.querySelector('#corpo-ranking tr.linha-voce');
  ok(linhaEu && linhaEu.textContent.includes('128') && linhaEu.textContent.includes('Ana S.'), 'classificação: sua linha mostra nome abreviado e 128 pontos (linha: ' + (linhaEu ? linhaEu.textContent.replace(/\s+/g,' ').trim() : 'nenhuma') + ')');

  d = await abrir('perfil.html', ana);
  await esperar(d, (doc) => doc.getElementById('perfil-nome').value === 'Ana Paula Souza');
  const docPerfil = d.window.document;
  docPerfil.getElementById('perfil-nome').value = 'Ana Clara Souza';
  docPerfil.getElementById('perfil-meta').value = '30';
  docPerfil.getElementById('form-perfil').dispatchEvent(new d.window.Event('submit', { cancelable: true, bubbles: true }));
  await esperar(d, (doc) => doc.getElementById('aviso-perfil').textContent.includes('Perfil salvo'));
  ok(d.window.document.getElementById('aviso-perfil').textContent.includes('Perfil salvo'), 'perfil: salvar mostra confirmação');
  await esperar(d, (doc) => doc.querySelector('[data-nome-conta]').textContent === 'Ana Clara Souza');
  ok(d.window.document.querySelector('[data-nome-conta]').textContent === 'Ana Clara Souza', 'perfil: o nome novo aparece no menu na mesma tela');

  d = await abrir('certificado.html', ana);
  await esperar(d, (doc) => doc.getElementById('estado-cert') && !doc.getElementById('estado-cert').hidden);
  const docC = d.window.document;
  ok(docC.getElementById('estado-cert').textContent.includes('Para solicitar o certificado'), 'certificado: lista o que falta');
  ok(docC.getElementById('estado-cert').textContent.includes('Concluir todas as aulas do módulo 2'), 'certificado: cita as aulas que faltam');
  ok(docC.querySelector('#form-certificado button[type="submit"]').disabled, 'certificado: botão desabilitado enquanto faltar etapa');

  // ---------- Sem erros de script ----------
  ok(erros.length === 0, 'nenhum erro de script nas telas' + (erros.length ? ': ' + erros.join(' | ') : ''));

  console.log(`\n${passou} passaram, ${falhas} falharam.`);
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(2); });
