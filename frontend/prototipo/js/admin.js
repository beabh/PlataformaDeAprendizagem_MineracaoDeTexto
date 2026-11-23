/* Painel da turma (admin.html): estudantes e desempenho por módulo.
   Só professores e administradores veem os dados; o servidor também confere. Nada é montado com innerHTML. */
(function () {
  'use strict';
  var PERFIS = ['estudante', 'professor', 'administrador'];

  function celula(texto) {
    var td = document.createElement('td');
    td.textContent = texto;
    return td;
  }

  function avisar(texto) {
    var aviso = document.getElementById('aviso-admin');
    aviso.textContent = texto;
    aviso.hidden = false;
  }

  function celulaPerfil(eu, estudante, aoMudar) {
    var td = document.createElement('td');
    if (eu.perfil !== 'administrador' || estudante.id === eu.id) {
      td.textContent = estudante.perfil;
      return td;
    }
    var seletor = document.createElement('select');
    seletor.setAttribute('aria-label', 'Perfil de ' + estudante.nome);
    PERFIS.forEach(function (p) {
      var opcao = document.createElement('option');
      opcao.value = p;
      opcao.textContent = p;
      if (p === estudante.perfil) opcao.selected = true;
      seletor.appendChild(opcao);
    });
    var botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-secundario-texto';
    botao.textContent = 'Salvar';
    botao.addEventListener('click', function () { aoMudar(estudante.id, seletor.value); });
    td.appendChild(seletor);
    td.appendChild(document.createTextNode(' '));
    td.appendChild(botao);
    return td;
  }

  function desenharEstudantes(eu, lista) {
    var corpo = document.getElementById('corpo-estudantes');
    corpo.textContent = '';
    lista.forEach(function (e) {
      var tr = document.createElement('tr');
      tr.appendChild(celula(String(e.id)));
      tr.appendChild(celula(e.nome));
      tr.appendChild(celula(e.email));
      tr.appendChild(celula(e.email_verificado ? 'Sim' : 'Não'));
      tr.appendChild(celula(String(e.pontos)));
      tr.appendChild(celula(String(e.aulas_concluidas)));
      tr.appendChild(celula(String(e.provas_aprovadas)));
      tr.appendChild(celulaPerfil(eu, e, mudarPerfil));
      corpo.appendChild(tr);
    });
  }

  function desenharModulos(lista) {
    var corpo = document.getElementById('corpo-modulos');
    corpo.textContent = '';
    lista.forEach(function (m) {
      var tr = document.createElement('tr');
      tr.appendChild(celula(m.codigo));
      tr.appendChild(celula(m.titulo));
      tr.appendChild(celula(String(m.alunos_aprovados)));
      tr.appendChild(celula(m.media_acertos_percentual === null ? '—' : m.media_acertos_percentual + '%'));
      corpo.appendChild(tr);
    });
  }

  var eu = null;

  function carregar() {
    return Promise.all([window.API.get('/api/admin/estudantes'), window.API.get('/api/admin/modulos')])
      .then(function (r) {
        desenharEstudantes(eu, r[0]);
        desenharModulos(r[1]);
      });
  }

  function mudarPerfil(id, perfil) {
    window.API.put('/api/admin/usuarios/' + id + '/perfil', { perfil: perfil })
      .then(carregar)
      .catch(function (erro) { avisar(erro.message); });
  }

  window.API.get('/api/me').then(function (dados) {
    eu = dados;
    if (dados.perfil !== 'professor' && dados.perfil !== 'administrador') {
      document.getElementById('sem-acesso').hidden = false;
      return;
    }
    document.getElementById('conteudo-admin').hidden = false;
    return carregar();
  }).catch(function (erro) { avisar(erro.message); });
})();
