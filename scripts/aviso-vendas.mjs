// Avisa no Slack (#evento_t1p) cada venda aprovada nova do evento no Sympla.
// Guarda só o hash dos pedidos já avisados (o repo é público): nada de nome ou e-mail em arquivo ou log.
import fs from 'fs';
import crypto from 'crypto';

const EVENTO = '3585672';
const ARQ = 'data/vendas-avisadas.txt';
const { SYMPLA_TOKEN, SLACK_WEBHOOK_VENDAS } = process.env;
if (!SYMPLA_TOKEN || !SLACK_WEBHOOK_VENDAS) throw new Error('faltam os secrets SYMPLA_TOKEN e SLACK_WEBHOOK_VENDAS');

const hash = id => crypto.createHash('sha256').update('t1p:' + id).digest('hex').slice(0, 16);
const vistos = new Set(fs.existsSync(ARQ) ? fs.readFileSync(ARQ, 'utf8').split('\n').filter(Boolean) : []);

const pedidos = [];
for (let page = 1; page < 100; page++) {
  const res = await fetch(`https://api.sympla.com.br/public/v3/events/${EVENTO}/orders?page_size=200&page=${page}`, { headers: { s_token: SYMPLA_TOKEN } });
  if (!res.ok) throw new Error(`Sympla respondeu ${res.status}`);
  const j = await res.json();
  pedidos.push(...(j.data || []));
  if (!j.pagination || !j.pagination.has_next) break;
}

const novos = pedidos
  .filter(p => p.order_status === 'A' && !vistos.has(hash(p.id)))
  .sort((a, b) => String(a.approved_date).localeCompare(String(b.approved_date)));

for (const p of novos) {
  const nome = `${p.buyer_first_name || ''} ${p.buyer_last_name || ''}`.trim();
  const valor = Number(p.order_total_sale_price || 0).toFixed(2);
  const text = `Nova venda do T1P realizada!\n\nNome: ${nome}\nValor: R$${valor}`;
  const res = await fetch(SLACK_WEBHOOK_VENDAS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (!res.ok) throw new Error(`Slack respondeu ${res.status}`);
  vistos.add(hash(p.id));
  fs.writeFileSync(ARQ, [...vistos].join('\n') + '\n');
}

console.log(`${pedidos.filter(p => p.order_status === 'A').length} aprovados, ${novos.length} avisos novos`);
