#!/usr/bin/env bash
# ============================================================
#  Escáner de topología de red — genera topologia-escaneada.json
#  Linux / macOS. Solo usa utilidades estándar (ping, arp, traceroute).
#  Uso:  bash escanear-red.sh
# ============================================================
set -u

echo ""
echo "=============================================="
echo "   ESCANER DE RED - Topologia automatica"
echo "=============================================="
echo ""

# ── 1. Detectar IP local y gateway ───────────────────────────────────────────
echo "[1/5] Detectando interfaz de red y gateway..."

GATEWAY=""
LOCAL_IP=""

if command -v ip >/dev/null 2>&1; then
  GATEWAY=$(ip route 2>/dev/null | awk '/^default/ {print $3; exit}')
  LOCAL_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oE 'src [0-9.]+' | awk '{print $2}')
fi
if [ -z "$GATEWAY" ] && command -v netstat >/dev/null 2>&1; then
  GATEWAY=$(netstat -rn 2>/dev/null | awk '/^default|^0\.0\.0\.0/ {print $2; exit}')
fi
if [ -z "$GATEWAY" ] && [ -r /proc/net/route ]; then
  # Fallback: /proc/net/route (gateway en hex little-endian)
  GW_HEX=$(awk '$2 == "00000000" {print $3; exit}' /proc/net/route)
  if [ -n "$GW_HEX" ]; then
    GATEWAY=$(printf '%d.%d.%d.%d' \
      "0x$(echo "$GW_HEX" | cut -c7-8)" "0x$(echo "$GW_HEX" | cut -c5-6)" \
      "0x$(echo "$GW_HEX" | cut -c3-4)" "0x$(echo "$GW_HEX" | cut -c1-2)")
  fi
fi
if [ -z "$LOCAL_IP" ] && command -v ifconfig >/dev/null 2>&1; then
  LOCAL_IP=$(ifconfig 2>/dev/null | grep -oE 'inet (addr:)?[0-9.]+' | grep -v '127.0.0.1' | head -1 | grep -oE '[0-9.]+$')
fi
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

if [ -z "$GATEWAY" ]; then
  echo "ERROR: no se pudo detectar el gateway. ¿Estás conectado a la red?"
  exit 1
fi

PREFIX=$(echo "$LOCAL_IP" | cut -d. -f1-3)
[ -z "$PREFIX" ] && PREFIX=$(echo "$GATEWAY" | cut -d. -f1-3)

echo "      IP local: ${LOCAL_IP:-desconocida} | Gateway: $GATEWAY"

# ── Helpers ──────────────────────────────────────────────────────────────────
is_private_ip() {
  case "$1" in
    10.*|192.168.*) return 0 ;;
    172.1[6-9].*|172.2[0-9].*|172.3[01].*) return 0 ;;
    100.*)
      second=$(echo "$1" | cut -d. -f2)
      [ "$second" -ge 64 ] && [ "$second" -le 127 ] && return 0
      return 1 ;;
    *) return 1 ;;
  esac
}

is_starlink_ip() {
  [ "$1" = "192.168.100.1" ] && return 0
  case "$1" in
    100.*)
      second=$(echo "$1" | cut -d. -f2)
      [ "$second" -ge 64 ] && [ "$second" -le 127 ] && return 0 ;;
  esac
  return 1
}

get_vendor() {
  # OUI aproximado por prefijo MAC (mayúsculas, separador :)
  case "$1" in
    24:A4:3C*|F0:9F:C2*|78:8A:20*|68:D7:9A*|B4:FB:E4*|74:83:C2*|DC:9F:DB*|04:18:D6*) echo "Ubiquiti" ;;
    4C:5E:0C*|D4:CA:6D*|6C:3B:6B*|E4:8D:8C*|CC:2D:E0*|48:8F:5A*|B8:69:F4*|08:55:31*) echo "MikroTik" ;;
    50:C7:BF*|D8:07:B6*|F4:F2:6D*|C4:6E:1F*|14:CC:20*|98:DA:C4*|B0:4E:26*|60:32:B1*) echo "TP-Link" ;;
    00:0C:43*|58:C1:7A*) echo "Cambium" ;;
    A4:2B:B0*|C8:3A:35*) echo "Tenda" ;;
    B0:BE:76*|1C:7E:E5*) echo "D-Link" ;;
    A0:40:A0*|9C:3D:CF*) echo "Netgear" ;;
    *) echo "" ;;
  esac
}

