// Puxa os números reais do lançamento e grava data/dados.json.
// GA4: acessos por dia e por UTM (precisa de GA4_CREDENTIALS = JSON da conta de serviço com leitura na propriedade).
// Sympla: ingressos vendidos (precisa de SYMPLA_TOKEN, gerado em Minha conta > Integrações).
// O que não tiver credencial fica com o último valor salvo, e o aviso aparece no painel.
import fs from 'node:fs';

const ARQ = 'data/dados.json';
const GA4_PROPRIEDADE = '552107389';
const SYMPLA_EVENTO = '3585672';
const INICIO = '2026-09-21';
const HOST_LANDING = 'imersaot1p.daltonlab.ai';

const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const dados = fs.existsSync(ARQ) ? JSON.parse(fs.readFileSync(ARQ, 'utf8')) : {};
dados.meta ??= 150;
dados.avisos = [];

async function ga4() {
  const cred = process.env.GA4_CREDENTIALS;
  if (!cred) { dados.avisos.push('GA4 ainda sem conexão automática: acessos e UTMs são da última leitura manual.'); return; }
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ credentials: JSON.parse(cred) });
  const property = `properties/${GA4_PROPRIEDADE}`;
  const dateRanges = [{ startDate: INICIO, endDate: 'today' }];

  const [trafego] = await client.runReport({
    property, dateRanges, limit: 100000,
    dimensions: ['date', 'hostName', 'sessionSource', 'sessionMedium', 'sessionCampaignName', 'sessionManualAdContent'].map(name => ({ name })),
    metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }],
  });

  const porDia = {}, porDiaTodos = {}, utm = new Map();
  for (const r of trafego.rows || []) {
    const [d, host, source, medium, campaign, content] = r.dimensionValues.map(v => v.value);
    const s = +r.metricValues[0].value, e = +r.metricValues[1].value;
    const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
    porDiaTodos[iso] = (porDiaTodos[iso] || 0) + s;
    if (host === HOST_LANDING) porDia[iso] = (porDia[iso] || 0) + s;
    const k = [source, medium, campaign, content].join('\u0000');
    const u = utm.get(k) || { source, medium, campaign, content, sessoes: 0, engajadas: 0, landing: 0 };
    u.sessoes += s; u.engajadas += e; if (host === HOST_LANDING) u.landing += s;
    utm.set(k, u);
  }
  const soma = o => Object.values(o).reduce((a, b) => a + b, 0);
  dados.acessos = { escopo: 'landing', total: soma(porDia), porDia, todosOsSites: { total: soma(porDiaTodos), porDia: porDiaTodos } };
  dados.utm = [...utm.values()].sort((a, b) => b.sessoes - a.sessoes);
  delete dados.utmConteudo;

  const [ev] = await client.runReport({
    property, dateRanges,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['click_comprar', 'generate_lead', 'begin_checkout', 'purchase'] } } },
  });
  dados.eventos = {};
  for (const r of ev.rows || []) dados.eventos[r.dimensionValues[0].value] = +r.metricValues[0].value;
  dados.fonteAcessos = 'ga4-api';
}

async function sympla() {
  const token = process.env.SYMPLA_TOKEN;
  if (!token) { dados.avisos.push('Sympla ainda sem conexão automática: ingressos vendidos são o último número informado.'); return; }
  const get = async (rota) => {
    const itens = [];
    for (let page = 1; page < 100; page++) {
      const res = await fetch(`https://api.sympla.com.br/public/v4/events/${SYMPLA_EVENTO}/${rota}?page_size=200&page=${page}`, { headers: { s_token: token } });
      if (!res.ok) throw new Error(`Sympla ${rota} respondeu ${res.status}`);
      const j = await res.json();
      itens.push(...(j.data || []));
      if (!j.pagination || !j.pagination.has_next) break;
    }
    return itens;
  };
  const pedidos = await get('orders');
  const aprovados = new Map(pedidos.filter(p => p.order_status === 'A').map(p => [String(p.id), (p.order_date || '').slice(0, 10)]));
  const participantes = (await get('participants')).filter(p => aprovados.has(String(p.order_id)));
  const porDia = {};
  let mentoria = 0;
  for (const p of participantes) {
    const d = aprovados.get(String(p.order_id));
    if (d) porDia[d] = (porDia[d] || 0) + 1;
    if (/mentoria/i.test(p.ticket_name || '')) mentoria++;
  }
  // Só contagens: nenhum dado pessoal sai do Sympla.
  dados.vendas = { total: participantes.length, mentoria, imersao: participantes.length - mentoria, porDia, fonte: 'sympla-api' };
}

for (const [nome, fn] of [['GA4', ga4], ['Sympla', sympla]]) {
  try { await fn(); }
  catch (e) { console.error(nome, e.message); dados.avisos.push(`${nome} falhou na leitura de hoje (${e.message}). Os números são da leitura anterior.`); }
}
dados.atualizadoEm = new Date().toISOString();
dados.periodo = { inicio: INICIO, fim: hoje };
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync(ARQ, JSON.stringify(dados, null, 2));
console.log('dados.json atualizado', dados.avisos);
