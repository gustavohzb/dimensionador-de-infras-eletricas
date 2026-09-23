# Trifólios espaçados de 2D — aba Infraestrutura

Arranjo de instalação em que os feixes de trifólio são dispostos numa fileira
única sobre o fundo da infraestrutura, separados por um vão livre de duas vezes
o diâmetro externo do cabo.

## Objetivo

Desenhar e conferir o arranjo. Hoje a aba Infraestrutura só sabe empacotar por
gravidade, com tudo encostado — não há como representar um trecho em que os
feixes são deliberadamente afastados, nem saber que largura ele exige.

## Fora de escopo, e por quê

**O fator de agrupamento não muda.** Existe regra na NBR 5410 (Tabela 42) e na
IEC 60364-5-52 dispensando a redução quando o vão entre cabos adjacentes passa
de duas vezes o diâmetro — é justamente para isso que se espaça. Mas o app não
registra essa regra hoje, em lugar nenhum, e introduzi-la mudaria resultado de
dimensionamento já entregue. Decisão do usuário: o fator continua saindo da
Tabela 42 pelo número de circuitos, como sempre. Conservador, e sem afirmar
procedência que não foi conferida contra a norma impressa.

Quando essa regra entrar, entra como mudança própria, com a referência exata
da norma registrada junto.

O que o fator conta continua sendo **só cabo de verdade**: `estimateCircuits`
percorre a lista de cabos do trecho e soma um circuito por trifólio. O vão de
2D é espaço vazio, não está na lista, e não soma nada — quatro trifólios
espaçados são quatro circuitos, os mesmos quatro de quando estão encostados.
O número segue editável à mão no painel de agrupamento.

Na prática, então, espaçar não dá crédito nenhum no cálculo: quatro trifólios
num leito dão 0,80 encostados ou espaçados. É o conservador, e é deliberado.

**Não persiste em projeto.** A tabela `projetos` do Supabase tem colunas
explícitas; um campo novo exige `ALTER TABLE`, que não pode ser feito pelo
código, e um insert com coluna inexistente quebraria o salvamento. O modo vive
na sessão. Para promover depois:

```sql
ALTER TABLE projetos ADD COLUMN trifolios_espacados boolean DEFAULT false;
```

**Não muda o trifólio encostado.** Os rótulos de fase e a fileira valem só no
modo espaçado. Nada do que já é desenhado hoje muda de aparência.

## Geometria

O feixe tem **2D de largura**: dois condutores lado a lado na base, e o de cima
cai no vale entre eles sem alargar o conjunto. Com vão livre de 2D, o passo
entre feixes é 4D.

| grandeza | fórmula | 4 trifólios Ø20 mm |
|---|---|---|
| largura do feixe | 2D | 40 mm |
| vão livre entre feixes | 2D | 40 mm |
| largura exigida | (2N − 1) · 2D | 280 mm |
| altura do feixe | D · (2 + √3) / 2 | 37,3 mm |

O vão é medido **de borda a borda**, não entre centros — é a distância livre do
desenho de referência. Fixo em 2D, sem campo para configurar: o método é esse.

A fórmula da largura vale para feixes de mesma bitola. Com bitolas diferentes
no mesmo trecho, o vão entre dois feixes vizinhos usa o **maior** dos dois
diâmetros — garante folga de ao menos 2D para os dois — e a largura passa a ser
a soma feixe a feixe, não uma fórmula fechada.

Os feixes entram na fileira na ordem em que foram adicionados ao trecho. Não há
reordenação por bitola: o desenho tem que refletir a lista que o usuário montou.

A fileira começa encostada na parede esquerda, sem vão de parede. É a mesma
convenção de desempate do motor de gravidade ("empata pela esquerda"), e deixa
o transbordo aparecer de um lado só, legível.

## Onde o código vive

`layoutCablesTrifolioEspacado(cables, trayWidth, trayHeight)` em `packing.js`,
irmã das três que já existem.

Função nova, e não um caso dentro de `lowestDrop`, porque aqui não há gravidade
a resolver: a fileira é determinística e fechada por aritmética. Enfiá-la no
motor de busca seria criar um caso especial dentro de um algoritmo que, nesse
arranjo, não tem nada para buscar.

Cabos que não são trifólio continuam caindo por gravidade **depois** da
fileira, com os feixes espaçados já valendo como obstáculos. Com o modo ligado
num trecho sem trifólio nenhum, não há fileira e tudo cai por gravidade — o
resultado é idêntico ao modo desligado, sem erro nem aviso. Isso exige que o
motor de gravidade aceite círculos pré-posicionados — hoje `placed` sempre
começa vazio. É a única alteração no motor existente, e é aditiva.

## Fases

Cada feixe recebe `R` e `S` na base e `T` no topo, e a ordem da base **alterna**
entre feixes vizinhos: `R S`, depois `S R`, depois `R S`. É o detalhe de
transposição do desenho de referência.

O rótulo é a letra em branco sobre o condutor, do mesmo jeito que o número de
vias já é desenhado nos multipolares. O app passa a ter noção de fase, que hoje
não tem — restrita a este arranjo.

A alternância é **desenho, não verificação**: o app não tem como saber como o
cabo foi puxado em campo. Vale como indicação de projeto.

## Estado e tela

`useCableTray` ganha `trifoliosEspacados` (booleano, começa desligado), com o
`resetAll` zerando junto. Uma chave perto da infraestrutura liga o modo, que
vale para o trecho inteiro.

Com o modo ligado aparece **largura necessária** ao lado da ocupação. É o que
faz a reprovação dizer quanto falta, em vez de só dizer não.

## Quando não cabe

Mesma convenção que `packing.js` já adota: deposita vazando de propósito e
deixa o `rectFits` reprovar. Não há recusa silenciosa nem encolhimento
automático do vão — encolher o vão descaracterizaria o arranjo que o usuário
pediu, e faria o desenho mentir sobre o que está instalado.

## Modo Buscar

Com o modo ligado, a busca ranqueia usando a fileira espaçada. Desligado, ela
continua exatamente como hoje.

Sem isso as duas telas discordariam sobre o mesmo trecho: a busca aprovaria um
leito de 200 mm que a tela de verificação desenha vazando.

## Testes

Geometria da fileira:
- passo de 4D, feixe de 2D, vão de 2D, conferidos por aritmética independente
- todos os feixes apoiados no fundo, na mesma altura
- bitolas diferentes: o vão usa o maior diâmetro dos dois vizinhos
- N feixes exigem (2N − 1)·2D; um a mais transborda e o `rectFits` reprova
- determinístico

Convivência:
- cabo solto no mesmo trecho não atravessa nenhum feixe da fileira
- a fileira não muda quando há só um trifólio (vão não se aplica)
- trecho sem trifólio nenhum com o modo ligado não quebra

Fases:
- `T` sempre no topo
- a base alterna `R S` / `S R` a cada feixe, começando em `R S`
- feixe único recebe `R S` / `T`

## Faseamento

1. Motor: `layoutCablesTrifolioEspacado` e os círculos pré-posicionados no
   motor de gravidade, com os testes de geometria.
2. Tela: a chave, o desenho com os rótulos de fase e a largura necessária.
3. Buscar: a busca honrando o modo.
