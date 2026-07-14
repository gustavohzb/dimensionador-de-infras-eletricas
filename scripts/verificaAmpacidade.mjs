// Confere as tabelas de ampacidade do app (TABELAS_POR_TEMP) célula a célula
// contra o PDF oficial da ABNT NBR 5410:2004 (Tabelas 36, 37, 38 e 39) e
// (re)gera o fixture usado pelo teste src/data/ampacidadeNBR5410.test.js.
//
// Não roda no CI nem no `npm test` — é uma ferramenta manual, executada só
// quando se quer reconferir contra o PDF ou atualizar o fixture. Depende de
// dois pacotes que NÃO fazem parte do projeto (instale ad-hoc):
//     npm i -D pdf-parse jiti
//
// Uso:
//     node scripts/verificaAmpacidade.mjs <caminho-do-pdf>            # só confere
//     node scripts/verificaAmpacidade.mjs <caminho-do-pdf> --emit     # confere e regrava o fixture
//
// O PDF da norma não é versionado. Referência usada na transcrição original:
// as "tabelas completas 5410" (Tabelas 33/36/37/38/39/40).

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { PDFParse } from "pdf-parse";
import { createJiti } from "jiti";

const pdfPath = process.argv[2];
const emit = process.argv.includes("--emit");
if (!pdfPath) {
  console.error("Informe o caminho do PDF da norma. Ex.: node scripts/verificaAmpacidade.mjs ./tabelas-5410.pdf");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../src/data");

const jiti = createJiti(import.meta.url);
const { TABELAS_POR_TEMP } = await jiti.import(path.join(dataDir, "cabosNBR5410.js"));

const buf = fs.readFileSync(pdfPath);
const parsed = await new PDFParse({ data: new Uint8Array(buf) }).getText();
const t = parsed.text;

const num = (s) => Number(String(s).replace(",", "."));
const slice = (a, b) => t.slice(t.indexOf(a), t.indexOf(b, t.indexOf(a) + 1));

// mode "B" = 12 números (A1,A2,B1,B2,C,D × 2/3 carregados);
// mode "EFG" = 7 números (E2,E3,F-2just,F-3trif,F-3plano,G-h,G-v).
function parseTabela(txt, mode) {
  const want = mode === "B" ? 12 : 7;
  const out = { cobre: {}, aluminio: {} };
  let mat = null;
  for (const line of txt.split("\n")) {
    const l = line.trim();
    if (l === "Cobre") { mat = "cobre"; continue; }
    if (l.startsWith("Alumínio")) { mat = "aluminio"; continue; }
    if (!mat) continue;
    const toks = l.split(/\s+/);
    if (toks.length !== want + 1) continue;
    if (!toks.every((x) => /^[\d,]+$/.test(x))) continue;
    out[mat][num(toks[0])] = toks.slice(1).map(num);
  }
  return out;
}

const fromB = (r) => ({ B1: [r[4], r[5]], B2: [r[6], r[7]], C: [r[8], r[9]], D: [r[10], r[11]] });
const fromEFG = (r) => ({ E: [r[0], r[1]], F: [r[2], r[3], r[4]], G: [r[5], r[6]] });

const ref = { 70: { cobre: {}, aluminio: {} }, 90: { cobre: {}, aluminio: {} } };
function ingest(temp, pB, pEFG) {
  for (const mat of ["cobre", "aluminio"]) {
    const tab = {};
    for (const [sec, row] of Object.entries(pB[mat])) {
      const m = fromB(row);
      for (const k of ["B1", "B2", "C", "D"]) (tab[k] ??= {})[sec] = m[k];
    }
    for (const [sec, row] of Object.entries(pEFG[mat])) {
      const m = fromEFG(row);
      for (const k of ["E", "F", "G"]) (tab[k] ??= {})[sec] = m[k];
    }
    ref[temp][mat] = tab;
  }
}

ingest(70, parseTabela(slice("Tabela 36", "Tabela 37"), "B"), parseTabela(slice("Tabela 38", "Tabela 39"), "EFG"));
ingest(90, parseTabela(slice("Tabela 37", "Tabela 38"), "B"), parseTabela(slice("Tabela 39", "Tabela 40"), "EFG"));

let checked = 0;
const problems = [];
for (const temp of [90, 70]) {
  for (const mat of ["cobre", "aluminio"]) {
    const code = TABELAS_POR_TEMP[temp][mat];
    for (const metodo of ["B1", "B2", "C", "D", "E", "F", "G"]) {
      for (const [sec, cVals] of Object.entries(code[metodo] ?? {})) {
        const rVals = ref[temp][mat][metodo]?.[sec];
        if (!rVals) { problems.push(`SEM ref PDF: ${temp}°C ${mat} ${metodo} ${sec}mm²`); continue; }
        cVals.forEach((v, i) => {
          checked++;
          if (Number(v) !== Number(rVals[i])) {
            problems.push(`DIVERGE ${temp}°C ${mat} ${metodo} ${sec}mm² col${i + 1}: código=${v} norma=${rVals[i]}`);
          }
        });
      }
    }
  }
}

console.log(`Células conferidas: ${checked} · divergências: ${problems.filter((p) => p.startsWith("DIVERGE")).length}`);
for (const p of problems) console.log(p);
if (problems.length === 0) console.log("✓ Todas as células do código batem com o PDF da norma.");

if (emit) {
  const fixture = {};
  for (const temp of [90, 70]) {
    fixture[temp] = {};
    for (const mat of ["cobre", "aluminio"]) {
      fixture[temp][mat] = {};
      const code = TABELAS_POR_TEMP[temp][mat];
      for (const metodo of ["B1", "B2", "C", "D", "E", "F", "G"]) {
        fixture[temp][mat][metodo] = {};
        for (const sec of Object.keys(code[metodo])) fixture[temp][mat][metodo][sec] = ref[temp][mat][metodo][sec];
      }
    }
  }
  const dest = path.join(dataDir, "__fixtures__/ampacidadeNBR5410.norma.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(fixture) + "\n");
  console.log("Fixture regravado:", pathToFileURL(dest).href);
}

process.exit(problems.length ? 1 : 0);
