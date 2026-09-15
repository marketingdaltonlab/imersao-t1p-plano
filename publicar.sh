#!/bin/sh
# Recifra source/index.html com a senha e publica. Uso: ./publicar.sh
cd "$(dirname "$0")"
printf "Senha da página: "; stty -echo; read PW; stty echo; echo
npx -y staticrypt source/index.html -p "$PW" -d encrypted --short --config false -r 30 \
  --template-title "Imersão T1P · Plano de ação" \
  --template-instructions "Página interna do marketing do Dalton Lab. Digite a senha pra abrir." \
  --template-button "Entrar" --template-placeholder "Senha" --template-error "Senha incorreta" \
  --template-remember "Lembrar neste dispositivo por 30 dias" \
  --template-color-primary "#101537" --template-color-secondary "#F4F7FB" --template-color-button "#101537" >/dev/null
cp encrypted/index.html index.html
git add -A && git commit -q -m "Atualiza plano ($(date +%d/%m\ %H:%M))" && git -c credential.helper=osxkeychain push -q && echo "publicado; o Pages atualiza em ~1 min"