is_antenna_vendor() {
  case "$1" in Ubiquiti|MikroTik|Cambium) return 0 ;; *) return 1 ;; esac
}

json_escape() {
  echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\n\r'
}

# ── 2. Traceroute (cadena de routers hacia el modem) ─────────────────────────
echo "[2/5] Siguiendo la cadena de routers hacia el modem (traceroute)..."

HOPS=""
if command -v traceroute >/dev/null 2>&1; then
  TR_OUT=$(traceroute -n -m 8 -w 1 -q 1 8.8.8.8 2>/dev/null)
  while IFS= read -r line; do
    hop_ip=$(echo "$line" | grep -oE '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' | head -1)
    [ -z "$hop_ip" ] && continue
    if is_private_ip "$hop_ip"; then
      case " $HOPS " in *" $hop_ip "*) ;; *) HOPS="$HOPS $hop_ip" ;; esac
    fi
  done <<EOF
$TR_OUT
EOF
else
  echo "      (traceroute no disponible — solo se mapeará la red local)"
fi
HOPS=$(echo "$HOPS" | xargs || true)
echo "      Routers en la cadena: ${HOPS:-solo gateway local}"

# ── 3. Ping sweep de la subred /24 ───────────────────────────────────────────
if command -v ping >/dev/null 2>&1; then
  echo "[3/5] Escaneando la subred local ($PREFIX.0/24) - esto tarda ~20s..."
  for i in $(seq 1 254); do
    ( ping -c 1 -W 1 "$PREFIX.$i" >/dev/null 2>&1 ) &
    # Limitar concurrencia a ~60 pings simultáneos
    while [ "$(jobs -r | wc -l)" -ge 60 ]; do wait -n 2>/dev/null || sleep 0.1; done
  done
  wait
else
  echo "[3/5] (ping no disponible — se usará solo la tabla ARP existente)"
fi

# ── 4. Tabla ARP ─────────────────────────────────────────────────────────────
echo "[4/5] Leyendo tabla ARP e identificando fabricantes..."

# Formato de salida normalizado: "IP MAC" por línea
ARP_ENTRIES=""
if command -v ip >/dev/null 2>&1; then
  ARP_ENTRIES=$(ip neigh 2>/dev/null | awk '$1 ~ /^[0-9]+\./ && /lladdr/ {for(i=1;i<=NF;i++) if($i=="lladdr") print $1, toupper($(i+1))}')
fi
if [ -z "$ARP_ENTRIES" ] && command -v arp >/dev/null 2>&1; then
  ARP_ENTRIES=$(arp -a 2>/dev/null | grep -oE '\(([0-9.]+)\) at ([0-9a-fA-F:]{17})' | sed 's/[()]//g; s/ at / /' | awk '{print $1, toupper($2)}')
fi
if [ -z "$ARP_ENTRIES" ] && [ -r /proc/net/arp ]; then
  ARP_ENTRIES=$(awk 'NR > 1 && $4 != "00:00:00:00:00:00" {print $1, toupper($4)}' /proc/net/arp)
fi

ALIVE_COUNT=$(echo "$ARP_ENTRIES" | grep -c . || echo 0)
echo "      Dispositivos con MAC conocida: $ALIVE_COUNT"

# ── 5. Construir topología JSON ──────────────────────────────────────────────
echo "[5/5] Armando topologia y generando JSON..."

