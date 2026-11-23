/* Certificado (protótipo): pré-visualização com o nome digitado e validação do CPF.
   O certificado só pode ser solicitado quando os módulos exigidos forem concluídos. */
(function () {
  'use strict';

  // Dígitos verificadores do CPF (algoritmo oficial)
  function cpfValido(cpf) {
    var n = String(cpf).replace(/\D/g, '');
    if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
    function digito(base) {
      var soma = 0;
      for (var i = 0; i < base; i++) soma += parseInt(n.charAt(i), 10) * (base + 1 - i);
      var r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    }
    return digito(9) === parseInt(n.charAt(9), 10) && digito(10) === parseInt(n.charAt(10), 10);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var campo = document.getElementById('cert-nome');
    var previa = document.getElementById('previa-nome');
    var cpf = document.getElementById('cert-cpf');
    var ajudaCpf = document.getElementById('ajuda-cpf');

    if (campo && previa) {
      function atualizar() {
        var nome = campo.value.trim();
        previa.textContent = nome || 'Seu nome completo';
        previa.classList.toggle('vazio-texto', !nome);
      }
      campo.addEventListener('input', atualizar);
      atualizar();
    }

    // Validação do CPF: mensagem só ao sair do campo, para não atrapalhar a digitação
    if (cpf && ajudaCpf) {
      var base = ajudaCpf.textContent;
      cpf.addEventListener('blur', function () {
        var digitos = cpf.value.replace(/\D/g, '');
        if (!digitos) {
          ajudaCpf.textContent = base;
          ajudaCpf.className = '';
          cpf.removeAttribute('aria-invalid');
          return;
        }
        if (cpfValido(digitos)) {
          ajudaCpf.textContent = 'CPF válido. ' + base;
          ajudaCpf.className = 'ajuda-ok';
          cpf.removeAttribute('aria-invalid');
        } else {
          ajudaCpf.textContent = 'Este CPF não é válido. Confira os 11 dígitos.';
          ajudaCpf.className = 'ajuda-erro';
          cpf.setAttribute('aria-invalid', 'true');
        }
      });
    }
  });
})();
