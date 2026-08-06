# Quiz Essencial · texto completo das 18 telas

Fonte de verdade do texto **antes** de virar HTML. Spec: `docs/superpowers/specs/2026-08-06-quiz-vsl-essencial-design.md` §4 (telas) e §3 D9 (provas).

**Ordem de exibição:** 12 perguntas + 5 telas de conteúdo + 1 captura = 18 telas. Depois: "analisando" (2,5 s) e resultado.

**Contrato com o código.** O `id` de cada opção é normativo. Ele casa com a tabela `OPENS` de `quiz/js/diagnostico.mjs`, e é o `value` que o HTML tem que emitir. Trocar um rótulo é seguro; trocar um `id` quebra o diagnóstico **em silêncio**.

**Regras que valem em toda linha desta página** (§4.9 do CLAUDE.md + estilo da marca):

- Nenhum ativo, fundo, emissor ou instituição citado como recomendação.
- Nenhuma promessa nem projeção de rentabilidade, passada ou futura.
- Nenhuma interpretação tributária afirmada como certa para o leitor.
- Sem travessão. Sem a construção de negar para depois corrigir.
- Todo número em tela tem fonte primária verificada. Ver `task-4-report.md` para autor, ano, N, desenho e trecho de sustentação.

---

## Tela 0 · Abertura (a raiz)

> **A ORDEM DO ATENDIMENTO**
> **A → B → C → D**
> *Você não opera o joelho antes de estabilizar a via aérea.*
>
> # Em que degrau o seu dinheiro travou?
>
> 12 perguntas. No fim você vê em qual dos quatro degraus está, e qual ficou aberto atrás.
>
> **[ FAZER O DIAGNÓSTICO ]**
>
> Leva 2 minutos. Não é recomendação de investimento e nenhum ativo é citado.

---

# Bloco A · Estabilizar (via aérea)

## Tela 1 · Q1 · O fluxo

**Você sabe quanto sobra por mês, sem abrir planilha?**

| id | rótulo |
|---|---|
| `sei_numero` | Sei o número |
| `mais_ou_menos` | Sei mais ou menos |
| `varia_demais` | Varia demais para saber |
| `nao_faco_ideia` | Não faço ideia |

→ abre **A** em `varia_demais`, `nao_faco_ideia`

## Tela 2 · Q2 · A reserva

**Se a sua renda parasse hoje, quantos meses a sua vida atual sobrevive sem vender nada?**

| id | rótulo |
|---|---|
| `menos1` | Menos de 1 |
| `1a3` | 1 a 3 |
| `3a6` | 3 a 6 |
| `mais6` | Mais de 6 |

→ abre **A** em `menos1`, `1a3`

## Tela 3 · Q3 · A dívida

**Você carrega alguma dívida com juros acima de 1% ao mês, tipo cartão, cheque especial ou empréstimo pessoal?**

| id | rótulo |
|---|---|
| `sim_incomoda` | Sim, e me incomoda |
| `sim_pequena` | Sim, pequena |
| `so_financiamento` | Só financiamento de imóvel ou carro |
| `nenhuma` | Nenhuma |

→ abre **A** em `sim_incomoda`

---

## Tela 4 · Conteúdo 1 · O mecanismo

> ### 🔹 1 em 4
>
> **A ordem existe, e você já a usa todo dia.**
>
> No trauma ninguém opera antes de garantir via aérea. Em dinheiro a sequência é a mesma: estabilizar, proteger, investir, manter.
>
> Renda alta não fecha o primeiro degrau sozinha. Numa pesquisa com 2.148 pessoas nos Estados Unidos, **quase 1 em 4 das famílias que ganhavam entre US$ 100 mil e US$ 150 mil por ano respondeu que não conseguiria juntar US$ 2.000 em 30 dias**.
>
> Renda e ordem são coisas independentes. A segunda se constrói de baixo para cima.
>
> *fonte: Lusardi, Schneider & Tufano (2011), Brookings Papers on Economic Activity · 2.148 respondentes, Estados Unidos, 2009*
>
> **[ Continuar ]**

