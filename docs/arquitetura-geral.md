# Arquitetura geral: como as peças se conectam

Este documento explica o sistema de forma geral, sem detalhes de código. Para as tabelas e os endpoints, veja `docs/backend-simples.md`.

## 1. As três peças

```
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│    Navegador     │ ─────► │     Servidor     │ ─────► │   Banco de dados │
│ telas, cliques,  │ ◄───── │ regras, correção,│ ◄───── │ usuários, aulas, │
│ validação simples│        │ pontos, ranking  │        │ respostas, pontos│
└──────────────────┘        └──────────────────┘        └──────────────────┘
        │                            ▲
        └──── login com Google ──────┘
```

- **Navegador (o que já existe no protótipo):** mostra as telas e captura o que a pessoa faz. Pode validar formato (por exemplo, se o CPF tem 11 dígitos), mas não decide nada que valha pontos.
- **Servidor (ainda não existe):** é quem decide. Confere se a pessoa está logada, corrige a resposta, soma os pontos e monta a classificação.
- **Banco de dados:** guarda tudo de forma permanente: quem é a pessoa, o que respondeu e quantos pontos tem.

A regra prática: **o que vale ponto ou nota passa pelo servidor**. Se ficar só no navegador, qualquer pessoa pode alterar.

## 2. O que acontece quando alguém responde um exercício

1. A pessoa escolhe uma alternativa e clica em **Responder**.
2. O navegador envia a resposta ao servidor, junto com o cookie da sessão (prova de quem é a pessoa).
3. O servidor confere se a sessão é válida e se a aula está liberada para ela.
4. O servidor compara a resposta com o gabarito, que só ele conhece.
5. O servidor grava a tentativa, o resultado e os pontos, tudo numa só operação. Se uma parte falhar, nada é gravado.
6. O servidor devolve o resultado, e o navegador atualiza o placar.

Esse fluxo se repete em quase todas as ações: entrar, abrir aula, responder, pular, concluir, fazer a prova e ver a classificação.

## 3. Três caminhos possíveis

### Caminho 1: protótipo com documentação (esforço mínimo)

Mantém o que existe: telas no navegador, progresso salvo no próprio navegador e regras escritas. A classificação mostra só a própria linha.

- **Entrega:** o fluxo completo, demonstrável, sem dados reais.
- **Limite:** não tem login real, não guarda progresso entre computadores e não tem classificação da turma.
- **Quando usar:** se o prazo for curto ou se a banca aceitar um protótipo funcional com a arquitetura descrita.

### Caminho 2: serviço pronto para login, banco e tempo real (esforço médio)

Usa uma plataforma de back-end pronta, como Supabase ou Firebase. Elas já oferecem login com Google, banco de dados e atualização em tempo real. A lógica de correção fica numa função do próprio serviço, que roda no servidor.

- **Entrega:** login com Google, progresso salvo, correção segura, conclusão de aula e prova, e classificação da turma.
- **Vantagem:** menos código para escrever e manter.
- **Limite:** usa uma ferramenta de terceiros, e a especificação do projeto cita outra stack.

### Caminho 3: stack da especificação (esforço alto)

Spring Boot com Spring Security, JPA, Flyway e PostgreSQL, com Docker Compose, mais um serviço Python (FastAPI) para o processamento de linguagem natural.

- **Entrega:** a arquitetura completa do projeto.
- **Limite:** é o caminho com mais código, mais configuração e mais pontos de falha.
- **Observação:** o serviço Python não é necessário para o laboratório, porque ele roda no navegador. Ele só faria sentido se o projeto precisasse processar grandes volumes de texto no servidor.

## 4. Recomendação

Se a disciplina permitir outra stack, o **Caminho 2** dá a melhor relação entre entrega e esforço. Se a stack da especificação for obrigatória, o **Caminho 3** continua possível, mas a ordem das entregas precisa ser ainda mais enxuta.

Em qualquer caminho, a ordem de construção é a mesma:

1. **Login com Google** e cadastro do usuário.
2. **Progresso salvo** no servidor (aulas concluídas e pontos).
3. **Correção de exercícios** no servidor, com o gabarito fora do navegador.
4. **Conclusão de aula e prova**, com as regras de liberação.
5. **Classificação da turma** (modelo A em `docs/classificacao-turma.md`).
6. **Área da docente:** publicar módulos e ver o desempenho da turma.
7. **Salas ao vivo** (opcional, só se houver tempo).

Se o prazo apertar, as etapas 1 a 4 já entregam um sistema útil. A classificação pode vir depois, sem mudar o restante.

## 5. Riscos e como lidar

| Risco | O que fazer |
|---|---|
| Gabarito visível no navegador | Corrigir sempre no servidor (já previsto). |
| Dados pessoais (CPF, e-mail) | Guardar só o necessário, criptografar o CPF e permitir a exclusão da conta. |
| Prazo | Entregar a sequência 1 a 4 primeiro; deixar a classificação e a sala como evolução. |
| Conteúdo protegido (notícias completas) | Guardar os textos fora do repositório, como já foi feito. |
| Ninguém da equipe ter experiência com servidor | Caminho 2, ou uma rotina de testes simples antes de cada entrega. |

## 6. Glossário rápido

- **API:** conjunto de endereços (endpoints) que o navegador chama para pedir ou enviar dados.
- **Servidor:** programa que roda permanentemente e responde a essas chamadas.
- **Banco de dados:** onde os dados ficam guardados de forma permanente.
- **Sessão:** a forma como o servidor lembra que a pessoa já entrou, sem pedir senha a cada clique.
- **Transação:** um conjunto de gravações que acontecem todas juntas ou nenhuma.
- **Gabarito:** a resposta certa de um exercício, que só o servidor deve conhecer.
- **Tempo real:** a atualização aparece para todos sem recarregar a página (necessário para salas ao vivo).
