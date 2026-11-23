# Classificação entre colegas: três modelos

Pergunta de partida: como funcionaria a classificação para pessoas da mesma turma, respondendo à mesma questão, com sala e conexão como no Kahoot?

Resumo: existem três formatos. O primeiro é o mais simples e o que recomendo para o projeto. O terceiro é o mais difícil e pode ficar como evolução.

## Modelo A: ranking da turma (recomendado para começar)

Cada estudante estuda no próprio ritmo. Os pontos acumulam, e a lista da turma é atualizada quando alguém salva um resultado.

- **Como as pessoas se conectam:** pela turma, não por sala. A docente cadastra a turma, e cada estudante entra nela com o próprio Google.
- **Como funciona:** `GET /api/ranking?turma=...` devolve a soma dos pontos de cada estudante, ordenada do maior para o menor.
- **Tempo real:** não é preciso. A lista pode ser atualizada ao abrir a página.
- **Esforço:** baixo a médio. Exige login, turma e a consulta de ranking.

Limite: não é "a mesma questão ao mesmo tempo". Cada um responde quando quiser.

## Modelo B: ligas semanais (estilo Duolingo)

A mesma ideia do modelo A, mas com grupos menores e um ciclo de tempo. Isso mantém a disputa viva, porque quem está atrás sempre vê uma chance de subir.

O Duolingo funciona assim: cada liga semanal reúne 30 usuários sorteados, ranqueados pelo XP acumulado em 7 dias. Um detalhe útil para o projeto: o agrupamento considera o nível de atividade das pessoas, e não a localização geográfica. Ou seja, quem está no mesmo grupo tende a ter ritmo parecido.

Para a disciplina, uma versão possível:

- Grupos de até 30 estudantes da mesma turma, formados por ordem de chegada ou por atividade.
- Pontos da semana (segunda a domingo) em vez de pontos totais.
- Ao fim da semana, os primeiros sobem de grupo e os últimos descem.
- Esforço: médio. Exige um agendador que feche a semana e distribua os grupos.

## Modelo C: sala ao vivo (estilo Kahoot)

A docente abre uma sala, aparece um código, os estudantes entram com o código, e todos respondem à mesma pergunta ao mesmo tempo. A pontuação sai por pergunta, e o ranking aparece depois de cada rodada.

No Kahoot, a pontuação depende da velocidade da resposta, e a plataforma tem um modo em que só o acerto conta. Para a disciplina, o modo "só acerto" é o mais adequado, porque a velocidade pode premiar quem responde sem pensar.

O que a sala exige:

- **Tempo real:** conexão permanente (WebSocket) ou um serviço de tempo real.
- **Estado da sala no servidor:** pergunta atual, quem entrou, quem respondeu, tempo restante.
- **Sincronização do cronômetro:** o servidor decide quando a pergunta fecha, não o navegador.
- **Reconexão:** o que acontece se a internet cair no meio da pergunta.
- **Moderação:** a docente encerra, pula ou reinicia.
- **Esforço:** alto. É o item mais difícil do projeto.

## Desafio da turma: a ponte entre A e C

Uma forma de ter "a mesma questão" sem sala ao vivo: a docente publica um conjunto de questões com janela de datas (por exemplo, de segunda a quarta). Todos respondem dentro da janela, e o ranking do desafio aparece no fim. É assíncrono, então usa a mesma infraestrutura do modelo A, com uma tabela a mais para o desafio.

## Recomendação

1. **Agora:** modelo A, com ranking da turma e a regra de desempate já escrita (quem chegou à pontuação antes fica à frente).
2. **Depois:** desafio da turma, se a docente quiser a dinâmica de "mesma questão".
3. **Só se houver tempo:** sala ao vivo. Ela pode ser feita com um serviço pronto de tempo real, sem construir o servidor de sincronização do zero.

## Perguntas para a docente

- Ela quer ranking contínuo (A), ligas semanais (B) ou uma sala ao vivo (C) em alguma aula?
- A turma será cadastrada pela docente, ou os estudantes entram com um código?
- O nome completo pode aparecer para os colegas, ou só o primeiro nome e a inicial?
- Quem não participar aparece na lista, com zero pontos, ou fica de fora?

## Regra de pontos (já implementada no protótipo)

A pontuação é a mesma nos três modelos: ganhos menos perdidos, somando exercícios, aulas e provas. A tabela de valores está em `docs/gamificacao-regras.md`.
