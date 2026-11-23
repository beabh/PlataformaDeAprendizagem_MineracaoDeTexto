# Regras de gamificação e exercícios (proposta para validação)

Status: **proposta**. Os valores abaixo estão implementados no protótipo e devem ser confirmados pela docente antes de virarem regra final.

## 1. Base de pesquisa

- **Kahoot** pontua o acerto pela velocidade: a fórmula reduz a pontuação conforme o tempo de resposta cresce, e acertos abaixo de 0,5 s recebem o máximo. Como a velocidade pesa, o próprio Kahoot criou o modo *Accuracy*, em que só o acerto conta, porque a velocidade estimula respostas apressadas em questões complexas. Também existe *Answer Streak Bonus*: pontos extras por acertos seguidos, com teto após a sequência 5.
- **Duolingo** trocou o sistema de corações (perdia-se um coração a cada erro) pelo sistema de **energia**, porque a punição pelo erro não favorecia o aprendizado. Com a energia, errar não tira energia na versão atual, segundo a própria empresa, que diz recompensar o acerto.

Decisão de desenho: **o erro não tira pontos já conquistados nem bloqueia a aula**, e a velocidade não conta. A recompensa vem do acerto e da constância. O único custo é o de pular, e a tela mostra esse custo antes da escolha.

## 2. Regras de pontuação

| Situação | Pontos |
|---|---|
| Acerto na 1ª tentativa | +10 |
| Erro na 1ª tentativa | nenhum ponto perdido; a questão pode ser tentada de novo |
| Acerto na 2ª tentativa | +5 |
| Erro na 2ª tentativa | 0, mostra-se a resposta certa e a explicação |
| Pular a questão | −2 (limitado ao saldo; a resposta certa e a explicação aparecem) |
| Concluir uma aula (todos os exercícios resolvidos) | +10 XP da aula |
| Primeira aprovação em prova | +50 XP |

- O XP total nunca fica abaixo de zero.
- Pontos são acumulados por exercício, uma única vez. Não é possível repetir uma questão para ganhar pontos.

## 3. Regras de conclusão

- A aula só é concluída quando **todos** os exercícios dela estiverem resolvidos (acertados, com erro final ou pulados).
- A prova do módulo (10 questões) só abre quando todas as aulas do módulo estiverem concluídas.
- A aprovação na prova exige 70% de acertos (a confirmar).

## 4. Ranking (estilo Kahoot)

Ranking entre pessoas precisa de backend e de usuários reais. Na versão estática do protótipo ele **não é simulado**, para não exibir dados falsos. Na versão final, o ranking deve usar os pontos por exercício já registrados e ser exibido apenas com pessoas da mesma turma.

## 5. Pontos em aberto para a docente

1. Confirmar os valores de pontos e de pulo.
2. Decidir se o modo "velocidade" deve existir em algum momento (hoje não existe).
3. Confirmar se a prova exige 70% ou outro percentual.
4. Confirmar se o ranking será por turma ou geral.

## 6. Como o saldo é calculado

Todo ponto entra como um movimento em um livro-razão: ganho ou perda, com a referência (exercício ou aula), o motivo e a data. O saldo é a soma dos movimentos. Assim a pessoa vê o que ganhou e o que perdeu, e o servidor faz a mesma conta sem guardar um total separado.
