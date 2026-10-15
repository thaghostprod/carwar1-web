#!/usr/bin/env sh
# Avvia Car Wars con il backend condiviso (server.js).
# Uso:  ./avvia.sh            -> http://localhost:8080
#       PORT=9000 ./avvia.sh  -> porta personalizzata
#       CAR_WARS_TOKEN=miapass ./avvia.sh  -> protetto da password

PORT="${PORT:-8080}"
export PORT

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non trovato: installalo da https://nodejs.org (versione LTS), poi riprova."
  exit 1
fi

echo
echo "  ==============================================="
echo "   Car Wars - backend condiviso in avvio"
echo "  ==============================================="
echo
echo "   Apri nel browser:  http://localhost:${PORT}"
echo "   Per fermare il server:  CTRL + C"
echo

exec node "$(dirname "$0")/server.js"
