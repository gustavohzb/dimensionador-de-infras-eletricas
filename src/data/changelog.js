// Histórico de releases do app.
//
// Uma entrada é um RELEASE, não um commit: mudanças do mesmo assunto entram
// como itens de uma entrada só.
//
// A versão é escrita à mão, no formato MAIOR.MENOR.CORREÇÃO:
//   - MAIOR    muda a cara ou a estrutura do app (1.0.0 é o redesign
//              cobre/aço, que trocou a identidade visual inteira)
//   - MENOR    funcionalidade nova
//   - CORREÇÃO conserto, ajuste fino ou trabalho interno
// A casa que sobe zera as menores: 1.9.2 -> 1.10.0 -> 2.0.0. Os testes em
// changelog.test.js travam isso e a ordem cronológica.
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

// Do mais antigo para o mais novo. Acrescente o release novo no FIM.
export const CHANGELOG = [
  {
    versao: "0.1.0",
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
    versao: "0.2.0",
    data: "2026-07-08",
    titulo: "Projetos salvos na nuvem",
    tipo: "novo",
    itens: [
      "Salvar, carregar e apagar trechos completos (infraestrutura, dimensões e cabos) num banco de dados.",
      "O trabalho deixa de se perder ao fechar o navegador e pode ser aberto de outro computador.",
    ],
  },
  {
    versao: "0.2.1",
    data: "2026-07-08",
    titulo: "Projeto ativo, desvincular e título da aba",
    tipo: "correcao",
    itens: [
      "Antes, cada \"Salvar\" criava uma linha nova no banco e gerava duplicatas; agora existe projeto ativo e dá para ir salvando o progresso nele.",
      "\"Desvincular\" só parava de rastrear o projeto e deixava os cabos na tela — agora zera tudo, com confirmação antes por ser destrutivo.",
      "A aba do navegador mostrava o título padrão do gerador de projeto.",
    ],
  },
  {
    versao: "0.3.0",
    data: "2026-07-09",
    titulo: "Busca reversa: a melhor infraestrutura para um conjunto de cabos",
    tipo: "novo",
    itens: [
      "Você monta a lista de cabos e o app testa todas as infraestruturas e normas cadastradas.",
      "A confirmação é física, pelo mesmo motor de empacotamento por gravidade da visualização — não só pela conta de área %, que é necessária mas não suficiente.",
      "Botão \"Usar esta opção\" carrega o resultado direto no dimensionador.",
    ],
  },
  {
    versao: "0.4.0",
    data: "2026-07-09",
    titulo: "Aba de cabos de comando (catálogo CABLIE)",
    tipo: "novo",
    itens: [
      "Catálogo de cabo de controle CABLIE, com seções até 4,0 mm² e de 2 a 35 condutores.",
      "Reaproveita todo o motor existente: empacotamento físico, ocupação e projetos salvos.",
      "Corrige o cabo que sumia da tela: as abas ficam todas montadas ao mesmo tempo e cada visualização repetia os mesmos identificadores de filtro do desenho, que resolviam para uma aba oculta.",
      "Abas renomeadas para Força e Comando.",
    ],
  },
  {
    versao: "0.5.0",
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
    versao: "0.5.1",
    data: "2026-07-09",
    titulo: "Desenho do cabo de comando",
    tipo: "melhoria",
    itens: [
      "A capa passa a exibir o número de condutores no centro, como a marcação real desses cabos — decompor em 35 cores seria ilegível.",
      "Sai o brilho cilíndrico usado nos demais tipos; o cabo de comando fica preto sólido.",
    ],
  },
  {
    versao: "0.5.2",
    data: "2026-07-09",
    titulo: "Visualização da opção escolhida dentro da própria busca",
    tipo: "melhoria",
    itens: [
      "\"Usar esta opção\" não troca mais de aba: a visualização e a taxa de ocupação aparecem logo abaixo dos resultados, e dá para alternar entre as opções no mesmo lugar.",
      "Uma seta âmbar aponta para o septo divisor, que antes era só uma parede metálica fácil de não perceber.",
    ],
  },
  {
    versao: "0.5.3",
    data: "2026-07-09",
    titulo: "Correções no desenho e na taxa de ocupação",
    tipo: "correcao",
    itens: [
      "A taxa de ocupação ficava congelada no momento da busca; agora recalcula ao vivo a cada mudança no trecho, inclusive por compartimento. Corrige junto um travamento quando a melhor opção era um eletroduto.",
      "Quando a combinação seção/tipo/vias não existia no catálogo, o app caía num diâmetro chute (4, 12 ou 8 mm) e desenhava o cabo com uma medida inventada, com a mesma cara de dado real — agora falha com erro descritivo.",
      "O condutor do multipolar de 4 vias furava a capa externa em cerca de 7%.",
      "Os nós do aramado eram desenhados metade para fora da área útil, e depois de recuados ficaram do lado errado: eles representam a parede e devem ficar por fora, sem invadir o espaço dos cabos.",
      "Metade da espessura da linha do aramado invadia o espaço de apoio e os cabos pareciam afundar nela.",
      "Os nós do fundo eram distribuídos por toda a largura, mas o trecho reto só existe entre as quinas curvas — os das pontas ficavam soltos, fora da linha.",
    ],
  },
  {
    versao: "0.6.0",
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
    versao: "0.7.0",
    data: "2026-07-10",
    titulo: "Limite de camadas na busca de infraestrutura",
    tipo: "novo",
    itens: [
      "Novo seletor \"Máximo de camadas\" (sem limite, 1 a 4): empilhar cabos demais piora a dissipação térmica, então a menor opção física nem sempre é a desejável.",
      "A camada sai do próprio resultado do empacotamento, por quem fisicamente sustenta o cabo — não de uma grade artificial.",
      "Cabos de raios diferentes lado a lado no mesmo chão eram lidos como empilhados, e a busca rejeitava infraestruturas válidas sempre que o trecho misturava tamanhos de cabo — o caso comum.",
      "Quando o limite rejeitava tudo, a mensagem culpava a ocupação; agora o app refaz a busca sem limite para descobrir o mínimo necessário e diz exatamente isso.",
    ],
  },
  {
    versao: "0.7.1",
    data: "2026-07-10",
    titulo: "Busca limitada a 2 opções por tipo, com alturas diferentes",
    tipo: "melhoria",
    itens: [
      "Sai o cartão \"melhor opção\" em destaque; a lista fica única e uniforme.",
      "Cada tipo mostra no máximo duas opções, de alturas distintas, para dar comparação real em vez de duas variações quase iguais.",
    ],
  },
  {
    versao: "0.8.0",
    data: "2026-07-10",
    titulo: "Controle por ramal de quais grupos viram trifólio",
    tipo: "novo",
    itens: [
      "\"Analisar linhas\" mostra cada ramal do memorial com os componentes detectados antes de importar.",
      "Todo grupo de 3 unipolares de mesma seção vem com o marcador \"Trifólio\" pré-marcado, e você desmarca ramal por ramal antes de confirmar.",
    ],
  },
  {
    versao: "0.8.1",
    data: "2026-07-11",
    titulo: "Trifólio como uma camada e ramais importados separados",
    tipo: "correcao",
    itens: [
      "O feixe de trifólio é manuseado e instalado como peça única, então só soma camada quando algo de fora se apoia em cima dele.",
      "Cabos de ramais diferentes com a mesma especificação eram somados numa linha só, escondendo que eram circuitos distintos.",
      "O chão da eletrocalha e do perfilado ficava cinza enquanto os demais eram claros; agora todos usam branco puro.",
    ],
  },
  {
    versao: "0.8.2",
    data: "2026-07-11",
    titulo: "Logo oficial no cabeçalho",
    tipo: "melhoria",
    itens: [
      "O logo entra no cabeçalho, centralizado entre as abas e o botão de tema.",
      "A imagem foi processada para tornar o branco transparente, preservando as cores e o degradê do desenho.",
      "O texto e a linha divisória do logo são escuros e sumiam no cabeçalho escuro; um painel claro atrás resolve sem recolorir a arte.",
      "Uma tentativa de separar o ícone do bloco de texto foi revertida — o logo volta a ser uma peça única.",
      "Documentação técnica do projeto.",
    ],
  },
  {
    versao: "0.9.0",
    data: "2026-07-11",
    titulo: "Relatório PDF e fator de agrupamento (NBR 5410, Tab. 42)",
    tipo: "novo",
    itens: [
      "Relatório em PDF do trecho dimensionado.",
      "Fator de agrupamento da Tabela 42 aplicado ao conjunto de cabos.",
      "As três abas passam a gerar o mesmo relatório e a aplicar o mesmo derating.",
    ],
  },
  {
    versao: "0.10.0",
    data: "2026-07-13",
    titulo: "Dimensionamento de cabos e Quadro de Cargas",
    tipo: "novo",
    itens: [
      "Potência em CV ou kVA com rendimento, esquemas de condutores carregados e partida de motores.",
      "Cobre e alumínio, condutores em paralelo e até 4 trechos de instalação.",
      "Neutro (Tab. 48) e condutor de proteção (Tab. 58), queda em regime e na partida.",
      "Memorial PDF do quadro completo e por circuito, com o resultado na designação padrão, tipo 3#25mm²+1#25mm²+1#16mm².",
      "Edição e cópia de ramais já lançados; CV vira a unidade padrão de potência.",
    ],
  },
  {
    versao: "0.10.1",
    data: "2026-07-13",
    titulo: "Quatro valores da Tabela 37 corrigidos",
    tipo: "dados",
    itens: ["Método B2 trifásico, 150 a 300 mm², conferidos célula a célula contra a NBR 5410."],
  },
  {
    versao: "0.11.0",
    data: "2026-07-13",
    titulo: "Aba Infraestrutura única, com modos Manual e Auto",
    tipo: "melhoria",
    itens: ["Força, Comando e Buscar Infraestrutura viram uma aba só: Manual para montar o trecho, Auto para o app procurar."],
  },
  {
    versao: "0.12.0",
    data: "2026-07-13",
    titulo: "Aba Sobre",
    tipo: "novo",
    itens: [
      "O que a ferramenta faz, base técnica e aviso de uso.",
      "Rótulos de catálogo simplificados nos formulários.",
    ],
  },
  {
    versao: "0.12.1",
    data: "2026-07-13",
    titulo: "Ajustes no quadro de cargas e no memorial PDF",
    tipo: "correcao",
    itens: [
      "As colunas do quadro de cargas se sobrepunham no PDF.",
      "A letra grega η não existe na fonte padrão do PDF e causava sobreposição; passa a sair como \"Rend.\".",
      "Queda em regime e na partida (%R e %P) explicadas na tela e no memorial.",
      "Tensão, Ib, %R e %P ficavam invisíveis no tema escuro.",
    ],
  },
  {
    versao: "0.12.2",
    data: "2026-07-14",
    titulo: "Importar do memorial sai do modo Manual",
    tipo: "melhoria",
    itens: ["O import pertence ao fluxo Auto; no Manual só poluía a tela."],
  },
  {
    versao: "0.13.0",
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
    versao: "0.13.1",
    data: "2026-07-14",
    titulo: "Cada parâmetro no seu lugar",
    tipo: "melhoria",
    itens: [
      "A temperatura ambiente volta a ser por trecho — não faz sentido um valor único global no preset.",
      "O fator de potência passa a ser do preset, e o alumínio fica restrito a 90 °C: não há cabo de alumínio com isolação PVC comercial.",
      "A queda máxima na partida vira campo do circuito, já que cada motor pode ter um limite diferente, e só aparece quando há forma de partida selecionada.",
    ],
  },
  {
    versao: "0.14.0",
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
    versao: "0.14.1",
    data: "2026-07-14",
    titulo: "Critério dominante em siglas, com legenda",
    tipo: "melhoria",
    itens: [
      "A coluna Critério truncava o texto; agora mostra CC, QR, QP ou SM com o texto completo na dica.",
      "Legenda explicando cada sigla abaixo da tabela e no rodapé do memorial, quebrada em duas linhas para não sair da margem.",
    ],
  },
  {
    versao: "0.14.2",
    data: "2026-07-14",
    titulo: "Ajustes no painel Carga",
    tipo: "melhoria",
    itens: [
      "Condutores por fase vem para o painel Carga; o painel Condutor tinha esse campo único e foi removido.",
      "Nova ordem: condutores carregados e por fase juntos, depois forma de partida, e então tensão de linha antes da corrente ou potência.",
      "Rótulos quebravam em quantidades diferentes de linha e empurravam os campos para alturas distintas.",
      "Eletrocalha, eletroduto e canaleta embutida mostram a distribuição desabilitada com \"Feixe\", mantendo o padrão visual; o arranjo não se aplica a esses métodos.",
    ],
  },
  {
    versao: "0.14.3",
    data: "2026-07-14",
    titulo: "Cálculo travado contra a norma",
    tipo: "interno",
    itens: [
      "17 casos com seção final e critério dominante calculados à mão pela NBR 5410 — não capturas do resultado atual.",
      "Transcrição das Tabelas 36, 37, 38 e 39 conferida célula a célula contra o PDF oficial: 810 de 810 batem, zero divergências.",
      "Protege o cálculo de regressões silenciosas em mudanças de tela.",
    ],
  },
  {
    versao: "0.14.4",
    data: "2026-07-14",
    titulo: "Condutor de proteção subdimensionado para fase de 150 mm²",
    tipo: "correcao",
    itens: [
      "A Tabela 58 exige pelo menos metade da fase (75 mm²), arredondado para a comercial acima, 95 mm² — o app entregava 70 mm².",
      "Trava junto as demais tabelas de fatores (40, 42, 43, 45, 48 e 58) contra a norma.",
    ],
  },
  {
    versao: "0.14.5",
    data: "2026-07-15",
    titulo: "Agrupamento em dutos subterrâneos distingue unipolar de multipolar",
    tipo: "correcao",
    itens: [
      "A Tabela 45 tem duas sub-tabelas e o app aplicava sempre a de multipolar, mais branda — resultado otimista demais com cabo unipolar em duto enterrado.",
      "No mesmo cenário, o unipolar agora exige seção maior (35 passa para 50 mm²).",
    ],
  },
  {
    versao: "1.0.0",
    data: "2026-07-15",
    titulo: "Identidade visual nova: cobre e aço, em estilo prancha de projeto",
    tipo: "melhoria",
    itens: [
      "Paleta cinza-aço com o cobre como acento único, substituindo o azul em todo o app.",
      "Tipografia condensada de carimbo técnico nos títulos e fonte monoespaçada em todo número calculado ou digitado.",
      "Cabeçalho vira carimbo com régua de cobre e selo NBR 5410:2004.",
      "Quadro de cargas com critério em pílula colorida e barras de aproveitamento dos limites de queda.",
      "Nenhuma mudança no motor de cálculo.",
    ],
  },
  {
    versao: "1.0.1",
    data: "2026-07-15",
    titulo: "Explicação da queda de tensão em linguagem direta",
    tipo: "melhoria",
    itens: [
      "A frase sobre resistência de operação e reatância típica era jargão sem contexto.",
      "Dicas explicam por que a resistência usada é a quente e por que a reatância é um valor padrão de mercado.",
    ],
  },
  {
    versao: "1.1.0",
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
    versao: "1.2.0",
    data: "2026-07-16",
    titulo: "Eletroduto de aço inox, séries Schedule 10 e 40",
    tipo: "dados",
    itens: [
      "Bitolas conforme ASTM A312 / ASME B36.19: Schedule 10 até 2\" e Schedule 40 até 4\".",
      "Como o cadastro já é orientado a dados, o seletor, a busca, o desenho e o PDF absorveram as duas séries sem alteração.",
    ],
  },
  {
    versao: "1.2.1",
    data: "2026-07-16",
    titulo: "Busca Auto: um eletroduto por norma, a menor que comporta",
    tipo: "melhoria",
    itens: ["Com seis normas cadastradas, a segunda bitola de cada uma não informava nada — a seguinte sempre cabe. As bandejas seguem com duas alturas."],
  },
  {
    versao: "1.3.0",
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
    versao: "1.4.0",
    data: "2026-07-16",
    titulo: "Placa de montagem em vista superior",
    tipo: "novo",
    itens: [
      "Layout das células cilíndricas em grade e a placa mínima calculada, com cotas.",
      "Cada célula é desenhada no diâmetro típico de catálogo para a sua potência; o passo da grade e a placa mínima são governados pela maior célula presente.",
      "Diâmetro, espaçamento, margem e células por fileira editáveis, e botão para remover todos os estágios de uma vez.",
    ],
  },
  {
    versao: "1.4.1",
    data: "2026-07-17",
    titulo: "Dimensões e códigos do catálogo Siemens Brasil",
    tipo: "dados",
    itens: [
      "Faixas de diâmetro corrigidas pelo catálogo oficial 440 V / 60 Hz — as anteriores vinham de um material de 50 Hz e eram 4 a 5 mm menores.",
      "Código e dimensões por kvar exibidos como dica em cada estágio.",
    ],
  },
  {
    versao: "1.5.0",
    data: "2026-07-17",
    titulo: "Arrastar capacitor para trocar de lugar na placa",
    tipo: "novo",
    itens: [
      "A célula engata no slot mais próximo e troca com quem estava lá; os slots livres também viram alvo e aparecem tracejados durante o movimento.",
      "A cota continua sendo cálculo da grade, não a medida de onde a peça foi solta, e o arranjo sobrevive a adicionar e remover estágios.",
      "A placa mede até a última posição realmente ocupada, então juntar as células encolhe: 7 em 6+1 dão 837 mm; rearranjadas em 4+3, 578 mm.",
      "Corrige cotas cortadas em placas largas, texto ilegível sobre a célula no modo escuro e dois defeitos que travavam o arrasto ao soltar sobre espaço vazio.",
    ],
  },
  {
    versao: "1.5.1",
    data: "2026-07-18",
    titulo: "Prévia do tamanho, fileira de pouso e escala fixa",
    tipo: "melhoria",
    itens: [
      "A placa desenhada durante o arrasto é a que resultaria de soltar a célula ali — a prévia não pode discordar do resultado, e nenhum slot livre fica cortado.",
      "Uma fileira vaga embaixo dá para onde arrastar mesmo com poucas células; a placa só cresce quando você realmente solta uma lá. Puxar a 3ª célula para baixo leva a placa de 449×190 para 449×319 mm.",
      "O desenho passa a usar 0,6 px por mm em qualquer arranjo, em vez de esticar para preencher a tela — uma placa estreita e alta chegava a 920 px de altura. O PDF rasteriza em resolução própria e sai nítido.",
    ],
  },
  {
    versao: "1.6.0",
    data: "2026-07-18",
    titulo: "Editar estágio e relatório PDF dos capacitores",
    tipo: "novo",
    itens: [
      "\"Editar\" abre o estágio no formulário preservando o id, então o arranjo da placa sobrevive à mudança.",
      "Relatório PDF com parâmetros, tabela por estágio, totais, comparação com o trafo e a vista superior da placa.",
      "Círculo vermelho pontilhado marca de onde a célula está saindo durante o arrasto.",
    ],
  },
  {
    versao: "1.7.0",
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
    versao: "1.7.1",
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
    versao: "1.8.0",
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
    versao: "1.8.1",
    data: "2026-07-20",
    titulo: "Catálogo Siemens do configurador oficial",
    tipo: "dados",
    itens: [
      "35 capacitores monofásicos, 118 trifásicos e 66 módulos de média tensão, cada um casado com contator, disjuntor, fusível e base porta-fusível.",
      "Cruzamento conferido: a corrente do capacitor bate com a da tabela de proteção em 100% das linhas.",
      "Fim da tabela duplicada de células 440 V — dimensões e códigos passam a derivar do configurador, com os diâmetros corrigidos para 53; 63,5; 75 e 85 mm.",
    ],
  },
  {
    versao: "1.9.0",
    data: "2026-07-20",
    titulo: "Seletor de marca com códigos de equipamento",
    tipo: "novo",
    itens: [
      "Novo campo Marca (Genérica ou Siemens) nos parâmetros.",
      "Com Siemens, tela e PDF ganham a seção de equipamentos: capacitor, contator e disjuntor ou fusível.",
      "Célula fora do catálogo vem sinalizada, sem inventar código.",
    ],
  },
  {
    versao: "1.10.0",
    data: "2026-07-20",
    titulo: "Proteção da célula: disjuntor ou seccionadora porta-fusíveis",
    tipo: "novo",
    itens: [
      "Novo campo escolhe o que a seção de equipamentos mostra: disjuntor (padrão) ou fusível NH com seccionadora.",
      "Célula sem disjuntor no configurador sai sinalizada para usar fusível.",
    ],
  },
  {
    versao: "1.11.0",
    data: "2026-07-20",
    titulo: "Contator e proteção dimensionados pelo kvar total do estágio",
    tipo: "novo",
    itens: [
      "O estágio chaveia inteiro, então contator e disjuntor não podem ser por célula.",
      "Mesma régua dos módulos do configurador: o menor contator cujo teto de kvar cobre o total do estágio.",
      "Tabela e PDF passam a ter uma linha por estágio, com os códigos de capacitor empilhados.",
    ],
  },
  {
    versao: "1.11.1",
    data: "2026-07-21",
    titulo: "Estágios grandes: contator 3MT70075 e disjuntor 3VJ1112",
    tipo: "dados",
    itens: [
      "A série 3MT7 do catálogo oficial vai a 100 kvar; o configurador parava em 60 só porque monta uma célula por estágio.",
      "O estágio padrão de 2×33,7 = 67,4 kvar passa a mostrar o contator correto em vez de \"fora do catálogo\".",
      "Disjuntor de estágio grande por corrente comercial: 3VJ1112 para 125 A, o padrão usado nesse caso.",
      "Acima do teto, a mensagem agora diz quanto passou e sugere dividir em estágios de célula única — o caminho que o próprio configurador usa.",
    ],
  },
  {
    versao: "1.12.0",
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
    versao: "1.13.0",
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
    versao: "1.14.0",
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
    versao: "1.15.0",
    data: "2026-07-23",
    titulo: "Quadro de cargas da iluminação e PDF",
    tipo: "novo",
    itens: [
      "Uma linha por circuito com sistema, tensão, luminárias, potência, corrente, seções usadas e pior queda, com totais; clicar na linha abre o circuito.",
      "PDF com o quadro consolidado, o detalhamento de trechos por circuito e rodapé metodológico.",
    ],
  },
  {
    versao: "1.16.0",
    data: "2026-07-24",
    titulo: "Eletroduto corrugado de PVC (NBR 15465)",
    tipo: "dados",
    itens: [
      "PVC antichama amarelo em 3 bitolas (1/2\", 3/4\" e 1\"), com diâmetros da ficha técnica do fabricante (set/2025).",
      "Entra na busca automática junto com as demais normas, sem mudança de tela.",
    ],
  },
  {
    versao: "1.16.1",
    data: "2026-07-24",
    titulo: "Auditoria do app: duplicação em cliques rápidos",
    tipo: "correcao",
    itens: [
      "Iluminação: dois cliques criavam duas luminárias com o mesmo rótulo e na mesma posição, uma escondida sob a outra — inflava a corrente do circuito sem aparecer no diagrama.",
      "Iluminação: dois cliques geravam dois \"Circuito 2\"; no Quadro de Cargas, um dos circuitos era perdido e a tag repetia.",
      "A numeração passa a vir do maior número já usado, então remover um item do meio também deixa de repetir rótulo.",
      "Tabelas normativas conferidas à parte (monotonicidade, 2 contra 3 carregados, 90 contra 70 °C e fatores) sem erro.",
      "O motor de iluminação antigo, substituído pelo modelo em árvore quando a aba ganhou o diagrama, foi removido: 265 linhas de código e testes que validavam o que não roda mais.",
    ],
  },
  {
    versao: "1.17.0",
    data: "2026-07-25",
    titulo: "Aba Atualizações",
    tipo: "novo",
    itens: [
      "Histórico de tudo o que mudou no app desde a primeira versão, agrupado por dia.",
      "Cada entrada é um release, com versão no formato maior.menor.correção: a maior muda a cara ou a estrutura do app, a menor traz funcionalidade nova e a última é conserto ou ajuste fino.",
      "Filtro por tipo de mudança; as entradas internas ficam ocultas por padrão.",
      "A versão exibida na aba Sobre passa a sair daqui, então há um lugar só dizendo em que versão o app está.",
    ],
  },
  {
    versao: "1.18.0",
    data: "2026-08-03",
    titulo: "Importar lista de cargas",
    tipo: "novo",
    itens: [
      'Botão "Importar lista" no Quadro de Cargas: cole colunas do Excel e cada linha vira um circuito.',
      "Detecção automática de colunas (descrição, TAG, potência, tensão, distância) com correção por seletor no topo de cada coluna.",
      'Unidade lida da própria célula ("15 CV", "3,7 kW") ou do padrão do lote; padrões do lote completam o que a lista não traz.',
      "Linhas sem potência aproveitável viram aviso e são puladas; ao confirmar dá para somar ao quadro ou substituir tudo.",
    ],
  },
  {
    versao: "1.19.0",
    data: "2026-08-05",
    titulo: "Gerenciamento de risco (SPDA)",
    tipo: "novo",
    itens: [
      "Aba nova de análise de risco de descargas atmosféricas conforme a ABNT NBR 5419-2:2026, com a estrutura tratada como zona de estudo única.",
      "Calcula as oito componentes de risco (R_A a R_Z), soma R1 e R3 e compara com os riscos toleráveis da Tabela 4, apontando a componente dominante.",
      "Painéis de estrutura, linhas elétricas (quantas forem, com estrutura adjacente opcional) e medidas de proteção, com todas as tabelas dos Anexos A, B e C.",
      "O N_G é informado pelo usuário a partir do Anexo F da norma, que é a única fonte que ela admite.",
    ],
  },
  {
    versao: "1.19.1",
    data: "2026-08-05",
    titulo: "Veredito do risco fixo no topo",
    tipo: "melhoria",
    itens: [
      "Na aba SPDA, o veredito de R1 (e de R3, quando avaliado) acompanha a rolagem e fica sempre à vista enquanto os dados são preenchidos nos painéis de baixo.",
      "A barra ganha sombra ao grudar no topo, para se separar do conteúdo que passa por baixo.",
    ],
  },
  {
    versao: "1.19.2",
    data: "2026-08-05",
    titulo: "Painel da estrutura explicado",
    tipo: "melhoria",
    itens: [
      "Os campos do painel Estrutura foram agrupados em Geometria, Exposição, Características da edificação, Ocupação e Situações especiais, cada grupo com uma linha dizendo o que ele controla no resultado.",
      "Todas as dicas foram reescritas para explicar o que informar e por quê, com exemplos — o que é n_z contra n_t, de onde tirar o N_G, como classificar a carga de incêndio.",
      "A ocupação passa a ser informada em horas por dia e dias por semana, no lugar de horas por ano; o app mostra o total anual resultante e faz a conversão internamente.",
    ],
  },
  {
    versao: "1.20.0",
    data: "2026-08-05",
    titulo: "N_G por estado e cidade",
    tipo: "novo",
    itens: [
      "O campo N_G ganha seletores de estado e cidade, que preenchem a densidade de descargas automaticamente.",
      "Os valores vêm da Tabela F.1 do Anexo F da NBR 5419-2:2026, colada uma vez pelo próprio usuário: a tabela é conteúdo da norma e fica guardada apenas no navegador de quem a importou, fora do aplicativo.",
      "A importação aceita o texto copiado do documento (município, UF e N_G separados por tabulação ou ponto e vírgula), descarta o cabeçalho e lista as linhas que não deu para aproveitar.",
      "O valor preenchido continua editável à mão, com aviso quando diverge do tabelado para a cidade escolhida.",
      "Sem tabela importada, o campo segue manual como antes.",
    ],
  },
  {
    versao: "1.21.0",
    data: "2026-08-06",
    titulo: "Tabela de N_G embutida no app",
    tipo: "dados",
    itens: [
      "Os 5.572 municípios do país entram no aplicativo com o N_G do Anexo F da NBR 5419-2:2026: basta escolher estado e cidade.",
      "Saíram o campo de digitar o N_G à mão e a importação de tabela — a norma (A.1.3) não admite valores de outra fonte, e agora não é mais preciso colar nada.",
      "Enquanto o município não for escolhido, a aba avisa que está aguardando em vez de mostrar risco zero, que seria lido como \"proteção não é necessária\".",
      "Os números vêm do levantamento INPE/DISSM e UFMT que deu base ao Anexo F, pelo conjunto de dados público ng-brasil-mapas (licença MIT). Para laudo assinado, confira o município na norma.",
    ],
  },
  {
    versao: "1.22.0",
    data: "2026-08-06",
    titulo: "Frequência de danos e sugestão de medidas no SPDA",
    tipo: "novo",
    itens: [
      "A aba passa a avaliar a frequência de danos F da Seção 7 da NBR 5419-2:2026, critério novo da edição de 2026 e independente do risco: uma estrutura pode ficar abaixo do R1 tolerável e ainda assim reprovar.",
      "F aparece como um terceiro cartão na barra de veredito e numa tabela que abre o cálculo por sistema interno e por fonte de dano.",
      "Cada sistema interno ganha as marcações de crítico (a frequência tolerável cai de 1/ano para 0,1/ano) e de equipamento em ZPR₀ᴬ, que decide se F_B é contabilizado.",
      "Novo painel \"Como atender a norma\": quando algum critério reprova, o botão procura as combinações de medidas mais enxutas que trazem R1, R3 e F para dentro dos limites de uma vez, e aplica a escolhida nos campos.",
      "A busca varre o catálogo inteiro — até 600 mil combinações — em vez de parar cedo, para que \"nenhuma combinação resolve\" só apareça depois de olhar todas. Por isso ela roda num botão, e não a cada campo digitado.",
      "A ordem das sugestões usa um peso de esforço de obra definido no código, não valor normativo: mudá-lo muda só a ordem de apresentação, nunca se a combinação atende.",
      "Correção encontrada no caminho: em zona com risco de explosão o app aceitava a redução por providências contra incêndio, que a Tabela C.4 não permite ali — o fator r_p é sempre 1 nesse caso. Um galpão em zona 1 com instalações automáticas aparecia com R1 = 4,29 × 10⁻⁶ e veredito verde quando o valor correto é 1,80 × 10⁻⁵, quase o dobro do tolerável.",
    ],
  },
  {
    versao: "1.23.0",
    data: "2026-08-07",
    titulo: "Memorial de cálculo em PDF na aba SPDA",
    tipo: "novo",
    itens: [
      "Botão \"Relatório PDF\" na aba SPDA: exporta o memorial completo — dados de entrada, áreas de exposição, número de eventos, probabilidades e perdas dos Anexos A, B e C, componentes de risco, veredito R1/R3 e frequência de danos F.",
      "Fórmulas e números de equação conferidos diretamente contra o texto oficial da ABNT NBR 5419-2:2026 (2ª edição).",
    ],
  },
  {
    versao: "1.24.0",
    data: "2026-08-07",
    titulo: "Projeto SPDA na nuvem, com áreas por estrutura",
    tipo: "novo",
    itens: [
      "A aba SPDA passa a salvar projetos na nuvem: um projeto (o site ou cliente) agrupa várias áreas, cada uma com sua própria análise de risco completa — diferente do salvamento único das outras abas, porque a norma trata cada estrutura como zona de estudo própria.",
      "Painel \"Projeto\" no topo da aba: criar/apagar projeto, criar/carregar/apagar área, e uma barra de edição mostrando projeto e área atuais.",
    ],
  },
  {
    versao: "1.25.0",
    data: "2026-08-08",
    titulo: "Memorial de cabos com apresentação nova",
    tipo: "melhoria",
    itens: [
      "O Memorial PDF do quadro de cargas ganha cabeçalho com o emblema, tabela com bordas de célula e numeração de página em todas as folhas.",
      "O detalhamento de cada circuito virou uma ficha fechada em página retrato — entrada e resultado lado a lado, trechos numa minitabela e os cabos numa faixa destacada. Antes era texto corrido numa página deitada quase vazia.",
      "Uma ficha nunca é dividida entre duas folhas: a altura é medida antes de desenhar.",
      "O PDF de um circuito só usa a mesma ficha, então os dois documentos ficam visualmente iguais.",
      "As ressalvas de cálculo saíram do rodapé, onde vinham cortadas no meio, para uma nota no corpo do documento.",
      "As cores, o cabeçalho e a tabela saíram para um módulo de tema compartilhado, primeiro passo para os outros PDFs do app usarem a mesma cara.",
    ],
  },
  {
    versao: "1.26.0",
    data: "2026-08-10",
    titulo: "Simulação de infraestrutura sem sair do quadro de cargas",
    tipo: "novo",
    itens: [
      "Marque os circuitos no quadro de cargas e clique em Simular: a busca da melhor infraestrutura roda ali mesmo, com o desenho do trecho pronto de primeira — sem trocar de aba e sem clique extra.",
      "O desenho agora vem com a lista dos circuitos ao lado (número, TAG, descrição e designação de cabos), desenhada dentro da imagem, então ela sai também no PNG exportado.",
      "O filtro de tipo de infraestrutura já abre no conduto que os próprios circuitos declaram — simular um eletroduto para um circuito dimensionado como eletrocalha contradiz o método de referência e o fator de agrupamento que definiram a bitola.",
      "Caixinha de trifólio por circuito no painel: desmarque quando as três fases correrem soltas em vez de amarradas em feixe, e a simulação refaz o empacotamento.",
      "A ocupação é recalculada ao vivo conforme você mexe nos circuitos; se a bitola mudar, o painel avisa que os cabos mudaram e oferece re-simular.",
      "O caminho antigo continua: o link Abrir na aba Infraestrutura leva os mesmos cabos para lá, onde ficam Projetos, cabos avulsos, derating e o Relatório PDF.",
    ],
  },
  {
    versao: "1.26.1",
    data: "2026-08-11",
    titulo: "Feixe de trifólio deixa de invadir o cabo vizinho",
    tipo: "correcao",
    itens: [
      "O feixe de trifólio podia se sobrepor a um cabo já acomodado ao lado — o desenho mostrava os condutores se atravessando e, num trecho apertado, a busca podia aprovar uma infraestrutura menor do que o necessário. Corrigido na calha e no eletroduto.",
      "A causa: o feixe é rígido, mas cada um dos três condutores era descido isoladamente e depois nivelado pelo mais obstruído — o que erguia os outros acima do próprio repouso, sem conferir se havia espaço lá em cima. Agora a acomodação é resolvida para o feixe inteiro de uma vez.",
      "O resumo por bitola não ficava mais cortado quando a calha é mais alta que larga.",
    ],
  },
  {
    versao: "1.26.2",
    data: "2026-08-11",
    titulo: "Motor de infraestrutura coberto por testes",
    tipo: "interno",
    itens: [
      "Empacotamento, ocupação e fatores de agrupamento passam a ter testes automáticos — antes eram a única parte do app sem nenhum, apesar de serem o que decide se o projeto está dentro da norma.",
      "Os fatores da Tabela 42 da NBR 5410 e os limites de ocupação (53%, 40% e 31%) ficam travados contra alteração acidental.",
      "Centenas de trechos plausíveis são conferidos a cada execução contra os invariantes físicos: cabo não atravessa cabo, nada vaza da infraestrutura e nada flutua no ar. Foi essa varredura que revelou a falha do trifólio corrigida na versão anterior.",
    ],
  },
  {
    versao: "1.27.0",
    data: "2026-08-11",
    titulo: "Desenho da simulação mais compacto",
    tipo: "melhoria",
    itens: [
      "A lista de circuitos saiu da coluna lateral e foi para baixo do desenho, logo acima do resumo por bitola.",
      "A lista quebra em colunas de 10 circuitos: a partir do décimo primeiro, o desenho cresce para o lado em vez de esticar para baixo sem limite. Um trecho de 50 circuitos ocupava mais de 2000px de altura na tela; agora nenhum passa de 700px.",
      "O desenho passou a ser escalado para caber numa moldura, em vez de ter largura fixa — assim um trecho estreito e alto não é mais ampliado até virar uma parede de pixels.",
      "O desenho da aba Infraestrutura não mudou: lá não há lista de circuitos nem resumo.",
    ],
  },
];

// Ordena versões maior.menor.correção. Negativo se `a` vem antes de `b`.
// Comparar como texto não serve: "1.9.0" > "1.10.0" em ordem alfabética.
export function compararVersao(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export const APP_VERSION = CHANGELOG[CHANGELOG.length - 1].versao;
