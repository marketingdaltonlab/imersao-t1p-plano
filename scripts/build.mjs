// Junta o template com data/dados.json e cifra a página com StatiCrypt -> index.html
// Precisa de PAINEL_SENHA e STATICRYPT_SALT (o salt fixo mantém o "lembrar por 30 dias" entre atualizações).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const senha = process.env.PAINEL_SENHA, salt = process.env.STATICRYPT_SALT;
if (!senha || !salt) { console.error('faltam PAINEL_SENHA e/ou STATICRYPT_SALT'); process.exit(1); }
const dados = fs.readFileSync('data/dados.json', 'utf8');
const html = fs.readFileSync('src/template.html', 'utf8')
  .replace('/*__DADOS__*/null', dados.replace(/</g, '\\u003c'));
fs.mkdirSync('dist/src', { recursive: true });
fs.writeFileSync('dist/src/index.html', html);
execFileSync('npx', ['staticrypt', 'dist/src/index.html', '-p', senha, '-s', salt, '-d', 'dist/out', '--short', '--remember', '30',
  '--template-title', 'Imersão T1P · Painel do lançamento',
  '--template-instructions', 'Página interna do marketing do Dalton Lab. Digite a senha pra abrir.',
  '--template-button', 'Entrar', '--template-placeholder', 'Senha', '--template-error', 'Senha incorreta',
  '--template-remember', 'Lembrar neste dispositivo por 30 dias',
  '--template-toggle-show', 'Mostrar senha', '--template-toggle-hide', 'Ocultar senha',
  '--template-color-primary', '#101537', '--template-color-secondary', '#F4F7FB'], { stdio: 'inherit' });
fs.copyFileSync('dist/out/index.html', 'index.html');
console.log('index.html gerado');
