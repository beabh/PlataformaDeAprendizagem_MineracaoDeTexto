/* Sistema de estados visuais (protótipo).

   Princípio: cada estado tem cor, ícone e texto, para que o significado não dependa só da cor.
   - Disponível (laranja): pode ser feito agora. É a cor de ação do sistema.
   - Concluído (verde): já foi feito.
   - Em andamento (azul-marinho): começou, mas não terminou.
   - Bloqueado (cinza, tracejado): ainda não é possível, e a interface diz o motivo. */
(function () {
  'use strict';

  var ICONES = {
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    meio: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="5"/></svg>'
  };

  var TIPOS = {
    disponivel: { classe: 'estado-disponivel', icone: 'play', texto: 'Disponível' },
    concluido: { classe: 'estado-concluido', icone: 'check', texto: 'Concluído' },
    andamento: { classe: 'estado-andamento', icone: 'meio', texto: 'Em andamento' },
    bloqueado: { classe: 'estado-bloqueado', icone: 'lock', texto: 'Bloqueado' }
  };

  // Cria um selo com ícone e texto. "rotulo" sobrescreve o texto padrão.
  function selo(tipo, rotulo) {
    var t = TIPOS[tipo] || TIPOS.bloqueado;
    var s = document.createElement('span');
    s.className = 'estado ' + t.classe;
    s.innerHTML = ICONES[t.icone];
    s.appendChild(document.createTextNode(' ' + (rotulo || t.texto)));
    return s;
  }

  window.UI = { ICONES: ICONES, TIPOS: TIPOS, selo: selo };
})();
