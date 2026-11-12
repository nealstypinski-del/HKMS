# Legt eine Autostart-Verknüpfung an: NEAL HEALTH OS startet beim Windows-Login (minimiert).
#   powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1          (einrichten)
#   powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1 -Remove  (entfernen)
param([switch]$Remove)
$app = Resolve-Path (Join-Path $PSScriptRoot '..')
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'NealHealthOS.lnk'
if ($Remove) { Remove-Item $lnk -ErrorAction SilentlyContinue; Write-Host 'Autostart entfernt.'; exit }
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($lnk)
$s.TargetPath = Join-Path $app 'start.bat'
$s.WorkingDirectory = $app
$s.WindowStyle = 7   # minimiert
$s.Save()
Write-Host "Autostart eingerichtet: $lnk"
