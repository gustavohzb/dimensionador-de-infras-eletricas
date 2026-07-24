// Histórico de atualizações do app.
//
// Cada entrada é UM update. A versão não é escrita à mão: sai da posição na
// lista (a primeira é 0.00 e cada update seguinte soma 0.01), então nunca há
// como duas entradas terem a mesma versão nem como um número ficar para trás.
// Para lançar um update novo, acrescente no FIM da lista — a versão atual do
// app (APP_VERSION, exibida na aba Sobre) acompanha sozinha.
//
// tipo: "novo" (funcionalidade nova) | "melhoria" | "correcao" |
//       "dados" (catálogo ou tabela normativa) | "interno" (qualidade/testes)

export const TIPOS = {
  novo: { label: "Novidade", classe: "bg-copper-50 text-copper-700 dark:bg-copper-500/15 dark:text-copper-300" },
  melhoria: { label: "Melhoria", classe: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  correcao: { label: "Correção", classe: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  dados: { label: "Catálogo/Norma", classe: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  interno: { label: "Interno", classe: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300" },
};

const UPDATES = [
  {
    data: "2026-07-08",
    titulo: "Primeira versão do Dimensionador",
    tipo: "novo",
    itens: [
      "Dimensionamento de infraestruturas para cabos: eletrocalha, perfilado, leito, aramado e eletrodutos (NBR 5597, 5598, 5624 e PEAD 15715).",
      "Visualização física dos cabos acomodados por gravidade dentro da infraestrutura.",
      "Cálculo da taxa de ocupação conforme a NBR 5410.",
    ],
  },
  {
    data: "2026-07-08",
    titulo: "Projetos salvos na nuvem",
    tipo: "novo",
    itens: [
      "Salvar, carregar e apagar trechos completos (infraestrutura, dimensões e cabos) num banco de dados.",
      "O trabalho deixa de se perder ao fechar o navegador e pode ser aberto de outro computador.",
    ],
  },
  {
    data: "2026-07-08",
    titulo: "Título da aba do navegador corrigido",
    tipo: "correcao",
    itens: ["A aba do navegador mostrava o título padrão do gerador de projeto."],
  },
  {
    data: "2026-07-08",
    titulo: "Ciclo de vida do projeto: criar antes, salvar durante",
    tipo: "melhoria",
    itens: [
      "Antes, cada \"Salvar\" criava uma linha nova no banco e gerava duplicatas.",
      "Agora existe projeto ativo: dá para criar o projeto vazio e ir salvando o progresso nele enquanto trabalha.",
      "Opção de desvincular e salvar como cópia.",
    ],
  },
  {
    data: "2026-07-08",
    titulo: "Desvincular passa a zerar tudo",
    tipo: "correcao",
    itens: [
      "Antes, \"Desvincular\" só parava de rastrear o projeto e deixava os cabos na tela.",
      "Agora zera infraestrutura, dimensões e cabos, com confirmação antes por ser destrutivo.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Busca reversa: a melhor infraestrutura para um conjunto de cabos",
    tipo: "novo",
    itens: [
      "Nova aba \"Buscar Infraestrutura\": você monta a lista de cabos e o app testa todas as infraestruturas e normas cadastradas.",
      "A confirmação é física, pelo mesmo motor de empacotamento por gravidade da visualização — não só pela conta de área %, que é necessária mas não suficiente.",
      "Botão \"Usar esta opção\" carrega o resultado direto no dimensionador.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Aba de cabos de comando (catálogo CABLIE)",
    tipo: "novo",
    itens: [
      "Catálogo de cabo de controle CABLIE, com seções até 4,0 mm² e de 2 a 35 condutores.",
      "Reaproveita todo o motor existente: empacotamento físico, ocupação e projetos salvos.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Cabo invisível na aba Comando",
    tipo: "correcao",
    itens: [
      "As abas ficam todas montadas ao mesmo tempo e cada visualização repetia os mesmos ids de filtro/gradiente do SVG; o desenho resolvia para uma aba oculta e o cabo sumia.",
      "Abas renomeadas para Força e Comando.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Septo divisor para trechos com Força e Comando juntos",
    tipo: "novo",
    itens: [
      "A NBR 5410 exige separação física entre os circuitos, então a busca passa a testar só infraestruturas que têm septo como acessório real (eletrocalha, perfilado e leito).",
      "A largura útil é dividida em dois compartimentos, cada um verificado fisicamente e contra o próprio limite de ocupação.",
      "Corrige junto o agrupamento da lista, que podia somar um cabo de força e um de comando de mesma seção como se fossem o mesmo item.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Número de condutores impresso na capa do cabo de comando",
    tipo: "melhoria",
    itens: [
      "Antes todo cabo de comando era desenhado igual, sem diferenciar quantos condutores tinha.",
      "A capa agora exibe o número no centro, como a marcação real desses cabos — decompor em 35 cores seria ilegível.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Cabo de comando sem brilho, preto sólido",
    tipo: "melhoria",
    itens: ["Removido o gradiente cilíndrico usado nos demais tipos, a pedido."],
  },
  {
    data: "2026-07-09",
    titulo: "Visualização da opção escolhida dentro da própria busca",
    tipo: "melhoria",
    itens: [
      "\"Usar esta opção\" não troca mais de aba: a visualização e a taxa de ocupação aparecem logo abaixo dos resultados.",
      "Dá para alternar entre as opções e ver cada uma no mesmo lugar.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Seta indicando o septo divisor na visualização",
    tipo: "melhoria",
    itens: ["Antes só existia a parede metálica entre os compartimentos, fácil de não perceber; agora uma seta âmbar aponta para ela."],
  },
  {
    data: "2026-07-09",
    titulo: "Taxa de ocupação desatualizada após adicionar cabos",
    tipo: "correcao",
    itens: [
      "A opção aplicada guardava ocupação e área congeladas do momento da busca; agora recalcula ao vivo a cada mudança no trecho, inclusive por compartimento.",
      "Corrige junto um travamento ao exibir a taxa quando a melhor opção era um eletroduto.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Diâmetro inventado nos catálogos deixa de existir",
    tipo: "correcao",
    itens: [
      "Quando a combinação seção/tipo/vias não existia na tabela, o app caía num número chute (4, 12 ou 8 mm) e desenhava o cabo com uma medida inventada, com a mesma cara de dado real.",
      "Agora falha com erro descritivo — era um alçapão pronto para mascarar um erro de catálogo futuro.",
    ],
  },
  {
    data: "2026-07-09",
    titulo: "Condutor do multipolar de 4 vias vazando da capa",
    tipo: "correcao",
    itens: ["O condutor furava a capa externa em cerca de 7%; raio e centro ajustados para a mesma folga usada no caso de 3 vias."],
  },
  {
    data: "2026-07-09",
    titulo: "Nós do aramado vazando da área útil",
    tipo: "correcao",
    itens: ["Os círculos ficavam centrados na borda, então metade de cada um era desenhada fora do retângulo útil."],
  },
  {
    data: "2026-07-09",
    titulo: "Nós do aramado do lado de fora, não de dentro",
    tipo: "correcao",
    itens: ["Os nós representam a parede do aramado e devem ficar por fora, como a chapa das demais estruturas, sem invadir o espaço dos cabos."],
  },
  {
    data: "2026-07-09",
    titulo: "Linha do aramado sobrepondo cabos e nós soltos nas quinas",
    tipo: "correcao",
    itens: [
      "Metade da espessura do traço invadia o espaço de apoio e os cabos pareciam afundar na linha.",
      "Os nós do fundo eram distribuídos por toda a largura, mas o trecho reto só existe entre as quinas curvas — os das pontas ficavam fora da linha.",
    ],
  },
  {
    data: "2026-07-10",
    titulo: "Importador de cabos direto do memorial de cálculo (Excel)",
    tipo: "novo",
    itens: [
      "Cole as linhas copiadas do Excel e o app reconhece a notação N#ESPEC dos memoriais, preenchendo a lista de cabos sozinho.",
      "Acha a coluna de seção entre as células coladas, não importa a posição.",
      "Cada componente é validado contra o catálogo: seção sem dado vira aviso, em vez de travar o import ou inventar medida.",
    ],
  },
  {
    data: "2026-07-10",
    titulo: "Limite de camadas na busca de infraestrutura",
    tipo: "novo",
    itens: [
      "Novo seletor \"Máximo de camadas\" (sem limite, 1 a 4): empilhar cabos demais piora a dissipação térmica, então a menor opção física nem sempre é a desejável.",
      "A camada sai do próprio resultado do empacotamento, por quem fisicamente sustenta o cabo — não de uma grade artificial.",
    ],
  },
  {
    data: "2026-07-10",
    titulo: "Contagem de camadas superestimando o empilhamento",
    tipo: "correcao",
    itens: [
      "Cabos de raios diferentes lado a lado no mesmo chão já têm centros em alturas distintas, e isso era lido como um apoiado sobre o outro.",
      "A busca rejeitava infraestruturas válidas sempre que o trecho misturava tamanhos de cabo — o caso comum.",
      "Cabo que toca o fundo ou a parede agora é camada 1 por definição.",
    ],
  },
  {
    data: "2026-07-10",
    titulo: "Busca limitada a 2 opções por tipo, com alturas diferentes",
    tipo: "melhoria",
    itens: [
      "Sai o cartão \"melhor opção\" em destaque; a lista fica única e uniforme.",
      "Cada tipo mostra no máximo duas opções, de alturas distintas, para dar comparação real em vez de duas variações quase iguais.",
    ],
  },
  {
    data: "2026-07-10",
    titulo: "Controle por ramal de quais grupos viram trifólio",
    tipo: "melhoria",
    itens: [
      "\"Analisar linhas\" mostra cada ramal do memorial com os componentes detectados antes de importar.",
      "Todo grupo de 3 unipolares de mesma seção vem com o marcador \"Trifólio\" pré-marcado, e você desmarca ramal por ramal antes de confirmar.",
    ],
  },
  {
    data: "2026-07-10",
    titulo: "Mensagem específica quando o limite de camadas rejeita tudo",
    tipo: "melhoria",
    itens: [
      "Com \"1 camada\" e trifólios na lista, a busca acusava excesso de ocupação — enganoso, já que um trifólio nunca cabe em 1 camada.",
      "Agora o app refaz a busca sem limite para descobrir o mínimo necessário e diz exatamente isso.",
    ],
  },
  {
    data: "2026-07-11",
    titulo: "Trifólio conta como 1 camada",
    tipo: "correcao",
    itens: ["O feixe é manuseado e instalado como peça única, então só soma camada quando algo de fora se apoia em cima dele."],
  },
  {
    data: "2026-07-11",
    titulo: "Fundo branco em todas as infraestruturas; ramais importados não se agrupam",
    tipo: "correcao",
    itens: [
      "O chão da eletrocalha e do perfilado ficava cinza enquanto os demais eram claros; agora todos usam branco puro.",
      "Cabos de ramais diferentes com a mesma especificação eram somados numa linha só, escondendo que eram circuitos distintos.",
    ],
  },
  {
    data: "2026-07-11",
    titulo: "Logo oficial no cabeçalho",
    tipo: "melhoria",
    itens: ["O PNG não tinha transparência, então o logo entra num painel branco para ficar legível nos dois temas."],
  },
  {
    data: "2026-07-11",
    titulo: "Logo maior e centralizado no cabeçalho",
    tipo: "melhoria",
    itens: ["Cabeçalho reorganizado em três colunas para centralizar o logo de verdade entre as abas e o botão de tema."],
  },
  {
    data: "2026-07-11",
    titulo: "Fundo do logo transparente, sem legenda embaixo",
    tipo: "melhoria",
    itens: ["A imagem foi processada para tornar o branco transparente, preservando as cores e o degradê do desenho."],
  },
  {
    data: "2026-07-11",
    titulo: "Logo legível no modo escuro",
    tipo: "correcao",
    itens: ["O texto e a linha divisória do logo são escuros e sumiam no cabeçalho escuro; um painel claro atrás resolve sem recolorir a arte."],
  },
  {
    data: "2026-07-11",
    titulo: "Ícone e texto do logo posicionados separadamente",
    tipo: "melhoria",
    itens: ["Ícone à esquerda e bloco de texto centralizado, cada um posicionado de forma independente."],
  },
  {
    data: "2026-07-11",
    titulo: "Volta ao logo inteiro no cabeçalho",
    tipo: "melhoria",
    itens: ["A separação entre ícone e texto foi revertida — o logo volta a ser uma peça única."],
  },
  {
    data: "2026-07-11",
    titulo: "Documentação do projeto e logo maior",
    tipo: "interno",
    itens: ["Documentação técnica do projeto e novo ajuste no tamanho do logo do cabeçalho."],
  },
  {
    data: "2026-07-11",
    titulo: "Relatório PDF e fator de agrupamento (NBR 5410, Tab. 42)",
    tipo: "novo",
    itens: [
      "Relatório em PDF do trecho dimensionado.",
      "Fator de agrupamento da Tabela 42 aplicado ao conjunto de cabos.",
    ],
  },
  {
    data: "2026-07-11",
    titulo: "Relatório PDF também nas abas Comando e Buscar Infraestrutura",
    tipo: "novo",
    itens: ["As três abas passam a gerar o mesmo relatório."],
  },
  {
    data: "2026-07-11",
    titulo: "Fator de agrupamento nas abas Comando e Buscar Infraestrutura",
    tipo: "novo",
    itens: ["O derating passa a valer também nessas duas abas."],
  },
  {
    data: "2026-07-13",
    titulo: "Aba de dimensionamento de cabos (NBR 5410)",
    tipo: "novo",
    itens: ["Primeira versão do cálculo de seção de condutor pela norma."],
  },
  {
    data: "2026-07-13",
    titulo: "Quatro valores da Tabela 37 corrigidos",
    tipo: "dados",
    itens: ["Método B2 trifásico, 150 a 300 mm², conferidos célula a célula contra a NBR 5410."],
  },
  {
    data: "2026-07-13",
    titulo: "Motor de cálculo completo e Quadro de Cargas",
    tipo: "novo",
    itens: [
      "Potência em CV ou kVA com rendimento, esquemas de condutores carregados e partida de motores.",
      "Cobre e alumínio, condutores em paralelo e até 4 trechos de instalação.",
      "Neutro (Tab. 48) e condutor de proteção (Tab. 58), queda em regime e na partida.",
    ],
  },
  {
    data: "2026-07-13",
    titulo: "Dimensionamento unificado no Quadro de Cargas",
    tipo: "melhoria",
    itens: [
      "A aba separada some; o formulário continua dentro do Quadro de Cargas.",
      "Memorial PDF do quadro completo e por circuito.",
      "Resultado na designação padrão, tipo 3#25mm²+1#25mm²+1#16mm².",
    ],
  },
  {
    data: "2026-07-13",
    titulo: "Editar e copiar ramais",
    tipo: "melhoria",
    itens: ["Aba renomeada para Dimensionar Cabos, com edição e cópia de ramais já lançados."],
  },
  {
    data: "2026-07-13",
    titulo: "Resultado mais enxuto e CV como unidade padrão",
    tipo: "melhoria",
    itens: ["Saem as caixas separadas de neutro e terra do resultado; CV vira a unidade padrão de potência."],
  },
  {
    data: "2026-07-13",
    titulo: "Aba Infraestrutura única, com modos Manual e Auto",
    tipo: "melhoria",
    itens: ["Força, Comando e Buscar Infraestrutura viram uma aba só: Manual para montar o trecho, Auto para o app procurar."],
  },
  {
    data: "2026-07-13",
    titulo: "Aba Sobre",
    tipo: "novo",
    itens: [
      "O que a ferramenta faz, base técnica e aviso de uso.",
      "Rótulos de catálogo simplificados nos formulários.",
    ],
  },
  {
    data: "2026-07-13",
    titulo: "Emblema no cabeçalho da aba Sobre",
    tipo: "melhoria",
    itens: ["Usa só o emblema, sem o bloco de texto do logo."],
  },
  {
    data: "2026-07-13",
    titulo: "Texto sobreposto na tabela do Memorial PDF",
    tipo: "correcao",
    itens: ["As colunas do quadro de cargas se sobrepunham no PDF."],
  },
  {
    data: "2026-07-13",
    titulo: "Símbolo de rendimento trocado no PDF",
    tipo: "correcao",
    itens: ["A letra grega η não existe na fonte padrão do PDF e causava sobreposição; passa a sair como \"Rend.\"."],
  },
  {
    data: "2026-07-13",
    titulo: "Explicação de %R e %P no quadro de cargas",
    tipo: "melhoria",
    itens: ["Queda em regime e na partida explicadas na tela e no memorial PDF."],
  },
  {
    data: "2026-07-13",
    titulo: "Contraste do quadro de cargas no modo escuro",
    tipo: "correcao",
    itens: ["Tensão, Ib, %R e %P ficavam invisíveis no tema escuro."],
  },
  {
    data: "2026-07-14",
    titulo: "Importar do memorial sai do modo Manual",
    tipo: "melhoria",
    itens: ["O import pertence ao fluxo Auto; no Manual só poluía a tela."],
  },
  {
    data: "2026-07-14",
    titulo: "Preset global e projetos na aba Cabos Elétricos",
    tipo: "novo",
    itens: [
      "Preset único (material, temperatura, quedas e seções) válido para todos os circuitos.",
      "Tipo de cabo decidido automaticamente pela maior seção multipolar.",
      "Projetos salvos na nuvem, como na Infraestrutura, e refletidos no Memorial PDF.",
    ],
  },
  {
    data: "2026-07-14",
    titulo: "Temperatura ambiente volta a ser por trecho",
    tipo: "melhoria",
    itens: ["Cada trecho tem a sua; não faz sentido um valor único global no preset."],
  },
  {
    data: "2026-07-14",
    titulo: "Condutor a 70 °C (PVC) além de 90 °C (EPR/XLPE)",
    tipo: "dados",
    itens: [
      "Tabelas de ampacidade PVC 36 e 38 (cobre e alumínio, métodos B1 a G) conferidas na NBR 5410.",
      "Fatores de temperatura PVC da Tabela 40, para ar e solo, até 60 °C.",
      "Resistividade a 70 °C na queda de tensão; rótulos e PDF refletem a isolação escolhida.",
    ],
  },
  {
    data: "2026-07-14",
    titulo: "Alumínio restrito a 90 °C e fator de potência no preset",
    tipo: "melhoria",
    itens: ["Não há cabo de alumínio com isolação PVC comercial; o F.P. passa a ser um valor do preset."],
  },
  {
    data: "2026-07-14",
    titulo: "Queda máxima na partida vira campo do circuito",
    tipo: "melhoria",
    itens: ["Cada motor pode ter um limite diferente, então o campo só aparece quando há forma de partida selecionada."],
  },
  {
    data: "2026-07-14",
    titulo: "Siglas para o critério dominante, com legenda",
    tipo: "melhoria",
    itens: [
      "A coluna Critério truncava o texto; agora mostra CC, QR, QP ou SM com o texto completo na dica.",
      "Legenda explicando cada sigla abaixo da tabela e no rodapé do memorial.",
    ],
  },
  {
    data: "2026-07-14",
    titulo: "Legenda de critérios em duas linhas no PDF",
    tipo: "correcao",
    itens: ["A legenda saía da margem da página quando ficava em uma linha só."],
  },
  {
    data: "2026-07-14",
    titulo: "Condutores por fase movidos para o painel Carga",
    tipo: "melhoria",
    itens: ["O painel Condutor tinha esse campo único e foi removido."],
  },
  {
    data: "2026-07-14",
    titulo: "Campos desalinhados na linha Condutores/Tensão/Fase",
    tipo: "correcao",
    itens: ["Rótulos quebravam em quantidades diferentes de linha e empurravam os campos para alturas distintas."],
  },
  {
    data: "2026-07-14",
    titulo: "Tensão de linha antes da potência",
    tipo: "melhoria",
    itens: ["Reordena o bloco de condutores carregados, tensão e condutores por fase."],
  },
  {
    data: "2026-07-14",
    titulo: "Só a tensão de linha muda de lugar",
    tipo: "melhoria",
    itens: ["Condutores carregados e por fase voltam a ficar juntos numa linha de duas colunas, com mais espaço para o rótulo."],
  },
  {
    data: "2026-07-14",
    titulo: "Forma de partida depois de condutores por fase",
    tipo: "melhoria",
    itens: ["Nova ordem do painel Carga: condutores, forma de partida e então tensão e corrente ou potência."],
  },
  {
    data: "2026-07-14",
    titulo: "Distribuição \"Feixe\" fixa para condutos B1 e B2",
    tipo: "melhoria",
    itens: ["Eletrocalha, eletroduto e canaleta embutida mostram o campo desabilitado com \"Feixe\", mantendo o padrão visual; o arranjo não se aplica a esses métodos."],
  },
  {
    data: "2026-07-14",
    titulo: "Testes de valor conferido do motor de dimensionamento",
    tipo: "interno",
    itens: [
      "17 casos com seção final e critério dominante calculados à mão pela NBR 5410 — não capturas do resultado atual.",
      "Cobre capacidade de condução em cobre e alumínio, queda em regime e na partida, paralelismo, harmônicas e método D.",
      "Protege o cálculo de regressões silenciosas em mudanças de tela.",
    ],
  },
  {
    data: "2026-07-14",
    titulo: "Tabelas de ampacidade travadas contra a norma (810 células)",
    tipo: "interno",
    itens: [
      "Transcrição das Tabelas 36, 37, 38 e 39 conferida célula a célula contra o PDF oficial: 810 de 810 batem, zero divergências.",
      "Os valores da norma viram referência fixa de teste, e uma ferramenta reconfere contra o PDF quando preciso.",
    ],
  },
  {
    data: "2026-07-14",
    titulo: "Condutor de proteção subdimensionado para fase de 150 mm²",
    tipo: "correcao",
    itens: [
      "A Tabela 58 exige pelo menos metade da fase (75 mm²), arredondado para a comercial acima, 95 mm² — o app entregava 70 mm².",
      "Trava junto as demais tabelas de fatores (40, 42, 43, 45, 48 e 58) contra a norma.",
    ],
  },
  {
    data: "2026-07-15",
    titulo: "Agrupamento em dutos subterrâneos distingue unipolar de multipolar",
    tipo: "correcao",
    itens: [
      "A Tabela 45 tem duas sub-tabelas e o app aplicava sempre a de multipolar, mais branda — resultado otimista demais com cabo unipolar em duto enterrado.",
      "No mesmo cenário, o unipolar agora exige seção maior (35 passa para 50 mm²).",
    ],
  },
  {
    data: "2026-07-15",
    titulo: "Identidade visual nova: cobre e aço, em estilo prancha de projeto",
    tipo: "melhoria",
    itens: [
      "Paleta cinza-aço com o cobre como acento único, substituindo o azul em todo o app.",
      "Tipografia condensada de carimbo técnico nos títulos e fonte monoespaçada em todo número calculado ou digitado.",
      "Cabeçalho vira carimbo com régua de cobre e selo NBR 5410:2004; quadro de cargas com critério em pílula colorida e barras de aproveitamento dos limites de queda.",
      "Nenhuma mudança no motor de cálculo.",
    ],
  },
  {
    data: "2026-07-15",
    titulo: "Fundo azul remanescente na visualização",
    tipo: "correcao",
    itens: ["O SVG no tema escuro e o PNG exportado ainda usavam o azul antigo em vez do cinza-aço do tema."],
  },
  {
    data: "2026-07-15",
    titulo: "Explicação da queda de tensão em linguagem direta",
    tipo: "melhoria",
    itens: [
      "A frase sobre resistência de operação e reatância típica era jargão sem contexto.",
      "Dicas explicam por que a resistência usada é a quente e por que a reatância é um valor padrão de mercado.",
    ],
  },
  {
    data: "2026-07-15",
    titulo: "Projeto: enviar cabos do Quadro de Cargas para a Infraestrutura",
    tipo: "interno",
    itens: ["Desenho aprovado da funcionalidade, com casos de borda e plano de testes, antes de escrever o código."],
  },
  {
    data: "2026-07-15",
    titulo: "Enviar cabos do Quadro de Cargas para a Infraestrutura (Auto)",
    tipo: "novo",
    itens: [
      "Seleção por circuito e botão que leva os cabos direto para a busca automática, reaproveitando o fluxo de importação com revisão de trifólio.",
      "Confirmação Somar ou Substituir quando a aba já tem cabos — antes o import colado somava em silêncio.",
      "Catálogo de alumínio XLPE 90 °C (NBR 7287) novo, com núcleo prata na visualização.",
    ],
  },
  {
    data: "2026-07-16",
    titulo: "Projeto: eletroduto de aço inox",
    tipo: "interno",
    itens: ["Desenho aprovado para acrescentar as séries Schedule 10 e 40 ao cadastro de eletrodutos."],
  },
  {
    data: "2026-07-16",
    titulo: "Eletroduto de aço inox, séries Schedule 10 e 40",
    tipo: "dados",
    itens: [
      "Bitolas conforme ASTM A312 / ASME B36.19: Schedule 10 até 2\" e Schedule 40 até 4\".",
      "Como o cadastro já é orientado a dados, o seletor, a busca, o desenho e o PDF absorveram as duas séries sem alteração.",
    ],
  },
  {
    data: "2026-07-16",
    titulo: "Busca Auto: um eletroduto por norma, a menor que comporta",
    tipo: "melhoria",
    itens: ["Com seis normas cadastradas, a segunda bitola de cada uma não informava nada — a seguinte sempre cabe. As bandejas seguem com duas alturas."],
  },
  {
    data: "2026-07-16",
    titulo: "Projeto: aba Capacitores",
    tipo: "interno",
    itens: ["Desenho aprovado a partir da planilha CAPAC-380 PARA 440, que vira referência de teste do motor de cálculo."],
  },
  {
    data: "2026-07-16",
    titulo: "Aba Capacitores: dimensionamento de banco",
    tipo: "novo",
    itens: [
      "Correção de potência pela tensão, corrente e disjuntor comercial por estágio, e régua de 33% do trafo.",
      "Potências de célula de mercado (ABB e WEG) e escala de disjuntores.",
      "Estágios de 1 a 2 células, repetição em lote e potência livre.",
    ],
  },
  {
    data: "2026-07-16",
    titulo: "Placa de montagem em vista superior",
    tipo: "novo",
    itens: [
      "Layout das células cilíndricas em grade e a placa mínima calculada, com cotas.",
      "Diâmetro da célula, espaçamento, margem e células por fileira editáveis.",
      "Botão para remover todos os estágios de uma vez.",
    ],
  },
  {
    data: "2026-07-16",
    titulo: "Diâmetro da célula automático pelo kvar",
    tipo: "melhoria",
    itens: [
      "Cada célula é desenhada no diâmetro típico de catálogo para a sua potência.",
      "O passo da grade e a placa mínima passam a ser governados pela maior célula presente; o modo manual trava tudo no mesmo diâmetro.",
    ],
  },
  {
    data: "2026-07-17",
    titulo: "Dimensões e códigos do catálogo Siemens Brasil",
    tipo: "dados",
    itens: [
      "Faixas de diâmetro corrigidas pelo catálogo oficial 440 V / 60 Hz — as anteriores vinham de um material de 50 Hz e eram 4 a 5 mm menores.",
      "Código e dimensões por kvar exibidos como dica em cada estágio.",
    ],
  },
  {
    data: "2026-07-17",
    titulo: "Arrastar capacitor para trocar de lugar na placa",
    tipo: "novo",
    itens: [
      "A célula engata no slot mais próximo e troca com quem estava lá; a cota continua sendo cálculo da grade, não a medida de onde a peça foi solta.",
      "O arranjo sobrevive a adicionar e remover estágios, e um botão devolve o arranjo automático.",
      "Corrige cotas cortadas em placas largas e texto ilegível sobre a célula no modo escuro.",
    ],
  },
  {
    data: "2026-07-17",
    titulo: "Soltar em slot vazio e a placa encolhe ao juntar as células",
    tipo: "melhoria",
    itens: [
      "Os slots livres viram alvo de arrasto e aparecem tracejados só durante o movimento.",
      "A placa mede até a última posição realmente ocupada: 7 células em 6+1 dão 837 mm; rearranjadas em 4+3, 578 mm.",
      "Corrige dois defeitos de arrasto que travavam ao soltar sobre espaço vazio.",
    ],
  },
  {
    data: "2026-07-17",
    titulo: "Prever o tamanho da placa antes de soltar",
    tipo: "melhoria",
    itens: [
      "A placa desenhada durante o arrasto é a que resultaria de soltar a célula ali — a prévia não pode discordar do resultado.",
      "Nenhum slot livre fica cortado, e a célula deixa de teleportar no primeiro movimento.",
    ],
  },
  {
    data: "2026-07-18",
    titulo: "Fileira vaga para puxar célula para uma nova linha",
    tipo: "melhoria",
    itens: [
      "Antes, com menos células que a capacidade da fileira, não havia para onde arrastar embaixo.",
      "A placa só cresce quando você realmente solta uma célula lá — verificado no navegador: puxar a 3ª célula para baixo leva a placa de 449×190 para 449×319 mm.",
    ],
  },
  {
    data: "2026-07-18",
    titulo: "Marca de origem no arrasto, editar estágio e relatório PDF",
    tipo: "novo",
    itens: [
      "Círculo vermelho pontilhado marca de onde a célula está saindo.",
      "\"Editar\" abre o estágio no formulário preservando o id, então o arranjo da placa sobrevive à mudança.",
      "Relatório PDF com parâmetros, tabela por estágio, totais, comparação com o trafo e a vista superior da placa.",
    ],
  },
  {
    data: "2026-07-18",
    titulo: "Placa em escala fixa, não esticada para preencher a tela",
    tipo: "correcao",
    itens: [
      "Uma placa estreita e alta esticava até cerca de 920 px de altura para manter a proporção do container.",
      "Agora são 0,6 px por mm em qualquer arranjo, então a vista é proporcional e comparável entre bancos.",
      "O PDF passa a rasterizar em resolução própria e sai nítido, independentemente da escala de exibição.",
    ],
  },
  {
    data: "2026-07-18",
    titulo: "Projetos salvos na aba Capacitores",
    tipo: "novo",
    itens: [
      "O banco inteiro é salvo e carregado como um projeto nomeado, no mesmo padrão das outras abas.",
      "Desvincular zera a aba; carregar reidrata os estágios preservando o arranjo da placa.",
      "Células por estágio começa em 1 e a aba abre sem nenhum capacitor.",
    ],
  },
  {
    data: "2026-07-18",
    titulo: "Células de 1 a 3 kvar e alturas corrigidas",
    tipo: "dados",
    itens: [
      "Células Siemens 440 V de 1; 1,2; 1,5; 1,8; 2,5 e 3 kvar incluídas no seletor e no lookup de códigos.",
      "Alturas conforme o catálogo: 9 kvar passa a 138 mm e 18 kvar a 273 mm.",
      "A seta na coluna Disjuntor do PDF saía embaralhada por usar um símbolo fora da fonte padrão.",
    ],
  },
  {
    data: "2026-07-20",
    titulo: "Contator por estágio, nome do projeto e placa clara no PDF",
    tipo: "novo",
    itens: [
      "Coluna Contator com a corrente mínima = In × fator, editável, padrão 1,43 (o 1,3 que a IEC 60831 exige em regime, por harmônicas, com 1,1 de tolerância de capacitância).",
      "Com projeto ativo, o PDF leva o nome no cabeçalho e no arquivo.",
      "A placa sai sempre clara no PDF, mesmo com o app no tema escuro — papel é claro.",
    ],
  },
  {
    data: "2026-07-20",
    titulo: "Catálogo Siemens completo, extraído do configurador oficial",
    tipo: "dados",
    itens: [
      "35 capacitores monofásicos, 118 trifásicos e 66 módulos de média tensão, cada um casado com contator, disjuntor, fusível e base porta-fusível.",
      "Cruzamento conferido: a corrente do capacitor bate com a da tabela de proteção em 100% das linhas.",
    ],
  },
  {
    data: "2026-07-20",
    titulo: "Células 440 V passam a vir do configurador Siemens",
    tipo: "dados",
    itens: [
      "Fim da tabela duplicada: dimensões e códigos derivam do catálogo oficial.",
      "Diâmetros corrigidos para 53; 63,5; 75 e 85 mm, que prevalecem sobre o PDF de catálogo; sai o 1,2 kvar, que não existe em 440 V.",
    ],
  },
  {
    data: "2026-07-20",
    titulo: "Seletor de marca com códigos de equipamento por célula",
    tipo: "novo",
    itens: [
      "Novo campo Marca (Genérica ou Siemens) nos parâmetros.",
      "Com Siemens, tela e PDF ganham a seção de equipamentos: capacitor, contator e disjuntor ou fusível de cada célula.",
      "Célula fora do catálogo vem sinalizada, sem inventar código.",
    ],
  },
  {
    data: "2026-07-20",
    titulo: "Proteção da célula: disjuntor ou seccionadora porta-fusíveis",
    tipo: "novo",
    itens: [
      "Novo campo escolhe o que a seção de equipamentos mostra: disjuntor (padrão) ou fusível NH com seccionadora.",
      "Célula sem disjuntor no configurador sai sinalizada para usar fusível.",
    ],
  },
  {
    data: "2026-07-20",
    titulo: "Contator e proteção dimensionados pelo kvar total do estágio",
    tipo: "melhoria",
    itens: [
      "O estágio chaveia inteiro, então contator e disjuntor não podem ser por célula.",
      "Mesma régua dos módulos do configurador: o menor contator cujo teto de kvar cobre o total do estágio.",
      "Tabela e PDF passam a ter uma linha por estágio, com os códigos de capacitor empilhados.",
    ],
  },
  {
    data: "2026-07-21",
    titulo: "Fora do catálogo: a mensagem diz o teto e sugere a saída",
    tipo: "melhoria",
    itens: [
      "Confirmado que a Siemens monta bancos com uma célula por estágio, nunca duas num contator.",
      "Ao passar do maior contator, a mensagem agora diz quanto passou e sugere dividir em estágios de célula única.",
    ],
  },
  {
    data: "2026-07-21",
    titulo: "Contator 3MT70075 e disjuntor 3VJ1112 para estágios grandes",
    tipo: "dados",
    itens: [
      "A série 3MT7 do catálogo oficial vai a 100 kvar; o configurador parava em 60 só porque monta uma célula por estágio.",
      "O estágio padrão de 2×33,7 = 67,4 kvar passa a mostrar o contator correto em vez de \"fora do catálogo\".",
      "Disjuntor de estágio grande por corrente comercial: 3VJ1112 para 125 A, o padrão usado nesse caso.",
    ],
  },
  {
    data: "2026-07-23",
    titulo: "Nova aba Iluminação: cabo mínimo por queda de tensão",
    tipo: "novo",
    itens: [
      "Circuito descrito por trechos, com distância e pontos acumulados; corrente do trecho pelas luminárias a jusante.",
      "Seção sugerida = a maior entre queda dentro do limite (item 6.2.7, 4% editável), ampacidade (Tab. 36) e o mínimo de 1,5 mm² para iluminação (Tab. 47).",
      "Corrente alternada fase-neutro e fase-fase, e corrente contínua.",
    ],
  },
  {
    data: "2026-07-23",
    titulo: "Circuito de iluminação montado em diagrama",
    tipo: "novo",
    itens: [
      "O circuito vira uma árvore que sai do quadro e passa por caixas de derivação até as luminárias, com a distância editável na própria ligação.",
      "Cada trecho recebe a sua seção: tronco grosso e ramal fino, respeitando o limite de queda em todo caminho do quadro até a luminária.",
      "Avisa sobre nós desconectados e ramos sem luminária; acusa erro em nó com dois pais ou ciclo.",
    ],
  },
  {
    data: "2026-07-23",
    titulo: "Vários circuitos e método de instalação por trecho",
    tipo: "novo",
    itens: [
      "Um diagrama por circuito, com nome editável; o circuito novo herda os parâmetros do ativo.",
      "Cada trecho pode sobrepor o método de instalação padrão, com a coluna Método na tabela de resultado.",
      "Campo de potência por luminária realinhado na grade de parâmetros.",
    ],
  },
  {
    data: "2026-07-23",
    titulo: "Quadro de cargas da iluminação e PDF",
    tipo: "novo",
    itens: [
      "Uma linha por circuito com sistema, tensão, luminárias, potência, corrente, seções usadas e pior queda, com totais; clicar na linha abre o circuito.",
      "PDF com o quadro consolidado, o detalhamento de trechos por circuito e rodapé metodológico.",
    ],
  },
  {
    data: "2026-07-24",
    titulo: "Eletroduto corrugado de PVC (NBR 15465)",
    tipo: "dados",
    itens: [
      "PVC antichama amarelo em 3 bitolas (1/2\", 3/4\" e 1\"), com diâmetros da ficha técnica do fabricante (set/2025).",
      "Entra na busca automática junto com as demais normas, sem mudança de tela.",
    ],
  },
  {
    data: "2026-07-24",
    titulo: "Rótulo renomeado para Corrugado PVC",
    tipo: "melhoria",
    itens: ["O seletor de norma passa a nomear o material em vez da marca."],
  },
  {
    data: "2026-07-24",
    titulo: "Três defeitos de duplicação em cliques rápidos",
    tipo: "correcao",
    itens: [
      "Iluminação: dois cliques criavam duas luminárias com o mesmo rótulo e na mesma posição, uma escondida sob a outra — inflava a corrente do circuito sem aparecer no diagrama.",
      "Iluminação: dois cliques geravam dois \"Circuito 2\"; no Quadro de Cargas, um dos circuitos era perdido e a tag repetia.",
      "A numeração passa a vir do maior número já usado, então remover um item do meio também deixa de repetir rótulo.",
      "Auditoria do app inteiro; tabelas normativas conferidas à parte (monotonicidade, 2 contra 3 carregados, 90 contra 70 °C e fatores) sem erro.",
    ],
  },
  {
    data: "2026-07-24",
    titulo: "Motor de iluminação antigo removido",
    tipo: "interno",
    itens: [
      "A aba passou a usar o modelo em árvore quando ganhou o diagrama; sobravam 265 linhas de código e testes que validavam o que não roda mais.",
      "Passa a existir uma única fórmula de queda de tensão de iluminação no código.",
      "Verificado na aba: o caso de referência devolve exatamente as mesmas seções e quedas.",
    ],
  },
];

// A versão nunca é escrita à mão: 0.00 para a primeira, +0.01 a cada update.
// Aritmética inteira para não depender de ponto flutuante.
export function versaoDoIndice(i) {
  return `${Math.floor(i / 100)}.${String(i % 100).padStart(2, "0")}`;
}

export const CHANGELOG = UPDATES.map((u, i) => ({ ...u, versao: versaoDoIndice(i) }));

export const APP_VERSION = CHANGELOG[CHANGELOG.length - 1].versao;
