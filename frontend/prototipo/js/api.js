/* Cliente da API do servidor (ver backend/README.md).
   Todo pedido vai com o cabeçalho X-Requested-With, exigido pelo servidor para pedidos que escrevem.
   Sem sessão (401), leva o estudante para a tela de login. */
(function () {
  'use strict';

  var PAGINAS_PUBLICAS = ['login.html', 'index.html', 'sobre.html'];

  function pedir(metodo, url, corpo) {
    var cabecalhos = { 'X-Requested-With': 'fetch', 'Accept': 'application/json' };
    var opcoes = { method: metodo, credentials: 'same-origin', headers: cabecalhos };
    if (corpo !== undefined) {
      cabecalhos['Content-Type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    return fetch(url, opcoes).then(function (resposta) {
      if (resposta.status === 204) return null;
      return resposta.json().catch(function () { return {}; }).then(function (dados) {
        if (resposta.ok) return dados;
        if (resposta.status === 401 && PAGINAS_PUBLICAS.indexOf(window.location.pathname.split('/').pop()) < 0) {
          window.location.href = 'login.html';
        }
        var erro = new Error(dados.mensagem || 'Não foi possível concluir a ação. Tente de novo.');
        erro.status = resposta.status;
        erro.codigo = dados.codigo || 'erro';
        erro.dados = dados;
        throw erro;
      });
    });
  }

  window.API = {
    get: function (url) { return pedir('GET', url); },
    post: function (url, corpo) { return pedir('POST', url, corpo); },
    put: function (url, corpo) { return pedir('PUT', url, corpo); },
    del: function (url) { return pedir('DELETE', url); }
  };
})();
