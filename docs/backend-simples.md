# Back-end: como funciona e o que acontece em cada ação

Objetivo: o servidor faz só o que o navegador não pode fazer com segurança (guardar dados, corrigir respostas, somar pontos e montar a classificação). Todo o resto é tela.

Stack prevista na especificação: Spring Boot + Spring Security + JPA + Flyway + PostgreSQL, com login pelo Google (OAuth/OIDC). Este documento descreve o comportamento; a implementação ainda não existe.

## 1. Tabelas

| Tabela | Campos principais | Observação |
|---|---|---|
| `usuario` | id, nome, email (do Google), cpf (criptografado, opcional), turma_id, criado_em | Sem senha. O CPF só existe para o certificado. |
| `turma` | id, nome, docente_id | Define quem aparece na mesma classificação. |
| `aula` | cod (ex.: `1.1`), modulo_id, ordem | Catálogo do programa. |
| `exercicio` | id, aula_cod, ordem, tipo (`escolha` ou `digitar`), enunciado, explicacao | Não guarda a resposta certa. |
| `exercicio_gabarito` | exercicio_id, valor_aceito | Acesso só pelo servidor. Comparação sem acentos e sem diferença de maiúsculas. |
| `tentativa` | id, usuario_id, exercicio_id, resposta, correta, criado_em | Histórico de cada resposta enviada. |
| `resultado_exercicio` | usuario_id, exercicio_id, situacao (`acerto`, `erro`, `pulo`), erros, criado_em | Uma linha por exercício. Impede pontuar duas vezes. |
| `movimento_pontos` | id, usuario_id, tipo (`ganho` ou `perda`), pontos, referencia, motivo, saldo_apos, criado_em | Livro-razão. O saldo é a soma; `saldo_apos` guarda o total depois do movimento. |
| `conclusao_aula` | usuario_id, aula_cod, concluida_em | Uma linha quando todos os exercícios da aula têm resultado. |
| `prova` | usuario_id, modulo_id, acertos, total, aprovado, criado_em | Aprovação com 70% de acertos (a confirmar). |

## 2. O que acontece em cada ação

**Entrar.** A pessoa clica em "Continuar com o Google". O Google devolve a identidade (e-mail e nome). O servidor cria o `usuario` na primeira vez e abre uma sessão com um cookie `HttpOnly`. O navegador nunca guarda senha nem token de acesso do Google.

**Abrir uma aula.** O navegador pede `GET /api/aulas/{cod}`. O servidor confere se a aula está liberada para aquele usuário (regra de sequência e de prova) e devolve o enunciado dos exercícios, sem o gabarito, e o que o usuário já resolveu.

**Responder um exercício.** O navegador envia `POST /api/exercicios/{id}/tentativas` com a resposta. O servidor:
1. compara a resposta com o gabarito;
2. grava a `tentativa`;
3. se acertou, ou se é o segundo erro, grava o `resultado_exercicio`, e cria o `movimento_pontos` correspondente, tudo em **uma única transação**;
4. devolve `correta`, os pontos e, se a questão terminou, a resposta certa com a explicação.

Se a transação falhar, nada é gravado. Assim a pontuação não fica pela metade.

**Pular.** `POST /api/exercicios/{id}/pulo` grava o `resultado_exercicio` com `situacao = pulo` e um movimento de perda de `min(2, saldo atual)`. O saldo nunca fica negativo.

**Concluir a aula.** `POST /api/aulas/{cod}/concluir` confere se todos os exercícios da aula têm `resultado_exercicio`. Se faltar algum, responde com erro e a lista do que falta. Se estiver tudo certo, grava a `conclusao_aula` e cria o movimento de +10 da aula. A conclusão já vem do servidor, então o navegador não pode marcar uma aula como concluída sozinho.

**Fazer a prova.** `POST /api/provas/{modulo}/tentativas` recebe as respostas, corrige no servidor e grava `prova`. Na primeira aprovação, cria o movimento de +50. A prova só aceita o envio se todas as aulas do módulo estiverem concluídas.

**Ver o placar.** `GET /api/aulas/{cod}/placar` soma os movimentos da aula, e `GET /api/me/pontos` soma os movimentos do estudante com o histórico. A trilha recebe o total em `GET /api/trilha`.

**Ver a classificação.** `GET /api/ranking` devolve a lista da turma do próprio estudante, ordenada (ver seção 4).

## 3. Regras que só o servidor aplica

