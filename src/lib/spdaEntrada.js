// Migração de estado salvo (localStorage ou área da nuvem) para o formato
// atual de `entrada`. Extraída de SpdaTab.jsx para ser reutilizada tanto no
// carregamento local quanto no carregamento de uma área do Supabase — sem
// isso, uma área salva antes de um campo novo existir carregaria com
// undefined, e um checkbox sem valor definido nasce "não controlado".
import { defaultEntrada } from "./spdaRisco";

export function normalizarEntrada(salvo) {
  if (!salvo) return defaultEntrada();
  const base = defaultEntrada();
  const estrutura = { ...base.estrutura, ...salvo.estrutura };
  // A ocupação era guardada em horas por ano; virou horas por dia mais dias
  // por semana. Converte o que estiver salvo assumindo semana cheia, que é
  // como o valor antigo tinha sido informado.
  if (salvo.estrutura?.tz != null && salvo.estrutura.horasDia == null) {
    estrutura.horasDia = Math.min(24, +(salvo.estrutura.tz / 365).toFixed(2));
    estrutura.diasSemana = 7;
  }
  delete estrutura.tz;
  // Sistemas salvos antes da Seção 7 não têm as marcações novas.
  const protecoes = { ...base.protecoes, ...salvo.protecoes };
  protecoes.sistemas = (protecoes.sistemas ?? []).map((s) => ({
    critico: false, zpr0a: false, ...s,
  }));
  return { estrutura, linhas: salvo.linhas ?? base.linhas, protecoes };
}
