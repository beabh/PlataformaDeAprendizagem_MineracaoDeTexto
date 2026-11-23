# Back-end da plataforma de Mineração de Texto e PLN

API em FastAPI com PostgreSQL. Ela guarda o progresso, corrige as respostas no servidor,
registra os pontos, monta a classificação e emite os dados do certificado.
O mesmo servidor entrega as páginas de `frontend/prototipo`.

## Como rodar (desenvolvimento)

Requisitos: Python 3.11+ e PostgreSQL 14+.

```bash
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
createdb plataforma_pln                       # ou crie o banco pelo seu cliente
cp .env.example .env                          # ajuste PLN_DATABASE_URL se preciso
./.venv/bin/uvicorn app.main:criar_app --factory --reload --port 8000
```

Abra http://localhost:8000/ e use **Entrar como teste** (só existe em `PLN_AMBIENTE=desenvolvimento`):
`/auth/desenvolvimento?email=seu@email.dev&nome=Seu%20Nome`.

Na primeira execução, as tabelas são criadas e o catálogo (módulos, aulas, exercícios e provas)
é carregado a partir de `dados/*.json`.

## Testes

```bash
PLN_DATABASE_URL_TESTE=postgresql+psycopg://pln:pln@localhost:5432/plataforma_pln_teste \
  ./.venv/bin/python -m pytest -q
```

Os testes apagam e recriam o banco de testes a cada caso. Não use o banco de desenvolvimento.

## Login com Google

1. No Google Cloud Console, crie um **ID do cliente OAuth** do tipo "Aplicativo da Web".
2. Em **URIs de redirecionamento autorizados**, adicione `PLN_URL_PUBLICA/auth/google/retorno`
   (por exemplo `http://localhost:8000/auth/google/retorno`).
3. Coloque `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

Sem essas duas variáveis, `/auth/google` responde 503 com a mensagem de configuração.
Só são aceitas contas com e-mail verificado. Não há restrição de domínio nesta versão
(a decidir com a instituição: por exemplo, aceitar só e-mails institucionais).

## Regras que o servidor aplica

- **Gabarito fora do navegador.** Respostas certas e explicações só aparecem depois que o exercício é resolvido.
- **Pontos uma única vez.** Cada exercício tem um único resultado (`resultado_exercicio`, chave única).
  Cada lançamento acontece com o usuário travado (`SELECT ... FOR UPDATE`) e na mesma transação.
- **Perda limitada ao saldo.** Pular tira 2 pontos, mas nunca deixa o saldo negativo.
- **Liberação em sequência.** Aula N depende da N-1; a prova depende de todas as aulas do módulo;
  o módulo seguinte depende da prova aprovada.
- **Aprovação em 70%.** Calculada em inteiros (`acertos * 100 >= 70 * total`), sem erro de arredondamento.
- **CPF cifrado.** Só existe depois que o estudante pede o certificado, com validação do dígito verificador.
- **Proteção contra pedidos de outros sites.** Pedidos que escrevem precisam do cabeçalho `X-Requested-With: fetch`.

## Endpoints

| Método e caminho | O que faz | Função da interface |
|---|---|---|
| `GET /auth/google` · `GET /auth/google/retorno` | Login com Google | Botão "Continuar com o Google" |
| `GET /auth/desenvolvimento` | Login de teste (só em desenvolvimento) | Atalho local |
| `POST /auth/sair` | Encerra a sessão | Botão "Sair" |
| `GET /api/me` | Nome e e-mail do usuário logado | Cabeçalho |
| `GET /api/trilha` | Módulos, aulas, estados, pontos por unidade, sequência | Trilha de aprendizagem e programa |
| `GET /api/aulas/{codigo}` | Aula, exercícios (sem gabarito) e estado | Página da aula |
| `POST /api/exercicios/{id}/tentativas` | Corrige a resposta e lança os pontos | Botão "Responder" |
| `POST /api/exercicios/{id}/pulo` | Registra o pulo e a perda de 2 pontos | Botão "Pular" |
| `POST /api/aulas/{codigo}/concluir` | Conclui a aula (+10) se tudo foi resolvido | Botão "Concluir aula" |
| `GET /api/aulas/{codigo}/placar` | Pontos ganhos, perdidos e resolvidos da aula | Placar da aula |
| `GET /api/provas/{modulo}` | Questões da prova (sem gabarito) | Página da prova |
| `POST /api/provas/{modulo}/tentativas` | Corrige a prova; aprovação dá +50 uma vez | Enviar prova |
| `GET /api/me/pontos` | Ganhos, perdidos, total e histórico | Painel de pontos |
| `GET /api/ranking` | Classificação da turma (nome abreviado) | Classificação |
| `GET /api/perfil` · `PUT /api/perfil` | Nome de exibição, meta e curso | Meu perfil |
| `GET /api/certificado` | O que falta para o certificado | Página do certificado |
| `POST /api/certificado` | Valida o CPF e emite os dados do certificado | Emitir certificado |
| `GET /api/me/exportar` | Cópia dos dados do estudante (LGPD) | Privacidade |
| `DELETE /api/me` | Remove dados pessoais e encerra a sessão (LGPD) | Excluir minha conta |

Erros seguem um formato único: `{"codigo": "...", "mensagem": "..."}`.

## Estrutura

```
app/
  main.py          aplicação, middleware de proteção e entrega do site
  config.py        variáveis de ambiente
  banco.py         conexão com o PostgreSQL
  modelos.py       tabelas
  regras.py        pontos, aprovação, normalização e CPF (funções puras)
  servicos.py      operações do estudante (transações e travamento)
  rotas.py         endpoints /api
  rotas_auth.py    login com Google e login de teste
  catalogo.py      carga de módulos, aulas, exercícios e provas
  dependencias.py  sessão do banco e usuário logado
dados/             catálogo, exercícios e provas exportados do protótipo (tools/exportar_dados.js)
tests/             testes de regras e do fluxo completo
```

## Atualizar o conteúdo

O conteúdo vem de `frontend/prototipo/js/`. Depois de editar as aulas, exercícios ou provas ali:

```bash
node tools/exportar_dados.js
./.venv/bin/python -m app.catalogo --recarregar
```

## O que ainda não existe

- **Conteúdo:** só há exercícios para as aulas 1.1 e P.1 e a prova do módulo 1. Sem exercícios, a aula não
  pode ser concluída (resposta `aula_em_elaboracao`), então a trilha não avança além disso até o conteúdo ser escrito.
- **Gestão de turmas:** todos entram na turma `PLN_TURMA_PADRAO`. Não há tela para a docente criar turmas.
- **Certificado em PDF:** a API devolve os dados; o documento final ainda não é gerado.
- **Laboratório de texto:** continua rodando no navegador (sem envio ao servidor).
- **Migrações de banco:** as tabelas são criadas automaticamente. Para mudanças futuras, use Alembic.

## Publicar na internet

O servidor precisa de HTTPS público para o login com o Google funcionar. A imagem é construída a partir da raiz do repositório:

```
docker build -t plataforma-pln .
docker run -p 8000:8000 --env-file backend/.env plataforma-pln
```

Em produção, defina `PLN_AMBIENTE=producao`, `PLN_URL_PUBLICA` com o endereço HTTPS final, `PLN_SEGREDO_SESSAO`, `PLN_CHAVE_CPF`, `PLN_DATABASE_URL` (PostgreSQL), `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Sem as duas últimas o login com o Google responde 503. Se o Google não puder ser alcançado, a página mostra "Não foi possível conectar ao Google agora".
