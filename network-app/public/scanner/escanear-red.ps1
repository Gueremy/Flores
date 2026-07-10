# ============================================================
#  Escáner de topología de red — genera topologia-escaneada.json
#  Compatible con Windows PowerShell 5.1+ (incluido en Windows)
#  No requiere instalación. Ejecutar con escanear-red.bat
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   ESCANER DE RED - Topologia automatica"       -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Detectar interfaz activa y gateway ────────────────────────────────────
Write-Host "[1/5] Detectando interfaz de red y gateway..." -ForegroundColor Yellow

$config = Get-NetIPConfiguration | Where-Object {
    $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up'
} | Select-Object -First 1

if (-not $config) {
    Write-Host "ERROR: no se encontro una conexion de red activa." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

$localIP  = $config.IPv4Address.IPAddress
$gateway  = $config.IPv4DefaultGateway.NextHop
$prefix   = ($localIP -split '\.')[0..2] -join '.'

Write-Host "      IP local: $localIP | Gateway: $gateway" -ForegroundColor Gray

# ── 2. Traceroute hacia internet (descubre la cadena de routers) ─────────────
Write-Host "[2/5] Siguiendo la cadena de routers hacia el modem (traceroute)..." -ForegroundColor Yellow

function Test-PrivateIP([string]$ip) {
    if ($ip -match '^10\.')  { return $true }
    if ($ip -match '^192\.168\.') { return $true }
    if ($ip -match '^172\.(1[6-9]|2[0-9]|3[01])\.') { return $true }
    # CGNAT de Starlink: 100.64.0.0/10
    if ($ip -match '^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.') { return $true }
    return $false
}

function Test-StarlinkIP([string]$ip) {
    if ($ip -match '^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.') { return $true }
    if ($ip -eq '192.168.100.1') { return $true }  # IP clasica de la antena Starlink
    return $false
}

$hops = @()
$tracert = tracert -d -h 8 -w 800 8.8.8.8 2>$null
foreach ($line in $tracert) {
    if ($line -match '^\s*\d+\s+.*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*$') {
        $hopIP = $Matches[1]
        if (Test-PrivateIP $hopIP) { $hops += $hopIP }
    }
}
$hops = $hops | Select-Object -Unique
Write-Host "      Routers encontrados en la cadena: $($hops -join ' -> ')" -ForegroundColor Gray

# ── 3. Ping sweep de la subred local ─────────────────────────────────────────
Write-Host "[3/5] Escaneando la subred local ($prefix.0/24) - esto tarda ~30s..." -ForegroundColor Yellow

$pingTasks = @{}
foreach ($i in 1..254) {
    $ip = "$prefix.$i"
    $ping = New-Object System.Net.NetworkInformation.Ping
    $pingTasks[$ip] = $ping.SendPingAsync($ip, 900)
}
[System.Threading.Tasks.Task]::WaitAll($pingTasks.Values)

$aliveIPs = @()
foreach ($entry in $pingTasks.GetEnumerator()) {
    if ($entry.Value.Result.Status -eq 'Success') { $aliveIPs += $entry.Key }
}
Write-Host "      Dispositivos que responden: $($aliveIPs.Count)" -ForegroundColor Gray

# ── 4. Tabla ARP (MAC de cada dispositivo) ───────────────────────────────────
Write-Host "[4/5] Leyendo tabla ARP e identificando fabricantes..." -ForegroundColor Yellow

$arpTable = @{}
$arpOutput = arp -a
foreach ($line in $arpOutput) {
    if ($line -match '(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F-]{17})') {
        $arpTable[$Matches[1]] = $Matches[2].Replace('-',':').ToUpper()
    }
}

# Tabla OUI reducida de fabricantes comunes (deteccion aproximada)
$ouiVendors = @{
    '24:A4:3C'='Ubiquiti'; 'F0:9F:C2'='Ubiquiti'; '78:8A:20'='Ubiquiti'; '68:D7:9A'='Ubiquiti';
    'B4:FB:E4'='Ubiquiti'; '74:83:C2'='Ubiquiti'; 'DC:9F:DB'='Ubiquiti'; '04:18:D6'='Ubiquiti';
    '4C:5E:0C'='MikroTik'; 'D4:CA:6D'='MikroTik'; '6C:3B:6B'='MikroTik'; 'E4:8D:8C'='MikroTik';
    'CC:2D:E0'='MikroTik'; '48:8F:5A'='MikroTik'; 'B8:69:F4'='MikroTik'; '08:55:31'='MikroTik';
    '50:C7:BF'='TP-Link'; 'D8:07:B6'='TP-Link'; 'F4:F2:6D'='TP-Link'; 'C4:6E:1F'='TP-Link';
    '14:CC:20'='TP-Link'; '98:DA:C4'='TP-Link'; 'B0:4E:26'='TP-Link'; '60:32:B1'='TP-Link';
    '00:0C:43'='Cambium'; '58:C1:7A'='Cambium';
    'A4:2B:B0'='Tenda'; 'C8:3A:35'='Tenda';
    'B0:BE:76'='D-Link'; '1C:7E:E5'='D-Link';
    'A0:40:A0'='Netgear'; '9C:3D:CF'='Netgear'
}
# Marcas tipicas de antenas/PtP rurales
$antennaVendors = @('Ubiquiti', 'MikroTik', 'Cambium')

function Get-Vendor([string]$mac) {
    if (-not $mac) { return '' }
    $oui = $mac.Substring(0, 8)
    if ($ouiVendors.ContainsKey($oui)) { return $ouiVendors[$oui] }
    return ''
}

# ── 5. Construir topología y guardar JSON ────────────────────────────────────
Write-Host "[5/5] Armando topologia y generando JSON..." -ForegroundColor Yellow

$nodes = New-Object System.Collections.ArrayList
$edges = New-Object System.Collections.ArrayList
$hostName = $env:COMPUTERNAME
$scanDate = Get-Date -Format 'yyyy-MM-dd HH:mm'
$site = "Escaneo $hostName"

# Cadena de routers (traceroute): el ultimo salto privado es el mas cercano al modem
# hops[0] = gateway local, hops[n-1] = router Starlink/modem
$chainIds = @()
$y = 40
for ($i = $hops.Count - 1; $i -ge 0; $i--) {
    $hopIP = $hops[$i]
    $isStarlink = Test-StarlinkIP $hopIP
    $isLocalGw  = ($hopIP -eq $gateway)
    $nodeType = if ($isStarlink) { 'isp' } elseif ($isLocalGw) { 'router' } else { 'router' }
    $label = if ($isStarlink) { 'Starlink (modem)' }
             elseif ($isLocalGw) { "Router local ($hostName)" }
             else { "Router intermedio" }
    $mac = $arpTable[$hopIP]
    $vendor = Get-Vendor $mac
    if ($vendor -and -not $isStarlink) { $label = "Router $vendor" }

    $nodeId = "scan-$hopIP"
    $chainIds += $nodeId
    [void]$nodes.Add(@{
        id = $nodeId
        type = $nodeType
        position = @{ x = 400; y = $y }
        zIndex = 1
        data = @{
            label = $label
            nodeType = $nodeType
            site = $site
            ip = $hopIP
            brand = $vendor
            notes = "Detectado por traceroute. MAC: $(if ($mac) { $mac } else { 'desconocida' }). Escaneado: $scanDate"
        }
    })
    $y += 130
}

# Conectar la cadena en orden (modem -> ... -> gateway local)
for ($i = 0; $i -lt $chainIds.Count - 1; $i++) {
    [void]$edges.Add(@{
        id = "scan-e-chain-$i"
        source = $chainIds[$i]
        target = $chainIds[$i + 1]
        type = 'cable'
        data = @{ kind = 'cable' }
    })
}

$gatewayNodeId = "scan-$gateway"
if ($chainIds -notcontains $gatewayNodeId) {
    # El gateway no aparecio en el traceroute: agregarlo igual
    [void]$nodes.Add(@{
        id = $gatewayNodeId
        type = 'router'
        position = @{ x = 400; y = $y }
        zIndex = 1
        data = @{
            label = "Router local"
            nodeType = 'router'
            site = $site
            ip = $gateway
            brand = Get-Vendor $arpTable[$gateway]
            notes = "Gateway local. MAC: $(if ($arpTable[$gateway]) { $arpTable[$gateway] } else { 'desconocida' }). Escaneado: $scanDate"
        }
    })
    if ($chainIds.Count -gt 0) {
        [void]$edges.Add(@{
            id = 'scan-e-chain-gw'
            source = $chainIds[$chainIds.Count - 1]
            target = $gatewayNodeId
            type = 'cable'
            data = @{ kind = 'cable' }
        })
    }
    $y += 130
}

# Dispositivos de la LAN (excluir gateway y la propia PC del listado de clientes... la PC se incluye marcada)
$deviceY = $y + 60
$col = 0
foreach ($ip in ($aliveIPs | Sort-Object { [int]($_ -split '\.')[3] })) {
    if ($ip -eq $gateway) { continue }
    if ($hops -contains $ip) { continue }

    $mac = $arpTable[$ip]
    $vendor = Get-Vendor $mac
    $lastOctet = [int]($ip -split '\.')[3]

    # Heuristica de tipo
    $nodeType = 'client'
    if ($antennaVendors -contains $vendor) { $nodeType = 'antenna' }
    elseif ($vendor -and ($lastOctet -eq 1 -or $lastOctet -eq 254)) { $nodeType = 'router' }

    # Nombre: reverse DNS best-effort
    $dnsName = ''
    try { $dnsName = ([System.Net.Dns]::GetHostEntry($ip)).HostName } catch {}
    $isThisPC = ($ip -eq $localIP)
    $label = if ($isThisPC) { "Esta PC ($hostName)" }
             elseif ($dnsName) { ($dnsName -split '\.')[0] }
             elseif ($vendor) { "$vendor ($ip)" }
             else { "Dispositivo $ip" }

    [void]$nodes.Add(@{
        id = "scan-$ip"
        type = $nodeType
        position = @{ x = 80 + ($col % 5) * 170; y = $deviceY + [math]::Floor($col / 5) * 120 }
        zIndex = 1
        data = @{
            label = $label
            nodeType = $nodeType
            site = $site
            ip = $ip
            brand = $vendor
            notes = "MAC: $(if ($mac) { $mac } else { 'desconocida' }). Escaneado: $scanDate"
        }
    })
    [void]$edges.Add(@{
        id = "scan-e-$ip"
        source = $gatewayNodeId
        target = "scan-$ip"
        type = 'cable'
        data = @{ kind = 'cable' }
    })
    $col++
}

$snapshot = @{
    version = '1'
    nodes = $nodes
    edges = $edges
}

$outPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'topologia-escaneada.json'
$snapshot | ConvertTo-Json -Depth 8 | Out-File -FilePath $outPath -Encoding UTF8

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  LISTO! Se detectaron $($nodes.Count) dispositivos." -ForegroundColor Green
Write-Host "  Archivo generado:"                              -ForegroundColor Green
Write-Host "  $outPath"                                       -ForegroundColor White
Write-Host ""
Write-Host "  Ahora abri la app y usa el boton 'Importar'"    -ForegroundColor Green
Write-Host "  para cargar este archivo."                      -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "NOTA: el escaner ve los dispositivos de ESTA red local"
Write-Host "y la cadena de routers hacia internet. Para mapear otra"
Write-Host "casa, ejecuta este mismo script en una PC de esa casa e"
Write-Host "importa ambos archivos (la app los combina sin duplicar)."
Write-Host ""
Read-Host "Presiona Enter para salir"