HOSTNAME_LOCAL=$(hostname 2>/dev/null || echo "PC")
SCAN_DATE=$(date '+%Y-%m-%d %H:%M')
SITE="Escaneo $HOSTNAME_LOCAL"
OUT_FILE="$(cd "$(dirname "$0")" && pwd)/topologia-escaneada.json"

get_mac() {
  echo "$ARP_ENTRIES" | awk -v ip="$1" '$1 == ip {print $2; exit}'
}

NODES_JSON=""
EDGES_JSON=""
CHAIN_IDS=""
Y=40

# Cadena de routers: invertir HOPS (el último salto privado = modem, va arriba)
REVERSED=""
for hop in $HOPS; do REVERSED="$hop $REVERSED"; done

for hop_ip in $REVERSED; do
  MAC=$(get_mac "$hop_ip")
  VENDOR=$(get_vendor "$MAC")
  if is_starlink_ip "$hop_ip"; then
    NTYPE="isp"; LABEL="Starlink (modem)"
  elif [ "$hop_ip" = "$GATEWAY" ]; then
    NTYPE="router"; LABEL="Router local"
    [ -n "$VENDOR" ] && LABEL="Router $VENDOR"
  else
    NTYPE="router"; LABEL="Router intermedio"
    [ -n "$VENDOR" ] && LABEL="Router $VENDOR"
  fi
  NODE_ID="scan-$hop_ip"
  CHAIN_IDS="$CHAIN_IDS $NODE_ID"
  [ -n "$NODES_JSON" ] && NODES_JSON="$NODES_JSON,"
  NODES_JSON="$NODES_JSON
    {\"id\":\"$NODE_ID\",\"type\":\"$NTYPE\",\"position\":{\"x\":400,\"y\":$Y},\"zIndex\":1,\"data\":{\"label\":\"$(json_escape "$LABEL")\",\"nodeType\":\"$NTYPE\",\"site\":\"$(json_escape "$SITE")\",\"ip\":\"$hop_ip\",\"brand\":\"$VENDOR\",\"notes\":\"Detectado por traceroute. MAC: ${MAC:-desconocida}. Escaneado: $SCAN_DATE\"}}"
  Y=$((Y + 130))
done

# Edges de la cadena
CHAIN_IDS=$(echo "$CHAIN_IDS" | xargs || true)
PREV=""
IDX=0
for cid in $CHAIN_IDS; do
  if [ -n "$PREV" ]; then
    [ -n "$EDGES_JSON" ] && EDGES_JSON="$EDGES_JSON,"
    EDGES_JSON="$EDGES_JSON
    {\"id\":\"scan-e-chain-$IDX\",\"source\":\"$PREV\",\"target\":\"$cid\",\"type\":\"cable\",\"data\":{\"kind\":\"cable\"}}"
    IDX=$((IDX + 1))
  fi
  PREV="$cid"
done

# Gateway si no apareció en traceroute
GW_ID="scan-$GATEWAY"
case " $CHAIN_IDS " in
  *" $GW_ID "*) ;;
  *)
    MAC=$(get_mac "$GATEWAY")
    VENDOR=$(get_vendor "$MAC")
    LABEL="Router local"; [ -n "$VENDOR" ] && LABEL="Router $VENDOR"
    [ -n "$NODES_JSON" ] && NODES_JSON="$NODES_JSON,"
    NODES_JSON="$NODES_JSON
    {\"id\":\"$GW_ID\",\"type\":\"router\",\"position\":{\"x\":400,\"y\":$Y},\"zIndex\":1,\"data\":{\"label\":\"$(json_escape "$LABEL")\",\"nodeType\":\"router\",\"site\":\"$(json_escape "$SITE")\",\"ip\":\"$GATEWAY\",\"brand\":\"$VENDOR\",\"notes\":\"Gateway local. MAC: ${MAC:-desconocida}. Escaneado: $SCAN_DATE\"}}"
    if [ -n "$PREV" ]; then
      [ -n "$EDGES_JSON" ] && EDGES_JSON="$EDGES_JSON,"
      EDGES_JSON="$EDGES_JSON
    {\"id\":\"scan-e-chain-gw\",\"source\":\"$PREV\",\"target\":\"$GW_ID\",\"type\":\"cable\",\"data\":{\"kind\":\"cable\"}}"
    fi
    Y=$((Y + 130))
    ;;
esac

# Dispositivos de la LAN
DEVICE_Y=$((Y + 60))
COL=0
DEVICE_COUNT=0
while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  DEV_IP=$(echo "$entry" | awk '{print $1}')
  DEV_MAC=$(echo "$entry" | awk '{print $2}')

  # Saltar gateway, hops de la cadena, multicast/broadcast
  [ "$DEV_IP" = "$GATEWAY" ] && continue
  case " $HOPS " in *" $DEV_IP "*) continue ;; esac
  case "$DEV_IP" in 224.*|239.*|255.*) continue ;; esac
  case "$DEV_IP" in "$PREFIX".*) ;; *) continue ;; esac
  LAST_OCTET=$(echo "$DEV_IP" | cut -d. -f4)
  [ "$LAST_OCTET" = "255" ] && continue

  VENDOR=$(get_vendor "$DEV_MAC")
  NTYPE="client"
  if is_antenna_vendor "$VENDOR"; then
    NTYPE="antenna"
  elif [ -n "$VENDOR" ] && { [ "$LAST_OCTET" = "1" ] || [ "$LAST_OCTET" = "254" ]; }; then
    NTYPE="router"
  fi

  if [ "$DEV_IP" = "$LOCAL_IP" ]; then
    LABEL="Esta PC ($HOSTNAME_LOCAL)"
  elif [ -n "$VENDOR" ]; then
    LABEL="$VENDOR ($DEV_IP)"
  else
    LABEL="Dispositivo $DEV_IP"
  fi

  X=$((80 + (COL % 5) * 170))
  ROW_Y=$((DEVICE_Y + (COL / 5) * 120))

  [ -n "$NODES_JSON" ] && NODES_JSON="$NODES_JSON,"
  NODES_JSON="$NODES_JSON
    {\"id\":\"scan-$DEV_IP\",\"type\":\"$NTYPE\",\"position\":{\"x\":$X,\"y\":$ROW_Y},\"zIndex\":1,\"data\":{\"label\":\"$(json_escape "$LABEL")\",\"nodeType\":\"$NTYPE\",\"site\":\"$(json_escape "$SITE")\",\"ip\":\"$DEV_IP\",\"brand\":\"$VENDOR\",\"notes\":\"MAC: $DEV_MAC. Escaneado: $SCAN_DATE\"}}"

  [ -n "$EDGES_JSON" ] && EDGES_JSON="$EDGES_JSON,"
  EDGES_JSON="$EDGES_JSON
    {\"id\":\"scan-e-$DEV_IP\",\"source\":\"$GW_ID\",\"target\":\"scan-$DEV_IP\",\"type\":\"cable\",\"data\":{\"kind\":\"cable\"}}"

  COL=$((COL + 1))
  DEVICE_COUNT=$((DEVICE_COUNT + 1))
done <<EOF
$ARP_ENTRIES
EOF

cat > "$OUT_FILE" <<EOF
{
  "version": "1",
  "nodes": [$NODES_JSON
  ],
  "edges": [$EDGES_JSON
  ]
}
EOF

echo ""
echo "=============================================="
echo "  LISTO! Dispositivos LAN detectados: $DEVICE_COUNT"
echo "  Archivo generado:"
echo "  $OUT_FILE"
echo ""
echo "  Ahora abri la app y usa el boton 'Importar'"
echo "  para cargar este archivo."
echo "=============================================="
echo ""
echo "NOTA: el escaner ve los dispositivos de ESTA red local"
echo "y la cadena de routers hacia internet. Para mapear otra"
echo "casa, ejecuta este mismo script en una PC de esa casa e"
echo "importa ambos archivos (la app los combina sin duplicar)."
