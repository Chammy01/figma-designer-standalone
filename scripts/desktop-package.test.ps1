[CmdletBinding()]
param([ValidateSet('Install','Upgrade','Uninstall','Portable','RejectLongPath')][string]$Phase='Install', [Parameter(Mandatory=$true)][string]$InstallRoot)
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$output=Join-Path $repo 'release-staging/desktop'
$target=[IO.Path]::GetFullPath($InstallRoot)
$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
if(-not $target.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase)){throw 'Acceptance install target must stay inside TEMP.'}
if($Phase -eq 'RejectLongPath'){
  if($target.Length -le 100 -or (Test-Path -LiteralPath $target)){throw 'Use a fresh path longer than 100 characters.'}
  $process=Start-Process -FilePath (Join-Path $output 'Figma-Designer-1.4.4-Windows-Setup.exe') -ArgumentList @('/S',('/D='+$target)) -WindowStyle Hidden -Wait -PassThru
  if($process.ExitCode -ne 2){throw 'Overlong path did not fail before installation.'}
  if((Test-Path -LiteralPath $target) -and @(Get-ChildItem -LiteralPath $target -Force).Count -ne 0){throw 'Overlong destination contains unexpected application files.'}
  Write-Host 'Overlong install path rejected before file changes.'
}elseif($Phase -in @('Install','Upgrade')){
  $installer=Join-Path $output 'Figma-Designer-1.4.4-Windows-Setup.exe'
  $process=Start-Process -FilePath $installer -ArgumentList @('/S',('/D='+$target)) -WindowStyle Hidden -Wait -PassThru
  if($process.ExitCode -ne 0){throw "Installer failed: $($process.ExitCode)"}
  if(-not(Test-Path -LiteralPath (Join-Path $target 'Figma Designer.exe'))){throw 'Installed executable missing.'}
  if(-not(Test-Path -LiteralPath (Join-Path $target 'resources/payload/workspace/vendor/figma-mcp/plugin/manifest.json'))){throw 'Importable plugin manifest missing.'}
  $shortcut=Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs/Figma Designer.lnk'
  if(-not(Test-Path -LiteralPath $shortcut)){throw 'Start Menu shortcut missing.'}
  & node (Join-Path $PSScriptRoot 'desktop-extraction-check.mjs') $target
  if($LASTEXITCODE -ne 0){throw 'Installed payload differs from approved candidate inventory.'}
  Write-Host "$Phase PASS: per-user executable, plugin manifest and Start Menu shortcut."
}elseif($Phase -eq 'Portable'){
  if(Test-Path -LiteralPath $target){throw 'Portable extraction target must be fresh.'}
  Expand-Archive -LiteralPath (Join-Path $output 'Figma-Designer-1.4.4-Windows-Portable.zip') -DestinationPath $target
  if(-not(Test-Path -LiteralPath (Join-Path $target 'Figma Designer.exe'))){throw 'Portable executable missing.'}
  & node (Join-Path $PSScriptRoot 'desktop-extraction-check.mjs') $target
  if($LASTEXITCODE -ne 0){throw 'Portable payload differs from approved candidate inventory.'}
  Write-Host 'Portable extraction PASS.'
}else{
  $uninstaller=Get-ChildItem -LiteralPath $target -File | Where-Object {$_.Name -like 'Uninstall*.exe'}
  if(@($uninstaller).Count -ne 1){throw 'Expected exactly one owned candidate uninstaller.'}
  $process=Start-Process -FilePath $uninstaller.FullName -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
  if($process.ExitCode -ne 0){throw 'Uninstall failed.'}
  for($i=0;$i -lt 40 -and (Test-Path -LiteralPath (Join-Path $target 'Figma Designer.exe'));$i++){Start-Sleep -Milliseconds 250}
  if(Test-Path -LiteralPath (Join-Path $target 'Figma Designer.exe')){throw 'Application executable remains.'}
  $shortcut=Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs/Figma Designer.lnk'
  if(Test-Path -LiteralPath $shortcut){throw 'Start Menu shortcut remains.'}
  Write-Host 'Uninstall PASS: application and shortcut removed.'
}
