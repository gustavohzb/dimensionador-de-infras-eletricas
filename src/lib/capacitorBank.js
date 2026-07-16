// Cálculo de banco de capacitores — migração da planilha CAPAC-380 PARA 440.xlsx.
//
// A física: um capacitor entrega potência proporcional ao quadrado da tensão
// aplicada. Uma célula de 440V nominais operando numa rede de 380V entrega
// (380/440)² ≈ 74,6% da potência de placa. Daí as duas colunas de kvar por
// estágio (nominal e real) e todo o resto: corrente com a potência REAL na
// tensão da REDE, disjuntores com os fatores de sobredimensionamento usuais
// de capacitor (harmônicas + tolerância de +10% na tensão; a IEC exige
// suportar ≥1,35×In, 1,63 é o usual de projeto para o estágio e 1,25 para o
// geral, que soma estágios que não chaveiam juntos).
import { disjuntorComercial } from "../data/capacitores";

// estagios: [{ celulas: [kvar, ...] }] com kvar na tensão nominal da célula.
// trafo: { kva, percentualAlvo } ou null — a régua "banco ≈ 33% do trafo".
export function calcularBanco({
  vRede,
  vCapacitor,
  fatorDisjEstagio = 1.63,
  fatorDisjGeral = 1.25,
  estagios,
  trafo = null,
}) {
  const fatorTensao = (vRede / vCapacitor) ** 2;

  const linhas = estagios.map(({ celulas }, i) => {
    const kvarNominal = celulas.reduce((a, c) => a + c, 0);
    const kvarReal = kvarNominal * fatorTensao;
    const corrente = (kvarReal * 1000) / (vRede * Math.sqrt(3));
    const disjCalculado = corrente * fatorDisjEstagio;
    return {
      numero: i + 1,
      celulas,
      kvarNominal,
      kvarReal,
      corrente,
      disjCalculado,
      disjComercial: disjuntorComercial(disjCalculado),
    };
  });

  const kvarNominalTotal = linhas.reduce((a, l) => a + l.kvarNominal, 0);
  const kvarRealTotal = kvarNominalTotal * fatorTensao;
  // Soma das correntes de estágio (não a corrente do kvar total — dá no mesmo,
  // mas espelha a coluna P da planilha e deixa a conferência 1:1).
  const correnteTotal = linhas.reduce((a, l) => a + l.corrente, 0);
  const disjGeralCalculado = correnteTotal * fatorDisjGeral;

  return {
    fatorTensao,
    estagios: linhas,
    kvarNominalTotal,
    kvarRealTotal,
    correnteTotal,
    disjGeralCalculado,
    disjGeralComercial: disjuntorComercial(disjGeralCalculado),
    trafo:
      trafo && trafo.kva > 0
        ? {
            alvoKvar: (trafo.kva * trafo.percentualAlvo) / 100,
            percentualAtingido: (kvarRealTotal / trafo.kva) * 100,
          }
        : null,
  };
}
