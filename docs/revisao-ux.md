# Revisão de UX: o que pode ser melhorado em cada tela

Critérios usados: princípios de Don Norman (visibilidade, feedback, affordance, hierarquia, restrições, prevenção de erro), heurísticas de Nielsen (como estado do sistema, controle do usuário, consistência, prevenção de erros, reconhecimento em vez de memorização) e WCAG 2.2 AA (contraste, foco visível, nomes acessíveis, mensagens de erro).

Prioridade: **A** = afeta a tarefa principal ou acessibilidade; **B** = melhora a clareza; **C** = acabamento.

Esta revisão foi feita lendo o código e percorrendo os fluxos nos testes, não olhando as telas num navegador real. Antes de decidir, vale conferir o visual em tela de celular e de computador.

## 1. Regras globais (valem para todas as telas)

| Item | Por quê | Prioridade |
|---|---|---|
| **Uma ação principal por tela**, sempre na mesma cor (laranja) e no mesmo lugar. As secundárias ficam em estilo de contorno ou texto. | Hierarquia clara: a pessoa sabe o próximo passo sem procurar. | A |
| **Cabeçalho mostra quem está logado** (nome e foto ou iniciais), com um menu de conta. | Visibilidade do estado do sistema. Hoje a pessoa não vê em qual conta está. | A |
| **Botão "Continuar de onde parou"** no cabeçalho, em todas as telas de estudo. | Leva à próxima aula de qualquer lugar, sem voltar ao painel. | B |
| **Feedback de salvamento** (mensagem curta: "Salvo", "Pontos registrados"). | Feedback imediato reduz a dúvida se a ação funcionou. | B |
| **Estados vazios explicados** ("ainda não há ... porque ..."), com o que fazer em seguida. | Evita tela em branco que parece erro. | B |
| **Rodapé com contato e aviso de privacidade** (LGPD: o que é guardado e por quê). | Transparência sobre dados pessoais, principalmente CPF e e-mail. | A |
| **Menu em gaveta**: botão de três traços no topo à esquerda, em todas as telas, abre a navegação sobre o conteúdo. Já implementado. | Padrão conhecido; o menu não ocupa espaço fixo na tela. | Feito |
| **Páginas de erro amigáveis** (404 e falha de conexão) com link para o início. | Recuperação de erro sem perder a sessão. | C |
| **Migalhas de pão consistentes** em todas as páginas internas. | Localização na hierarquia do site. | C |
| **Indicador de carregamento** (esqueleto ou texto "carregando") nas telas que buscam dados. | Visibilidade do sistema enquanto espera. | C |

## 2. Telas, uma por uma

### Início (`index.html`)
- Mostrar em três passos como funciona: entrar com Google, estudar a trilha, conferir o progresso. **B**
- Deixar explícito o que é protótipo e o que ainda é simulado, logo no início. **A**
- Link para o laboratório com um exemplo pronto, para a pessoa experimentar antes de entrar. **B**
- Rodapé com os contatos oficiais da instituição. **B**

### Login (`login.html`)
- Explicar por que só há login com Google e o que é pedido ao entrar. **A**
- Mensagem clara se o Google falhar ou se a conta não tiver e-mail. **A**
- Link para a política de privacidade (LGPD). **A**

### Onboarding (`onboarding.html`)
- Indicador de etapas (1 de 2) e opção de pular, sem obrigar a meta diária. **B**
- Explicar o que a meta muda na prática (quantas aulas cabem em 10, 15 ou 30 minutos). **B**

### Painel (`painel.html`)
- Um único cartão de "Próxima aula" com o botão principal; os outros atalhos em estilo secundário. **A**
- Meta diária com barra de progresso do dia, não só da semana. **B**
- Proteção de sequência: um dia de descanso por semana, para a pessoa não perder tudo por um dia. **B**
- Mostrar pontos e posição com link para a classificação. **B**

