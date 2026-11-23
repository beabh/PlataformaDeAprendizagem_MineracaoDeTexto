/* Comportamento compartilhado: tema, menu, abas e avisos de protótipo. */
(function () {
  'use strict';

  // ---------- Tema: fixo em claro (sem botão de troca nesta versão) ----------
  document.documentElement.setAttribute('data-theme', 'claro');

  // ---------- Menu (gaveta com botão de três traços, em todas as telas) ----------
  var botaoMenu = document.getElementById('menu-toggle');
  var gaveta = document.getElementById('menu-lateral');
  var fundo = document.getElementById('gaveta-fundo');
  if (botaoMenu && gaveta) {
    var aberta = function () { return gaveta.classList.contains('aberto'); };

    var abrir = function () {
      gaveta.classList.add('aberto');
      if (fundo) fundo.hidden = false;
      botaoMenu.setAttribute('aria-expanded', 'true');
      botaoMenu.setAttribute('aria-label', 'Fechar menu');
      var primeiro = gaveta.querySelector('a');
      if (primeiro) primeiro.focus();
    };

    var fechar = function (devolverFoco) {
      gaveta.classList.remove('aberto');
      if (fundo) fundo.hidden = true;
      botaoMenu.setAttribute('aria-expanded', 'false');
      botaoMenu.setAttribute('aria-label', 'Abrir menu');
      if (devolverFoco !== false) botaoMenu.focus();
    };

    botaoMenu.addEventListener('click', function () { aberta() ? fechar() : abrir(); });
    if (fundo) fundo.addEventListener('click', function () { fechar(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && aberta()) fechar();
    });
  }

  // ---------- Abas (uso: <div data-abas> com botões [role=tab] e painéis [data-painel]) ----------
  document.querySelectorAll('[data-abas]').forEach(function (grupo) {
    var abas = grupo.querySelectorAll('[role="tab"]');
    abas.forEach(function (aba) {
      aba.addEventListener('click', function () {
        abas.forEach(function (outra) {
          var ativa = outra === aba;
          outra.setAttribute('aria-selected', String(ativa));
          var painel = document.getElementById(outra.getAttribute('aria-controls'));
          if (painel) painel.hidden = !ativa;
        });
      });
    });
  });

  // ---------- Links que simulam ações ainda não implementadas ----------
  document.querySelectorAll('[data-em-breve]').forEach(function (el) {
    el.addEventListener('click', function (ev) {
      ev.preventDefault();
      var msg = document.getElementById('mensagem-global');
      if (msg) {
        msg.textContent = 'Esta função ainda não está implementada no protótipo.';
        msg.className = 'mensagem erro';
      }
    });
  });
  // ---------- Conta: nome e iniciais vêm do servidor (/api/me) ----------
  var preencherConta = function () {
    if (!window.API || !document.querySelector('[data-nome-conta], [data-nome], [data-iniciais-conta]')) return;
    window.API.get('/api/me').then(function (me) {
      var nome = me.nome || 'Estudante';
      var partes = nome.split(/\s+/).filter(Boolean);
      var iniciais = partes.length
        ? (partes[0].charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '')).toUpperCase()
        : 'E';
      document.querySelectorAll('[data-nome-conta], [data-nome]').forEach(function (el) { el.textContent = nome; });
      document.querySelectorAll('[data-iniciais-conta]').forEach(function (el) { el.textContent = iniciais; });
    }).catch(function () { /* sem sessão, o api.js leva para o login */ });
  };
  document.addEventListener('DOMContentLoaded', preencherConta);
  window.PLNConta = { atualizar: preencherConta };

  // ---------- Logo da instituição: se não carregar, mostra o nome no lugar ----------
  function trocarPorTexto(img) {
    var span = document.createElement('span');
    span.className = 'logo-chip-texto';
    span.textContent = 'UNILINS';
    img.replaceWith(span);
  }
  document.querySelectorAll('img.logo-unilins').forEach(function (img) {
    img.addEventListener('error', function () { trocarPorTexto(img); });
    if (img.complete && img.naturalWidth === 0) trocarPorTexto(img);
  });

})();
