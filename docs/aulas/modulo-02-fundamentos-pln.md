# Aula 2 · Fundamentos de PLN: da frase aos tokens

**Módulo 2 · Fundamentos de linguagem natural**
Plano de aula em rascunho, para revisão da docente. Duração e critérios de avaliação a definir.

---

## 1. O que você vai aprender

- Explicar por que computadores precisam de etapas antes de "entender" um texto.
- Aplicar tokenização, normalização e remoção de stopwords em um texto real sobre a COVID-19.
- Comparar stemming e lematização e apontar onde cada um erra.
- Reconhecer ambiguidades e desafios do português brasileiro.

## 2. Entenda o conceito

Processamento de linguagem natural (PLN) é a área que estuda como computadores tratam a linguagem humana. Para um computador, uma notícia é uma sequência de caracteres. Antes de qualquer análise, ele precisa decidir o que conta como unidade (token), como tratar maiúsculas e pontuação, e quais palavras carregam pouca informação.

A linguagem também é ambígua. Em "vacina" e "vacinas" há a mesma ideia com formas diferentes. Em "casos", a palavra pode indicar ocorrências de doença ou situações particulares, e só o contexto desfaz a dúvida.

## 3. Como funciona

Pipeline desta aula, na ordem:

1. **Normalização:** converter para minúsculas e remover pontuação. Sem isso, "Vacina" e "vacina" viram termos diferentes.
2. **Tokenização:** separar o texto em unidades, em geral palavras. Decisões como tratar "Covid-19" como um token ou dois mudam a contagem.
3. **Stopwords:** remover palavras muito comuns ("de", "a", "para"). A lista depende do idioma e da tarefa.
4. **Stemming:** cortar sufixos por regras. É rápido, mas pode gerar radicais que não são palavras.
5. **Lematização:** reduzir à forma de dicionário (lema), usando análise morfológica. Exige um modelo de linguagem.

Pseudocódigo:

```
função preprocessar(texto, stopwords):
    texto ← minúsculas(texto)
    texto ← remover_pontuacao(texto)
    tokens ← separar_por_espacos(texto)
    tokens ← [t para t em tokens se t não está em stopwords e tamanho(t) > 2]
    retornar tokens
```

Exemplo em Python, sem dependências externas:

```python
import re

STOPWORDS = {"a", "o", "de", "do", "da", "em", "e", "para", "que", "se"}

def preprocessar(texto: str) -> list[str]:
    tokens = re.findall(r"\w+", texto.lower())  # \w inclui letras acentuadas
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]

print(preprocessar("A vacinação avança em São Paulo."))
# ['vacinação', 'avança', 'são', 'paulo']
```

Para lematização em português, a referência prevista na especificação é o spaCy. Ele exige baixar um modelo (`pt_core_news_sm`) e a saída depende da versão do modelo. Por isso, a aula deve mostrar a versão usada.

## 4. Exemplo na pandemia

**Texto de referência:** notícia da Folha, de 4 de maio de 2023, sobre a ampliação da vacina bivalente em São Paulo (corpus, item 44, ~240 palavras).

Pontos úteis para a aula:

- O texto cita datas, números e órgãos ("Prefeitura de São Paulo", "Secretaria Municipal de Saúde"). Isso prepara o módulo 8 (entidades).
- Aparecem "Covid-19", "Covid" e "COVID-19" em formas diferentes. Um bom exercício é perguntar se os três devem contar como o mesmo termo.
- Há números como "1 milhão" e "1.344.167". A tokenização trata esses números de formas diferentes.

Contexto numérico, vindo do PDF de dados oficiais (usar só como contexto, nunca como resultado de mineração): a vacinação no Brasil começou em 17 de janeiro de 2021, segundo o Ministério da Saúde. O PDF indica a fonte, mas não traz o link exato; a conferência deve ser feita no painel oficial antes da aula.

**Importante:** o texto da Folha tem direitos autorais. Na versão pública da plataforma, use o exemplo sintético abaixo, marcado como demonstração. O texto integral só deve aparecer em área privada, se a docente autorizar.

Exemplo sintético para a versão pública (texto próprio, não é notícia real):

> Exemplo sintético para demonstração. A prefeitura amplia a vacinação contra a COVID-19 para toda a população adulta e distribui novas doses às unidades básicas de saúde.

## 5. Experimente

No laboratório de texto, faça:

1. Cole o exemplo sintético e observe o passo a passo: normalização, tokenização e stopwords.
2. Cole um segundo texto de sua escolha, de tamanho semelhante, e compare os termos mais frequentes.
3. Conte "covid", "covid-19" e "19" separadamente. Explique o que aconteceu.
4. Com a função `preprocessar` acima, compare o resultado com a saída do laboratório.

Tarefa de lematização (com spaCy, fora do laboratório): processe "vacinas", "vacinação" e "vacinou" e registre os lemas. Explique se o resultado é o esperado.

## 6. Interprete o resultado

Perguntas para discussão:

- Remover stopwords melhora a análise em todos os casos? Quando pode prejudicar?
- Stemming e lematização dão o mesmo resultado? Em que situação o stemming erra?
- "Covid-19" deve virar um token ou dois? Quais as consequências para a contagem?
- Uma lista de palavras frequentes diz algo sobre a veracidade do texto? Por quê?

Limitações a destacar:

- A tokenização por espaços e regras simples não lida bem com siglas, números e hífens.
- Stemming e lematização dependem do idioma e da qualidade dos modelos.
- O texto de um único veículo representa a linha editorial dele, não o conjunto da informação sobre a pandemia.

## 7. Teste seu conhecimento

Questionário com 5 questões (rascunho):

1. Qual é o objetivo da normalização?
2. Por que a tokenização pode mudar o resultado da contagem?
3. Qual técnica tende a gerar radicais que não são palavras de dicionário: stemming ou lematização?
4. Por que uma lista de stopwords precisa ser adaptada ao idioma?
5. O que a frequência de palavras não consegue mostrar sobre um texto?

Cada alternativa deve ter feedback explicativo, como no protótipo.

## 8. Para aprofundar

Referências a definir após revisão da docente. Sugestões de temas, sem referência específica confirmada: documentação do spaCy para o português, e textos introdutórios sobre tokenização e stemming em PLN.

---

## Notas para a equipe

- **Dados:** o PDF de dados oficiais serve só como contexto. Antes da aula, cada número deve ser conferido no painel oficial.
- **Corpus:** o item 44 é o texto de referência para atividades privadas. Versões públicas usam o exemplo sintético.
- **Ferramentas:** o laboratório atual faz normalização, tokenização e stopwords. Stemming e lematização entram quando o serviço Python (`nlp-service`) estiver pronto.
- **Pendências:** confirmar a duração, os critérios de avaliação e as referências.
