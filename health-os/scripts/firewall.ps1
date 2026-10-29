# Öffnet Port 8787 NUR für das private Netzwerk (Handy im WLAN). Als Administrator ausführen:
#   powershell -ExecutionPolicy Bypass -File scripts\firewall.ps1
param([int]$Port = 8787)
$name = 'NealHealthOS'
Remove-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private | Out-Null
Write-Host "Eingehende Verbindungen auf Port $Port für private Netzwerke erlaubt. Nicht im Router ins Internet freigeben."