---

# Bloco B · Proteger (ventilação)

## Tela 5 · Q4 · A cobertura

**Se você não pudesse atender a partir de amanhã, por quanto tempo a sua família mantém o padrão de vida?**

| id | rótulo |
|---|---|
| `nao_sei_dizer` | Não sei dizer |
| `alguns_meses` | Alguns meses |
| `seguro_nao_sei_quanto` | Tenho seguro, não sei o quanto cobre |
| `seguro_sei_quanto` | Tenho seguro e sei exatamente o quanto cobre |

→ abre **B** em `nao_sei_dizer`, `alguns_meses`

## Tela 6 · Q5 · A separação

**Sua renda passa por PJ ou clínica. Como isso está separado do seu patrimônio pessoal?**

| id | rótulo |
|---|---|
| `tudo_misturado` | Está tudo misturado |
| `separado_no_papel` | Separado no papel, na prática não |
| `separado_contador` | Separado, com contador cuidando |
| `nao_tenho_pj` | Não tenho PJ |

→ abre **B** em `tudo_misturado`, `separado_no_papel`
→ `nao_tenho_pj` significa que a pergunta não se aplica. Nunca conta como aberto.

---

## Tela 7 · Conteúdo 2 · O custo que não aparece no extrato

> ### 🔹 R$ 3.000
>
> **Você não vê sair porque nunca entrou.**
>
> Custo de produto não chega como boleto. Ele é descontado de dentro da cota, todo dia útil, antes de o número aparecer na sua tela.
>
> Numa posição de R$ 300 mil, **cada ponto percentual de taxa de administração são R$ 3.000 por ano**. Todo ano, com o produto subindo ou caindo, sem uma linha no extrato mensal.
>
> A conta é aritmética simples: 1% de R$ 300 mil. Vale como exemplo do tamanho da coisa, e custo passado se repete com precisão de relógio.
>
> *fonte: A Tarifa Invisível do Médico, frente 02*
>
> **[ Continuar ]**

---

# Bloco C · Investir (circulação)

## Tela 8 · Q6 · Onde está

**Onde está a maior parte do que você já juntou?**

| id | rótulo |
|---|---|
| `poupanca` | Conta ou poupança do banco |
| `gerente_indicou` | No que o gerente indicou |
| `escolhi_sozinho` | Eu mesmo escolhi, na corretora |
| `carteira_com_alguem` | Carteira montada junto com alguém |

→ abre **C** em `poupanca`, `gerente_indicou`

## Tela 9 · Q7 · O aporte

**Com que regularidade entra dinheiro novo?**

| id | rótulo |
|---|---|
| `todo_mes` | Todo mês, valor definido |
| `quando_sobra` | Quando sobra |
| `quando_lembro` | Quando eu lembro |
| `parou` | Parou de entrar |

→ abre **C** em `quando_sobra`, `quando_lembro`, `parou`

---

## Tela 10 · Conteúdo 3 · O preço de pular a ordem

> ### 🔹 19%
>
> **Sem reserva, o imprevisto escolhe a hora da venda.**
>
> Na mesma pesquisa, diante de uma despesa inesperada de US$ 2.000 em 30 dias, **19% dos respondentes disseram que venderiam algo que possuem** para cobri-la.
>
> Investir com a base aberta funciona enquanto nada acontece. Quando acontece, a conta de curto prazo é paga com o que estava guardado para o longo, no mês que você não escolheu.
>
> O degrau A existe para tirar essa decisão das mãos do acaso.
>
> *fonte: Lusardi, Schneider & Tufano (2011), Brookings Papers on Economic Activity · 2.148 respondentes, Estados Unidos, 2009*
>
> **[ Continuar ]**

---

# Bloco D · Manter (reavaliação)

## Tela 11 · Q8 · A revisão

**Quando foi a última vez que alguém olhou a carteira inteira e mexeu?**

| id | rótulo |
|---|---|
| `ultimos_3_meses` | Nos últimos 3 meses |
| `ultimo_ano` | No último ano |
| `nao_lembro` | Não lembro |
| `nunca` | Nunca |

