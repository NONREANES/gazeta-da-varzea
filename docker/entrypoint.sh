#!/bin/sh
set -e
# Garante um único MPM ativo (o PHP do Apache exige o "prefork").
# Sem isso, o Apache pode falhar com "AH00534: More than one MPM loaded".
rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf
ln -sf ../mods-available/mpm_prefork.load /etc/apache2/mods-enabled/mpm_prefork.load
ln -sf ../mods-available/mpm_prefork.conf /etc/apache2/mods-enabled/mpm_prefork.conf

# A Railway informa a porta em $PORT
PORT="${PORT:-8080}"
sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf

# Se houver Volume da Railway, usa o caminho dele
if [ -n "$RAILWAY_VOLUME_MOUNT_PATH" ]; then export STORAGE_DIR="$RAILWAY_VOLUME_MOUNT_PATH"; fi
export STORAGE_DIR="${STORAGE_DIR:-/data}"

mkdir -p "$STORAGE_DIR/uploads" "$STORAGE_DIR/backups"
chown -R www-data:www-data "$STORAGE_DIR"

if [ -z "$ADMIN_SENHA" ]; then
  echo "AVISO: variável ADMIN_SENHA não definida — o painel /admin ficará bloqueado até você definir."
fi
if [ ! -f "$STORAGE_DIR/dados.json" ]; then
  echo "Primeira execução: os dados de exemplo serão criados em $STORAGE_DIR/dados.json"
fi

exec apache2-foreground
