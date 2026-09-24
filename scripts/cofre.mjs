// Cifra/decifra arquivos do repositório público com a senha do painel (AES-256-GCM).
// Uso: node scripts/cofre.mjs enc|dec <entrada> <saida>   (senha em PAINEL_SENHA)
import crypto from 'node:crypto';
import fs from 'node:fs';

export function cifrar(buf, senha) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(senha, salt, 32);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([Buffer.from('T1P1'), salt, iv, c.getAuthTag(), body]);
}
export function decifrar(buf, senha) {
  if (buf.subarray(0, 4).toString() !== 'T1P1') throw new Error('arquivo não é do cofre');
  const salt = buf.subarray(4, 20), iv = buf.subarray(20, 32), tag = buf.subarray(32, 48);
  const key = crypto.scryptSync(senha, salt, 32);
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(buf.subarray(48)), d.final()]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [modo, entrada, saida] = process.argv.slice(2);
  const senha = process.env.PAINEL_SENHA;
  if (!senha || !['enc', 'dec'].includes(modo) || !entrada || !saida) {
    console.error('uso: PAINEL_SENHA=... node scripts/cofre.mjs enc|dec <entrada> <saida>');
    process.exit(1);
  }
  const buf = fs.readFileSync(entrada);
  fs.writeFileSync(saida, modo === 'enc' ? cifrar(buf, senha) : decifrar(buf, senha));
}
