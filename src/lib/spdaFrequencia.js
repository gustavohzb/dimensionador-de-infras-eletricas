import { FREQUENCIA_TOLERAVEL } from "../data/spdaNBR5419";

// Seção 7 da NBR 5419-2:2026 — frequência de danos F_X = N_X × P_X (equação
// 15), avaliada por sistema interno e comparada com a frequência tolerável
// F_T da Tabela 7.
//
// É critério independente do risco: uma estrutura pode ficar abaixo do R1
// tolerável e mesmo assim reprovar aqui, porque F não é ponderado por perda
// nem por presença de pessoas — conta só quantas vezes o dano acontece.
//
// A criticidade é do SISTEMA, não da estrutura: a norma define sistema
// crítico como aquele cuja falha pode afetar uma comunidade, com perdas
// irreversíveis ou de longa duração. O mesmo prédio pode ter um CFTV comum e
// um sistema de combate a incêndio crítico.
export function frequenciaDanos({ eventos, probs, sistemas = [] }) {
  return sistemas.map((s) => {
    const ps = probs.porSistema.find((x) => x.id === s.id);
    const evLinha = eventos.porLinha.find((x) => x.id === s.linhaId);
    const pLinha = probs.porLinha.find((x) => x.id === s.linhaId);

    // Descargas na linha: N_L + N_DJ, como em R_U, R_V e R_W (6.5.4).
    const naLinha = evLinha ? evLinha.nl + evLinha.ndj : 0;

    const fc = eventos.nd * (ps?.pc ?? 0);
    const fm = eventos.nm * (ps?.pm ?? 0);
    const fw = pLinha ? naLinha * pLinha.pw : 0;
    const fv = pLinha ? naLinha * probs.peb : 0;
    const fz = evLinha && pLinha ? evLinha.ni * pLinha.pz : 0;
    // Nota "a" da Tabela 7 reúne três situações (equipamento em ZPR₀ᴬ,
    // isolado ou no topo da estrutura) sob uma única marcação do sistema,
    // s.zpr0a — é o engenheiro quem atesta que uma delas se aplica. Fora
    // disso, F_B é zero.
    const fb = s.zpr0a ? eventos.nd * probs.pb : 0;

    const maior = Math.max(fc, fm, fw, fv, fz, fb);
    const ft = s.critico ? FREQUENCIA_TOLERAVEL.critico : FREQUENCIA_TOLERAVEL.naoCritico;

    return { id: s.id, fc, fm, fw, fv, fz, fb, maior, ft, atende: maior <= ft };
  });
}
