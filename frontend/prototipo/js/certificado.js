/* Certificado: mostra o que falta, pré-visualiza o nome e envia os dados ao servidor.
   O servidor confere os módulos, valida o CPF e cifra o número antes de guardar. */
(function () {
  'use strict';

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

  function mostrar(texto, tipo) {
    var box = document.getElementById('estado-cert');
    if (!box) return;
    box.textContent = texto;
    box.className = 'mensagem ' + (tipo || 'info');
    box.hidden = false;
  }

  function faltas(lista) {
    var box = document.getElementById('estado-cert');
    if (!box) return;
    box.innerHTML = '';
    box.className = 'mensagem info';
    var p = document.createElement('p');
    p.textContent = 'Para solicitar o certificado, conclua estas etapas:';
    box.appendChild(p);
    var ul = document.createElement('ul');
    lista.forEach(function (f) {
      var li = document.createElement('li');
      li.textContent = f;
      ul.appendChild(li);
    });
    box.appendChild(ul);
    box.hidden = false;
  }

  function preencherDados(st) {
    if (st.nome) document.getElementById('cert-nome').value = st.nome;
    if (st.email) document.getElementById('cert-email').value = st.email;
    var previa = document.getElementById('previa-nome');
    if (previa && st.nome) previa.textContent = st.nome;
  }

  function carregarStatus() {
    var botao = document.querySelector('#form-certificado button[type="submit"]');
    window.API.get('/api/certificado').then(function (st) {
      preencherDados(st);
      if (st.emitido) {
        mostrar('Seu certificado já foi emitido. Para corrigir os dados, entre em contato com a secretaria.', 'ok');
        if (botao) botao.disabled = true;
        return;
      }
      if (st.pronto) {
        if (botao) botao.disabled = false;
        mostrar('Você concluiu todas as etapas. Confira os dados e solicite o certificado.', 'ok');
      } else {
        if (botao) botao.disabled = true;
        faltas(st.faltas);
      }
    }).catch(function (err) {
      mostrar(err.message, 'erro');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var campo = document.getElementById('cert-nome');
    var previa = document.getElementById('previa-nome');
    var cpf = document.getElementById('cert-cpf');
    var ajudaCpf = document.getElementById('ajuda-cpf');
    var form = document.getElementById('form-certificado');

    if (campo && previa) {
      var atualizar = function () {
        var nome = campo.value.trim();
        previa.textContent = nome || 'Seu nome completo';
        previa.classList.toggle('vazio-texto', !nome);
      };
      campo.addEventListener('input', atualizar);
      atualizar();
    }

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

    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var botao = form.querySelector('button[type="submit"]');
        var dados = {
          nome: document.getElementById('cert-nome').value.trim(),
          email: document.getElementById('cert-email').value.trim(),
          cpf: document.getElementById('cert-cpf').value.trim()
        };
        if (botao) botao.disabled = true;
        window.API.post('/api/certificado', dados).then(function (r) {
          mostrar('Certificado emitido. Código de verificação: ' + r.codigo_verificacao + '. CPF registrado como ' + r.cpf + '.', 'ok');
        }).catch(function (err) {
          if (err.dados && err.dados.faltas) faltas(err.dados.faltas);
          else mostrar(err.message, 'erro');
          if (botao) botao.disabled = false;
        });
      });
    }

    carregarStatus();
  });
})();
