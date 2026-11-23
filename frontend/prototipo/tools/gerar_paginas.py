#!/usr/bin/env python3
"""Gera as partes repetidas do protótipo a partir do catálogo em js/progresso.js.

Gera:
- trilha.html (caminho de aulas e provas)
- programa.html (tabela do programa)
- menu lateral (sidebar) de todas as páginas da área do estudante

Uso: python3 tools/gerar_paginas.py   (a partir da pasta prototipo/)
"""
import html
import os
import re

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(RAIZ)

# ---------- Catálogo (lido de js/progresso.js) ----------
src = open('js/progresso.js', encoding='utf-8').read()
BLOCOS = re.findall(
    r"\{ id: '([^']+)', titulo: '([^']+)', tipo: '(\w+)', prova: (true|false), aulas: \[(.*?)\] \}",
    src, re.S)
CATALOGO = []
for mid, titulo, tipo, prova, aulas in BLOCOS:
    lst = re.findall(r"cod: '([^']+)', titulo: '([^']+)'", aulas)
    CATALOGO.append({'id': mid, 'titulo': titulo, 'tipo': tipo, 'prova': prova == 'true', 'aulas': lst})

TEMAS = {
    'P': ('Preparação com Python aplicado a textos da pandemia', 'Strings, listas, dicionários, Counter e leitura de TXT e CSV'),
    '1': ('Introdução à mineração de texto', 'Dados estruturados e não estruturados, etapas do processo e relação com PLN'),
    '2': ('Fundamentos de linguagem natural', 'PLN, corpus, tokens, normalização, stopwords, stemming, lematização e desafios do português'),
    '3': ('Preparação e limpeza de dados textuais', 'Corpus, ruídos, duplicatas, padronização e considerações éticas'),
    '4': ('Frequência e representação textual', 'Frequência, n-gramas, Bag of Words, TF-IDF, cosseno e embeddings'),
    '5': ('Análise de sentimentos', 'Léxicos, modelos supervisionados e limitações com ironia e negação'),
    '6': ('Classificação automática de textos', 'Treino e teste, Naive Bayes, regressão logística, métricas e Transformers'),
    '7': ('Modelagem de tópicos', 'Descoberta de assuntos, agrupamento, LDA e interpretação'),
    '8': ('Reconhecimento de entidades nomeadas', 'Pessoas, organizações, locais e datas, com erros comuns'),
    '9': ('Desinformação e análise crítica', 'Limites dos classificadores, viés de datasets e checagem de fatos'),
    '10': ('Projeto prático final', 'Análise textual completa, da seleção dos textos à interpretação'),
}

E = lambda s: html.escape(s, quote=True)

# ---------- Ícones (SVG, traço) ----------
def svg(corpo, tamanho=18):
    return (f'<svg width="{tamanho}" height="{tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{corpo}</svg>')