→ abre **D** em `nao_lembro`, `nunca`

## Tela 12 · Q9 · O imposto

**Como você resolve o imposto dos investimentos?**

| id | rótulo |
|---|---|
| `tenho_processo` | Tenho processo, sai no prazo |
| `contador_resolve` | Meu contador resolve |
| `correndo_abril` | Resolvo correndo em abril |
| `evito_pensar` | Evito pensar nisso |

→ abre **D** em `correndo_abril`, `evito_pensar`

---

## Tela 13 · Conteúdo 4 · Manter é onde quase todo mundo some

> ### 🔹 73%
>
> **Montar é o dia. Manter é o ano.**
>
> Um estudo acompanhou por dez anos os extratos reais de participantes de um plano de aposentadoria americano. Registro de conta, não questionário.
>
> **73% deles não mudaram nenhuma vez a alocação do que já estava aplicado**, no período inteiro.
>
> Ninguém decide sair do plano. O plano se move sozinho, junto com o mercado, enquanto ninguém olha.
>
> *fonte: Ameriks & Zeldes (2004), painel TIAA-CREF · n = 4.782 participantes, 1987 a 1996*
>
> **[ Continuar ]**

---

# Bloco de fechamento

## Tela 14 · Q10 · O gap

*(pergunta-chave: define o degrau de energia)*

**No último mês, com o que você gastou mais tempo pensando?**

| id | rótulo |
|---|---|
| `A` | Se dá para fechar o mês |
| `B` | O que aconteceria com a minha família se algo acontecesse comigo |
| `C` | Onde investir o que sobrou |
| `D` | Se a carteira que eu tenho ainda está certa |

→ o `id` é o degrau de energia, direto. Sem tabela de conversão.

## Tela 15 · Q11 · A faixa

*(a saída de cima)*

**Somando tudo que já está investido hoje, entre banco, corretora e previdência:**

| id | rótulo |
|---|---|
| `ate100` | Até R$ 100 mil |
| `100a300` | R$ 100 a 300 mil |
| `300a500` | R$ 300 a 500 mil |
| `acima500` | Acima de R$ 500 mil |

→ `acima500` troca o CTA do resultado (spec D10). O diagnóstico sai igual.

---

## Tela 16 · Conteúdo 5 · Plano vence vontade

> ### 🔹 8.461
>
> **Decidir antes o que fazer é o que muda o comportamento na hora.**
>
> Uma meta-análise reuniu **94 testes independentes, com 8.461 participantes**, sobre planos do tipo *"se acontecer X, então eu faço Y"*.
>
> O efeito sobre atingir a meta foi de magnitude média a grande (d = 0,65). A decisão tomada antes é o que carrega o resultado, no momento em que o impulso aparece.
>
> Domínios testados: saúde, estudo, consumo, metas pessoais e tarefas de laboratório.
>
> *fonte: Gollwitzer & Sheeran (2006), Advances in Experimental Social Psychology, vol. 38, p. 69 a 119*
>
> **[ Continuar ]**

---

## Tela 17 · Q12 · A urgência

**Em quanto tempo você quer a ordem de pé?**

| id | rótulo |
|---|---|
| `agora` | Agora, já passou da hora |
| `tres_meses` | Nos próximos 3 meses |
| `esse_ano` | Esse ano |
| `so_entender` | Só quero entender por ora |

→ não abre degrau. Entra no registro do lead e na nutrição.

---

## Tela 18 · Q13 · A captura

> ### Nome e e-mail para abrir o seu diagnóstico
>
> [ Nome ]
> [ E-mail ]
>
> O diagnóstico abre na tela, agora. Pelo e-mail você recebe também a carta que eu escrevo duas vezes por semana sobre dinheiro para médico. Sai quando quiser, com um clique.
>
> **[ VER MEU DIAGNÓSTICO ]**

Campos: `nome`, `email`. Sem telefone (spec D6). Sem Person no Twenty.

