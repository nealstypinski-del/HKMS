# Findet die bestehende Whoop-MCP-Konfiguration auf diesem Windows-PC und schreibt
# health-os\whoop-mcp.config.json. Aufruf (PowerShell, im Ordner health-os):
#   powershell -ExecutionPolicy Bypass -File scripts\find-whoop-mcp.ps1
$ErrorActionPreference = 'SilentlyContinue'
$out = Join-Path $PSScriptRoot '..\whoop-mcp.config.json'

$candidates = @(
  "$env:APPDATA\Claude\claude_desktop_config.json",
  "$env:USERPROFILE\.claude.json",
  "$env:USERPROFILE\.claude\settings.json",
  "$env:USERPROFILE\.cursor\mcp.json",
  "$env:USERPROFILE\.config\claude\claude_desktop_config.json"
)
# Projekt-lokale .mcp.json unterhalb des Benutzerordners (flach gehalten)
$candidates += (Get-ChildItem "$env:USERPROFILE" -Recurse -Depth 4 -Filter '.mcp.json' -ErrorAction SilentlyContinue | ForEach-Object FullName)

$found = $null
foreach ($f in $candidates) {
  if (-not (Test-Path $f)) { continue }
  $json = Get-Content $f -Raw | ConvertFrom-Json
  $servers = @($json.mcpServers, $json.projects.PSObject.Properties.Value.mcpServers) | Where-Object { $_ }
  foreach ($set in $servers) {
    foreach ($p in $set.PSObject.Properties) {
      if ($p.Name -match 'whoop' -or ($p.Value.args -join ' ') -match 'whoop') {
        $found = [pscustomobject]@{ File = $f; Name = $p.Name; Def = $p.Value }
        break
      }
    }
    if ($found) { break }
  }
  if ($found) { break }
}

if ($found) {
  Write-Host "Whoop-MCP gefunden: '$($found.Name)' in $($found.File)" -ForegroundColor Green
  $cfg = [ordered]@{ command = $found.Def.command; args = @($found.Def.args); env = $found.Def.env }
  $cfg | ConvertTo-Json -Depth 6 | Set-Content $out -Encoding UTF8
  Write-Host "Geschrieben: $out"
} else {
  Write-Host 'Kein Whoop-MCP-Eintrag in den bekannten Config-Dateien. Suche nach Ordnern/Dateien ...' -ForegroundColor Yellow
  Get-ChildItem "$env:USERPROFILE" -Recurse -Depth 5 -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'whoop' -and $_.FullName -notmatch 'node_modules' } |
    ForEach-Object { Write-Host "  Ordner: $($_.FullName)" }
  Write-Host 'Dann whoop-mcp.config.example.json nach whoop-mcp.config.json kopieren und command/args anpassen.'
}
