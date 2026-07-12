#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  Escáner de red para Android (Termux)
#  Conectate primero al WiFi que querés mapear (ej. el WiFi de
#  arrendatarios o el de la cabaña) y después corré este script.
#
#  Instalación (una sola vez):
#    1. Instalá Termux desde F-Droid: https://f-droid.org/packages/com.termux/
#       (NO uses la versión de Play Store, está discontinuada y desactualizada)
#    2. Abrí Termux y ejecutá:
#         pkg install -y iproute2
#         termux-setup-storage
#       (aceptá el permiso de almacenamiento que te pide Android)
#    3. Copiá este archivo a la carpeta de Termux (Download) y corré:
#         bash escanear-red-android.sh
#
#  LIMITACION: Android bloquea el acceso a la tabla ARP para apps sin
#  permisos de root (desde Android 10). Por eso este escaner NO puede
#  detectar direcciones MAC ni el fabricante de cada dispositivo, y
#  tampoco puede hacer traceroute (necesita privilegios que Android no
#  da). Solo devuelve la lista de IPs activas en la red — identificalas
#  a mano en la app (click en cada nodo y ponele el nombre correcto).
# ============================================================
set -u

echo ""
echo "=============================================="
echo "   ESCANER DE RED (Android / Termux)"
echo "=============================================="
echo ""
echo "IMPORTANTE: conectate primero al WiFi que queres"
echo "mapear (ej. WiFi de arrendatarios o de la cabana)"
echo "antes de continuar."
echo ""
read -p "Presiona Enter para empezar (o Ctrl+C para cancelar)... " _dummy

if ! command -v ip >/dev/null 2>&1; then
  echo ""
  echo "Falta el paquete 'iproute2'. Instalando..."
  pkg install -y iproute2 2>&1 | tail -5
fi

# ── 1. Detectar gateway e IP local ────────────────────────────────────────
echo ""
echo "[1/3] Detectando la red actual..."

GATEWAY=$(ip route 2>/dev/null | awk '/^default/ {print $3; exit}')
LOCAL_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oE 'src [0-9.]+' | awk '{print $2}')

if [ -z "$GATEWAY" ] && [ -r /proc/net/route ]; then
  GW_HEX=$(awk '$2 == "00000000" {print $3; exit}' /proc/net/route)
  if [ -n "$GW_HEX" ]; then
    GATEWAY=$(printf '%d.%d.%d.%d' \
      "0x$(echo "$GW_HEX" | cut -c7-8)" "0x$(echo "$GW_HEX" | cut -c5-6)" \
      "0x$(echo "$GW_HEX" | cut -c3-4)" "0x$(echo "$GW_HEX" | cut -c1-2)")
  fi
fi

if [ -z "$GATEWAY" ]; then
  echo "ERROR: no se detecto una conexion WiFi activa."
  echo "Conectate a la red que queres mapear y volve a intentar."
  exit 1
fi

PREFIX=$(echo "${LOCAL_IP:-$GATEWAY}" | cut -d. -f1-3)
echo "      IP de este telefono: ${LOCAL_IP:-desconocida} | Gateway (router de esta red): $GATEWAY"

# ── 2. Ping sweep de la subred /24 ───────────────────────────────────────
echo "[2/3] Buscando dispositivos activos en $PREFIX.0/24 (~30s)..."

PING_BIN="ping"
[ -x /system/bin/ping ] && PING_BIN="/system/bin/ping"

TMPFILE=$(mktemp)
: > "$TMPFILE"

for i in $(seq 1 254); do
  ip_try="$PREFIX.$i"
  (
    $PING_BIN -c 1 -W 1 "$ip_try" >/dev/null 2>&1 && echo "$ip_try" >> "$TMPFILE"
  ) &
  while [ "$(jobs -r | wc -l)" -ge 40 ]; do wait -n 2>/dev/null || sleep 0.1; done
done
wait