### Trilha (`trilha.html`)
- Marcar a posição atual ("Você está aqui") e rolar até ela ao abrir a página. **A**
- Botão fixo "Continuar" no celular quando a aula atual estiver fora da tela. **B**
- Mostrar o selo de unidade concluída (já há indicador; falta reforçar com ícone). **C**
- Explicar o bloqueio no próprio nó, não só ao clicar. **B**

### Programa (`programa.html`)
- Já ajustado: uma coluna de ação com um botão por módulo. **Feito**
- Em celular, a tabela vira cartões, para não exigir rolagem horizontal. **A**
- Botão de imprimir ou baixar o programa em PDF. **C**
- Separar "Zerar progresso" em uma área de testes, longe das ações normais. **B**

### Aula (`aula.html`)
- Placar com ganhos, perdidos e total, e destaque nos números que mudaram. **Feito**
- Em celular, deixar o botão Concluir fixo na parte de baixo, com a explicação do que falta. **A**
- Navegação de aula anterior e próxima no topo, além da de baixo. **B**
- Depois de responder, levar o foco para o resultado (leitores de tela anunciam; teclado também precisa seguir). **A**
- Tempo estimado de leitura e destaque dos termos do glossário no texto. **B**
- Opção "marcar dúvida" para voltar depois. **C**

### Exercícios (dentro da aula)
- Mensagem de erro mais útil em respostas digitadas: diferenciar grafia, acento e resposta diferente. **B**
- Mostrar o formato esperado da resposta (por exemplo, "digite apenas o número"). **B**
- Confirmação antes de pular, mostrando a perda de pontos. **A**

### Prova (`prova.html`)
- Indicador de progresso (questão 3 de 10) e navegação entre questões. **A**
- Revisão antes de enviar: lista das questões sem resposta, com confirmação. **A**
- Resultado com feedback por questão e o que estudar de novo. **B**
- Evitar cronômetro obrigatório, ou permitir estender o tempo (acessibilidade). **A**

### Laboratório (`laboratorio.html`)
- Já feito: análise ao vivo, carregar .txt e modo de documentos com TF-IDF. **Feito**
- Escolher um exemplo entre vários textos (vacinação, saúde, desinformação). **B**
- Busca por termo, mostrando a palavra no contexto (concordância). **B**
- Em celular, recolher as etapas em uma seção dobrável. **B**
- Explicar com um exemplo curto o que é cada etapa, antes da lista. **C**

### Glossário (`glossario.html`)
- Índice A–Z para pular de letra em letra. **B**
- Link de cada termo para as aulas em que ele aparece. **A**
- Botão de copiar o link do termo. **C**

### Certificado (`certificado.html`)
- Lista do que falta para liberar o certificado, com link para cada item. **A**
- Estilo de impressão: a pré-visualização sai limpa ao imprimir. **B**
- Validação do e-mail, além do CPF já validado. **B**
- Explicar o que acontece com o CPF e por quanto tempo ele fica guardado. **A**

### Perfil (`perfil.html`)
- Avatar com iniciais e aviso de salvamento. **C**
- Área de conta com "Baixar meus dados" e "Excluir minha conta" (direitos da LGPD). **A**
- O e-mail vem do Google e deve aparecer como somente leitura, com a explicação. **B**

### Classificação (`classificacao.html`)
- Destacar a linha da própria pessoa, com a posição. **B**
- Explicar o desempate no próprio painel (já feito). **Feito**
- Opção de aparecer só com primeiro nome e inicial. **A**
- Filtro por período (semana, total) quando houver turma. **C**

### Sobre (`sobre.html`)
- Nomes da equipe e da docente, com o papel de cada um. **B**
- Aviso de que é um projeto acadêmico sem fins lucrativos, e de que o logo está sob uso a confirmar. **B**


## 3. Ordem sugerida

1. **Agora (A):** cabeçalho com identidade, botão fixo no celular na aula, confirmação ao pular, prova com progresso e revisão, privacidade e LGPD no login e no perfil, classificação com opção de privacidade.
2. **Depois (B):** atalhos, feedback de salvamento, estados vazios, glossário A–Z, exemplos no laboratório.
3. **Acabamento (C):** PDF do programa, avatar, filtros, impressão.
