#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node_bin="$(command -v node)"
if [[ ! -f "$repo_dir/backend/.env" ]]; then
  echo "Configure backend/.env antes de instalar o serviço." >&2
  exit 1
fi
if [[ ! -f "$repo_dir/backend/dist/server.js" || ! -f "$repo_dir/frontend/dist/index.html" ]]; then
  echo "Execute npm run build antes de instalar o serviço." >&2
  exit 1
fi
unit_dir="$HOME/.config/systemd/user"
mkdir -p "$unit_dir"
cat > "$unit_dir/tv-remote.service" <<EOF
[Unit]
Description=Controle remoto Android TV
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$repo_dir/backend
ExecStart=$node_bin dist/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now tv-remote.service
echo "Serviço instalado. Verifique: systemctl --user status tv-remote.service"
echo "Para iniciar após reiniciar sem login: sudo loginctl enable-linger $USER"