ALIVE_IPS=$(sort -t. -k4 -n -u "$TMPFILE" 2>/dev/null)
rm -f "$TMPFILE"
DEVICE_COUNT=$(echo "$ALIVE_IPS" | grep -c . || echo 0)
echo "      Dispositivos encontrados: $DEVICE_COUNT"

# ── 3. Armar topología y guardar JSON ────────────────────────────────────
echo "[3/3] Generando JSON..."

PHONE_NAME=$(getprop ro.product.model 2>/dev/null || echo "Telefono Android")
SCAN_DATE=$(date '+%Y-%m-%d %H:%M')
SITE="Escaneo WiFi $PREFIX.x"
GW_ID="scan-$GATEWAY"

json_escape() {
  echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\n\r'
}

NODES_JSON="
    {\"id\":\"$GW_ID\",\"type\":\"router\",\"position\":{\"x\":400,\"y\":40},\"zIndex\":1,\"data\":{\"label\":\"Router de esta red\",\"nodeType\":\"router\",\"site\":\"$(json_escape "$SITE")\",\"ip\":\"$GATEWAY\",\"brand\":\"\",\"notes\":\"Gateway detectado. Escaneado desde $PHONE_NAME el $SCAN_DATE. Sin MAC/fabricante (Android restringe el acceso a ARP).\"}}"
EDGES_JSON=""

COL=0
while IFS= read -r ip; do
  [ -z "$ip" ] && continue
  [ "$ip" = "$GATEWAY" ] && continue
  last_octet=$(echo "$ip" | cut -d. -f4)
  [ "$last_octet" = "255" ] && continue

  if [ "$ip" = "$LOCAL_IP" ]; then
    LABEL="Este telefono ($PHONE_NAME)"
  else
    LABEL="Dispositivo $ip"
  fi

  X=$((80 + (COL % 6) * 150))
  Y=$((220 + (COL / 6) * 110))

  NODES_JSON="$NODES_JSON,
    {\"id\":\"scan-$ip\",\"type\":\"client\",\"position\":{\"x\":$X,\"y\":$Y},\"zIndex\":1,\"data\":{\"label\":\"$(json_escape "$LABEL")\",\"nodeType\":\"client\",\"site\":\"$(json_escape "$SITE")\",\"ip\":\"$ip\",\"brand\":\"\",\"notes\":\"Escaneado desde $PHONE_NAME el $SCAN_DATE. Identificalo a mano: tipo de nodo y nombre real.\"}}"

  [ -n "$EDGES_JSON" ] && EDGES_JSON="$EDGES_JSON,"
  EDGES_JSON="$EDGES_JSON
    {\"id\":\"scan-e-$ip\",\"source\":\"$GW_ID\",\"target\":\"scan-$ip\",\"type\":\"wireless\",\"data\":{\"kind\":\"wireless\"}}"

  COL=$((COL + 1))
done <<EOF
$ALIVE_IPS
EOF

OUT_FILE="$HOME/topologia-escaneada.json"
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
echo "  LISTO! Dispositivos detectados: $COL"
echo "  Archivo generado:"
echo "  $OUT_FILE"

if [ -d "$HOME/storage/shared/Download" ]; then
  cp "$OUT_FILE" "$HOME/storage/shared/Download/topologia-escaneada.json" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo ""
    echo "  Tambien copiado a: Almacenamiento > Download >"
    echo "  topologia-escaneada.json  (accesible desde el navegador)"
  fi
fi

echo "=============================================="
echo ""
echo "  Ahora abri la app en este telefono (o pasate el"
echo "  archivo a otro dispositivo) y usa 'Importar' para"
echo "  cargarlo. Elegi 'combinar' si ya tenes otro mapa."
echo ""
echo "  NOTA: como no se detectaron MAC/fabricante, todos los"
echo "  dispositivos aparecen genericos ('Dispositivo IP')."
echo "  Hace click en cada uno en la app y ponele el nombre"
echo "  real (router, antena, TV, etc.)."
echo ""
