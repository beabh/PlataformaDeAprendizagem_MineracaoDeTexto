# Protótipo de interface — Mineração de Texto e PLN

Protótipo visual e navegável das telas da plataforma. Não há backend, banco de dados nem autenticação real: tudo roda no navegador.

## Como abrir

Abra `index.html` no navegador. Não é preciso instalar nada.

## Telas

| Arquivo | Tela | Área |
|---|---|---|
| `index.html` | Página inicial | Pública |
| `programa.html` | Programa da disciplina | Pública |
| `sobre.html` | Sobre o projeto, equipe e instituição | Pública |
| `login.html` | Entrar (somente Google) | Pública |
| `onboarding.html` | Primeiros passos: nome e meta diária | Estudante |
| `painel.html` | Painel com progresso, próxima aula e atalhos | Estudante |
| `trilha.html` | Trilha de módulos com bloqueios | Estudante |
| `aula.html` | Aula (use `?aula=1.1`), com abas de conteúdo, laboratório e recursos | Estudante |
| `glossario.html` | Glossário dos termos da disciplina (corpus, token, normalização etc.) | Estudante |
| `prova.html` | Prova do módulo (use `?modulo=1`), com 10 questões e aprovação | Estudante |
| `laboratorio.html` | Laboratório de texto (tokenização, stopwords, frequência) | Estudante |
| `certificado.html` | Certificado: dados para emissão e pré-visualização | Estudante |
| `perfil.html` | Informações pessoais e privacidade | Estudante |
| `professor.html` | Visão geral, módulos, estudantes e desempenho | Professor |

## Gamificação (valores padrão, a confirmar)

- Concluir uma aula: 10 XP.
- Primeira aprovação em uma prova: 50 XP.
- Sequência: dias seguidos com aula concluída ou prova aprovada.

## Regras de liberação

- A aula seguinte só abre quando a anterior do mesmo módulo está concluída.
- A prova do módulo só abre quando todas as aulas do módulo estão concluídas.
- O módulo seguinte só abre quando a prova do módulo anterior é aprovada (mínimo de 7 de 10, valor padrão a confirmar).
- O módulo de preparação (Python) não bloqueia o Módulo 1 e não tem prova (decisão a confirmar).

## Gerador das páginas repetidas

`tools/gerar_paginas.py` lê o catálogo de `js/progresso.js` e regenera a trilha, a tabela do programa e o menu lateral. Depois de mudar aulas ou módulos, rode:

```
python3 tools/gerar_paginas.py
```

## Arquivos de apoio

- `css/estilo.css`: estilo compartilhado, com paleta do Media Kit e modo claro/escuro.
- `js/comum.js`: menu, abas e links ainda não implementados.
- `js/progresso.js`: catálogo de módulos e aulas, regras de liberação e progresso (localStorage).
- `js/provas.js`: banco de questões das provas. Só o Módulo 1 tem questões nesta versão.
- `js/prova.js`: correção da prova, feedback por questão e registro do resultado.
- `js/aula.js`: conclusão da aula e navegação para a próxima.
- `js/trilha.js` e `js/programa.js`: aplicam os bloqueios nas páginas de trilha e de programa.
- `js/laboratorio.js`: as etapas de normalização, tokenização, stopwords e frequência, implementadas de fato.
- `js/sessao.js`: preenche nome e meta a partir da URL (simulação, sem autenticação).
- `js/laboratorio.js`: laboratório de texto.

## O que é real e o que é simulado

- **Real:** o laboratório processa o texto digitado e o questionário corrige as respostas.
- **Simulado:** o login, os dados do estudante e os certificados. O progresso das aulas e das provas é salvo só no navegador, e o botão "Zerar progresso" da página do programa limpa esse registro. Nas aulas sem conteúdo escrito, o botão simula a conclusão.
- **Não implementado:** exportação CSV/JSON, gravação de perfil, emissão de certificado, área do professor com dados reais.

## Pendências

- Logotipo: aguardando autorização de uso.
- Nomes, biografias, instituição e docente: a definir.
- Critério de conclusão para certificado: a definir pela docente.
- Conteúdo escrito das aulas além da 1.1.
- Banco de questões das provas dos módulos 2 a 10 e de Python.
- Migração para Next.js e Spring Boot conforme a especificação.