1. **Gabarito fora do navegador.** No protótipo, o gabarito está no código JavaScript, então qualquer pessoa pode lê-lo. Isso é aceitável só para demonstrar o fluxo.
2. **Pontos uma única vez.** Se já existe `resultado_exercicio` para o exercício, o servidor não cria novo movimento.
3. **Perda limitada ao saldo.** `perda = min(valor, saldo atual)`.
4. **Conclusão exige exercícios.** Nenhuma aula é concluída sem todos os resultados.
5. **Liberação em sequência.** Aula, prova e módulo seguem as mesmas regras do protótipo: a aula N depende da N-1; a prova depende de todas as aulas do módulo; o módulo seguinte depende da prova aprovada.
6. **Ações sensíveis só do próprio usuário.** Nenhum endpoint devolve dados de outro estudante, exceto a classificação, que mostra só nome e pontos.

## 4. Classificação

A classificação é uma consulta de leitura sobre `movimento_pontos`. Não existe tabela própria, para que o placar e a classificação nunca divirjam.

```sql
SELECT u.id, u.nome,
       SUM(CASE WHEN m.tipo = 'ganho' THEN m.pontos ELSE -m.pontos END) AS total
FROM usuario u
JOIN movimento_pontos m ON m.usuario_id = u.id
WHERE u.turma_id = :turma
GROUP BY u.id, u.nome
ORDER BY total DESC, :desempate;
```

**Desempate (a confirmar):** quem chegou à pontuação atual antes fica à frente. Na prática, usa-se o `criado_em` do primeiro movimento em que `saldo_apos` atingiu o total atual e não voltou abaixo dele. Isso evita que quem pontua por último, com o mesmo total, pareça ter vantagem.

**Privacidade (a decidir):** mostrar nome completo para a turma pode expor os estudantes. Uma alternativa é mostrar só o primeiro nome e a inicial do sobrenome.

## 5. Endpoints mínimos

| Método e caminho | Faz |
|---|---|
| `GET /auth/google` | Inicia o login com o Google. |
| `GET /auth/google/retorno` | Recebe o retorno do Google, confere o e-mail verificado e abre a sessão. |
| `GET /auth/desenvolvimento` | Login de teste sem Google. Responde 404 em produção. |
| `POST /auth/sair` | Encerra a sessão. |
| `GET /api/me` | Dados do estudante da sessão atual. |
| `GET /api/trilha` | Módulos, aulas, estados, pontos e próxima aula. |
| `GET /api/aulas/{cod}` | Aula e exercícios sem gabarito, com o estado de cada um. |
| `POST /api/exercicios/{id}/tentativas` | Corrige a resposta e grava a tentativa. |
| `POST /api/exercicios/{id}/pulo` | Registra o pulo e a perda. |
| `POST /api/aulas/{cod}/concluir` | Conclui a aula se todos os exercícios tiverem resultado. |
| `GET /api/aulas/{cod}/placar` | Ganhos, perdas e saldo da aula. |
| `GET /api/provas/{modulo}` | Questões da prova, sem gabarito, e a situação da prova. |
| `POST /api/provas/{modulo}/tentativas` | Corrige a prova e grava o resultado. |
| `GET /api/me/pontos` | Ganhos, perdidos, total e histórico. |
| `GET /api/ranking` | Classificação da turma do estudante. |
| `GET /api/perfil` e `PUT /api/perfil` | Lê e altera o nome de exibição, a meta em minutos e o curso. |
| `GET /api/certificado` e `POST /api/certificado` | Situação do certificado e emissão. |
| `GET /api/me/exportar` | Exporta os dados do estudante (LGPD). |
| `DELETE /api/me` | Exclui a conta e anonimiza os dados. |

Erros seguem um formato único: `{ "codigo": "...", "mensagem": "..." }`. O navegador mostra a mensagem ao lado da ação que falhou, não em um alerta.

## 6. Segurança e LGPD

- CPF criptografado e usado só na emissão do certificado. Pode ser apagado a pedido.
- Exclusão de conta remove dados pessoais e mantém os resultados anonimizados para estatística da disciplina.
- Todas as rotas de escrita exigem sessão válida e proteção contra CSRF.
- Logs não registram respostas nem CPF.

## 7. O que é diferente no protótipo

| Assunto | Protótipo | Versão final |
|---|---|---|
| Onde fica o progresso | localStorage do navegador | Banco de dados, vinculado à conta do Google |
| Gabarito | No código do navegador | Só no servidor |
| Classificação | Só a linha do próprio estudante | Consulta real sobre a turma |
| Pontos | Mesma tabela (`PLN.PONTOS`) e mesma regra de perda | Mesma regra, no servidor |

A regra de pontos está escrita uma vez em cada lado, com os mesmos valores, para que a migração seja direta.