ICONES = {
    'painel': svg('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'),
    'trilha': svg('<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a4 4 0 0 0 0-8H8a4 4 0 0 1 0-8h8"/>'),
    'programa': svg('<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>'),
    'laboratorio': svg('<path d="M9 3h6"/><path d="M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7.5 15h9"/>'),
    'glossario': svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    'certificado': svg('<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>'),
    'perfil': svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    'professor': svg('<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>'),
    'visao': svg('<path d="M3 12h18M3 6h18M3 18h12"/>'),
    'modulos': svg('<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/>'),
    'estudantes': svg('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 20a5 5 0 0 1 6 0"/>'),
    'desempenho': svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    'voltar': svg('<path d="M15 18l-6-6 6-6"/>'),
    'classificacao': svg('<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
}

# ---------- Menu lateral ----------
GRUPOS = [
    ('Estudo', [('painel.html', 'painel', 'Painel'), ('trilha.html', 'trilha', 'Trilha de aprendizagem'), ('programa.html', 'programa', 'Programa'), ('classificacao.html', 'classificacao', 'Classificação')]),
    ('Ferramentas', [('laboratorio.html', 'laboratorio', 'Laboratório de texto'), ('glossario.html', 'glossario', 'Glossário')]),
    ('Conta', [('certificado.html', 'certificado', 'Certificado')]),
]

def sidebar(pagina, grupos, rotulo):
    # Bloco da conta no topo da gaveta: nome salvo no perfil e link para a página de perfil.
    conta = ('<div class="conta-bloco">'
             '<a class="conta-link" href="perfil.html" data-manter-sessao>'
             '<span class="avatar" data-iniciais-conta aria-hidden="true">E</span>'
             '<span class="conta-texto"><strong data-nome-conta>Estudante</strong>'
             '<small>Clique aqui para acessar o seu perfil</small></span>'
             '</a></div>')
    partes = [f'<aside class="sidebar" id="menu-lateral" aria-label="{rotulo}">', conta, f'<nav aria-label="{rotulo}">']
    for nome, itens in grupos:
        partes.append(f'<p class="grupo">{E(nome)}</p>')
        partes.append('<ul>')
        for alvo, icone, texto in itens:
            base = alvo.split('#')[0]
            atual = ' aria-current="page"' if base == pagina and '#' not in alvo else ''
            dados = '' if alvo.startswith('programa.html') else ' data-manter-sessao'
            partes.append(f'<li><a href="{alvo}"{dados}{atual}><span class="ico">{ICONES[icone]}</span><span>{E(texto)}</span></a></li>')
        partes.append('</ul>')
    partes.append('</nav></aside>')
    return '\n    '.join(partes)

PAGINAS_ESTUDANTE = ['painel.html', 'trilha.html', 'programa.html', 'classificacao.html', 'aula.html', 'laboratorio.html',
                     'glossario.html', 'certificado.html', 'perfil.html', 'prova.html']

for arq in PAGINAS_ESTUDANTE:
    if not os.path.exists(arq):
        continue
    h = open(arq, encoding='utf-8').read()
    novo = re.sub(r'<aside class="sidebar".*?</aside>', lambda m: sidebar(arq, GRUPOS, 'Menu do estudante'), h, count=1, flags=re.S)
    open(arq, 'w', encoding='utf-8').write(novo)


# ---------- Trilha ----------
def no_aula(cod, titulo, lado):
    return f'''
            <li class="{lado}">
              <a class="no" data-codigo="{cod}" href="aula.html?aula={cod}" data-manter-sessao aria-label="Aula {cod}: {E(titulo)}"><span class="codigo">{cod}</span></a>
              <span class="no-rotulo">{E(titulo)}</span>
            </li>'''

def no_prova(mid, lado):
    return f'''
            <li class="{lado}">
              <a class="no prova" data-prova="{mid}" href="prova.html?modulo={mid}" data-manter-sessao aria-label="Prova do módulo {mid}"><span class="codigo">P</span></a>
              <span class="no-rotulo">Prova da unidade</span>
            </li>'''

partes = ['''<div class="container">
        <p class="migalhas">Trilha</p>
        <h1 class="titulo-pagina">Trilha de aprendizagem</h1>
        <p class="subtitulo">Siga o caminho de uma aula para a outra. Cada aula conclui com um toque. A prova de cada unidade libera quando todas as aulas estiverem concluídas.</p>

        <div class="aviso-protótipo">
          Nesta versão, só a aula 1.1 tem conteúdo escrito. As demais aulas mostram a ordem da trilha e podem ser simuladas para testar o bloqueio.
        </div>

        <p id="aviso-acao" class="mensagem erro" role="status" hidden></p>

        <section class="pontuacao-trilha" aria-labelledby="titulo-pontuacao">
          <div class="placar-topo">
            <h2 id="titulo-pontuacao">Seus pontos</h2>
            <a class="btn btn-secundario" href="classificacao.html" data-manter-sessao>Ver classificação completa</a>
          </div>
          <dl class="placar-numeros">
            <div class="placar-item ganho"><dt>Ganhos</dt><dd data-pontos-ganhos aria-live="polite">0</dd></div>
            <div class="placar-item perda"><dt>Perdidos</dt><dd data-pontos-perdas aria-live="polite">0</dd></div>
            <div class="placar-item total"><dt>Pontuação total</dt><dd data-pontos-total aria-live="polite">0</dd></div>
          </dl>
          <p class="apoio">Pontuação total = ganhos − perdidos. Sua posição: <strong data-posicao>aparece quando a turma estiver cadastrada</strong>.</p>
        </section>

        <div class="duo-resumo" aria-label="Resumo do progresso">
          <span class="duo-chip">Sequência: <span data-sequencia>0</span> dias</span>
          <span class="duo-chip">Aulas concluídas: <span data-aulas-concluidas>0</span></span>
          <span class="duo-chip">Unidades concluídas: <span data-unidades-concluidas>0</span> de 10</span>
        </div>

        <div class="legenda-trilha" aria-label="Legenda">
          <span><span class="ponto concluido-p"></span> concluída</span>
          <span><span class="ponto atual-p"></span> disponível agora</span>
          <span><span class="ponto bloqueado-p"></span> bloqueada</span>
        </div>
''']
for m in CATALOGO:
    rotulo = 'Preparação' if m['tipo'] == 'preparacao' else f"Unidade {m['id']}"
    partes.append(f'''
        <section class="unidade" data-unidade="{m['id']}" aria-labelledby="u-{m['id']}">
          <header class="unidade-cab">
            <p class="rotulo">{E(rotulo)}</p>
            <h2 id="u-{m['id']}">{E(m['titulo'])}</h2>
            <p class="unidade-pontos" data-unidade-pontos="{m['id']}">Pontos desta unidade: <span data-ganhos-unidade>0</span> ganhos · <span data-perdas-unidade>0</span> perdidos</p>
          </header>
          <ol class="caminho">''')
    nos = [('aula', c, t) for c, t in m['aulas']]
    if m['prova']:
        nos.append(('prova', m['id'], None))
    for i, (tipo, c, t) in enumerate(nos):
        lado = 'esq' if i % 2 == 0 else 'dir'
        partes.append(no_aula(c, t, lado) if tipo == 'aula' else no_prova(c, lado))
    partes.append('''
          </ol>
        </section>''')
partes.append('\n      </div>')
conteudo = ''.join(partes)
h = open('trilha.html', encoding='utf-8').read()
h = re.sub(r'(<main id="conteudo" class="conteudo-app">)(.*?)(</main>)',
           lambda m: m.group(1) + '\n      ' + conteudo + '\n    ' + m.group(3), h, flags=re.S)
open('trilha.html', 'w', encoding='utf-8').write(h)

# ---------- Programa ----------
linhas = []
for m in CATALOGO:
    tema, topicos = TEMAS[m['id']]
    rotulo = 'Preparação' if m['tipo'] == 'preparacao' else m['id']
    prova_inicial = '—' if not m['prova'] else ''
    linhas.append(f'''
              <tr data-modulo="{m['id']}">
                <th scope="row">{E(rotulo)}</th>
                <td><a href="trilha.html#u-{m['id']}" class="link-modulo" data-link-modulo="{m['id']}">{E(tema)}</a></td>
                <td>{E(topicos)}</td>
                <td data-aulas>0/{len(m['aulas'])}</td>
                <td data-prova>{prova_inicial}</td>
                <td data-status></td>
                <td data-acao></td>
              </tr>''')

programa = f'''<section class="bloco">
      <div class="container">
        <p class="migalhas"><a href="index.html">Início</a> / Programa</p>
        <h1 class="titulo-pagina">Programa da disciplina</h1>
        <p class="subtitulo">As aulas são liberadas em sequência. A prova de cada módulo libera quando todas as aulas do módulo forem concluídas, e o módulo seguinte libera quando a prova for aprovada.</p>

        <div class="aviso-protótipo">
          Rascunho para revisão com a docente. Carga horária, critérios de avaliação e bibliografia ainda não foram definidos. O mínimo de aprovação nas provas (7 de 10) é um valor padrão a confirmar.
        </div>

        <p id="aviso-acao" class="mensagem erro" role="status" hidden></p>

        <div class="tabela-wrap">
          <table class="tabela">
            <caption class="sr-only">Módulos do programa, com aulas, prova e situação</caption>
            <thead>
              <tr><th scope="col">Módulo</th><th scope="col">Tema</th><th scope="col">Principais tópicos</th><th scope="col">Aulas</th><th scope="col">Prova</th><th scope="col">Situação</th><th scope="col">Ação</th></tr>
            </thead>
            <tbody>{''.join(linhas)}
            </tbody>
          </table>
        </div>
        <p class="subtitulo" style="font-size:.9rem; margin-top:.8rem">Clique no tema para abrir o módulo na trilha. Módulos bloqueados não podem ser abertos ainda.</p>

        <div style="margin-top:1.5rem; display:flex; gap:.6rem; flex-wrap:wrap; align-items:center">
          <button class="btn-fantasma" type="button" data-zerar>Zerar progresso deste protótipo</button>
          <button class="btn-fantasma" type="button" data-cancelar-zerar hidden>Cancelar</button>
        </div>
      </div>
    </section>
  </main>'''
h = open('programa.html', encoding='utf-8').read()
h = re.sub(r'<section class="bloco">.*?</main>', lambda m: programa, h, count=1, flags=re.S)
open('programa.html', 'w', encoding='utf-8').write(h)

print('gerado:', len(CATALOGO), 'módulos,', sum(len(m['aulas']) for m in CATALOGO), 'aulas')
