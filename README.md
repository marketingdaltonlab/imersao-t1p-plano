# Imersão T1P · Painel do lançamento

Painel interno do marketing do Dalton Lab: countdown, vendas contra a meta, acessos, UTMs, plano base, calendário, ações e canais.

- A página publicada (`index.html`) é cifrada com StatiCrypt e abre só com senha.
- O template (`src/template.html.enc`) e os dados (`data/dados.json.enc`) ficam cifrados no repositório com a mesma senha.
- O workflow `Atualizar painel` roda todo dia às 7h (Brasília) e também pelo botão "Run workflow": puxa GA4 e Sympla, remonta e republica.

Secrets do repositório: `PAINEL_SENHA`, `STATICRYPT_SALT` (obrigatórios), `GA4_CREDENTIALS` (JSON da conta de serviço com leitura na propriedade 552107389) e `SYMPLA_TOKEN` (opcionais; sem eles o painel mantém a última leitura e mostra um aviso).