---

## Tela de espera · "analisando"

> Analisando as suas 12 respostas.
> *(2,5 s, barra de progresso, sem texto rotativo)*

---

## O resultado

**Layout:**

```
[ SEU DIAGNÓSTICO ]

{titulo}

O que está aberto atrás de você
· {abertos[0]}
· {abertos[1]}
· ...

Por que isso importa mais que a escolha do ativo
{porque}

O que fazer primeiro
{primeiroPasso}

{linhaSaidaDeCima}          ← só quando faixa = acima500

        [ {cta.label} → ]

Este diagnóstico é educativo e não constitui recomendação de investimento.
```

`{linhaSaidaDeCima}` = **"Seu caso passou do Essencial."**

⚠️ `resultado.mjs` **não emite essa linha** hoje: `ctaPor()` devolve só `label` e `href`. A página tem que renderizá-la a partir de `diag.faixa === "acima500"`, ou `resultado.mjs` ganha o campo. Sem isso, quem tem mais de R$ 500 mil vê o botão da consultoria sem a frase que o explica.

**As quatro variantes de título** (por `diag.gap`):

| caso | título |
|---|---|
| energia acima do real | *Você está no degrau C (Circulação) com o A (Via aérea) ainda aberto.* |
| energia igual ao real | *Você está no degrau certo, e travado nele.* |
| energia abaixo do real | *Você cuida da base enquanto o resto espera.* |
| nada aberto | *Sua ordem está de pé.* |

**Espelho de leitura do texto por degrau.** Fonte de verdade é `quiz/js/resultado.mjs` (`DEGRAUS` e `EM_ORDEM`). Se divergir, o arquivo `.mjs` manda. Reproduzido aqui porque o portão de aprovação do Hélio (spec §9.1) cobre o resultado.

**A · Via aérea**
- *Por que importa:* Todo investimento acima da reserva vira provisório enquanto a via aérea segue aberta: o primeiro imprevisto obriga a venda, no momento que você não escolhe. Fechar esse degrau primeiro é o que sustenta os outros três.
- *Primeiro passo:* Dimensione sua reserva de emergência: quanto custa o seu padrão de vida por mês, multiplicado pelos meses de folga que você quer ter.

**B · Ventilação**
- *Por que importa:* Sem cobertura clara e com PF e PJ misturados, um imprevisto de saúde ou na clínica pode alcançar o seu patrimônio pessoal e deixar a família sem renda ao mesmo tempo. Proteger vem antes de investir porque defende o que já foi construído.
- *Primeiro passo:* Levante o que você já tem de cobertura (vida e invalidez) e separe formalmente o que é PJ do que é patrimônio pessoal.

**C · Circulação**
- *Por que importa:* Escolher onde investir só porque alguém indicou, ou aportar só quando sobra, entrega o resultado ao acaso. Critério e regularidade pesam mais do que qualquer produto específico.
- *Primeiro passo:* Defina um valor fixo de aporte mensal e um critério simples para decidir onde ele entra, antes de olhar qualquer produto.

**D · Reavaliação**
- *Por que importa:* Uma carteira bem montada e nunca revisada se desalinha sozinha: o perfil muda, o cenário muda, e ninguém percebe até o extrato surpreender. Manter é o que faz a ordem dos outros três degraus continuar valendo com o tempo.
- *Primeiro passo:* Marque uma data fixa no ano para revisar a carteira inteira e organizar como o imposto de investimentos vai ser resolvido, sem deixar para abril.

**Nada aberto**
- *Por que importa:* Sua ordem está de pé porque cada degrau foi resolvido antes do próximo. Isso é raro, e é o que mantém o resultado protegido quando o cenário muda.
- *Primeiro passo:* Marque a próxima revisão da carteira inteira, para a ordem continuar de pé.

**CTA:**

| faixa | rótulo | destino |
|---|---|---|
| até R$ 500 mil | Ver o que fazer com isso | `/vsl` |
| acima de R$ 500 mil | Falar sobre a consultoria | WhatsApp da consultoria |
