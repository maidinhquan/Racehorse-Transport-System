[CmdletBinding()]
param(
 [ValidateSet('Start','Stop','Status')][string]$Action='Start',
 [string]$SqlServer='.\SQLEXPRESS',
 [string]$LibreOfficePath='D:\Racehorse-Transport-System\backend\WebApi\App_Data\flow1\runtime\libreoffice-26.8.1\extracted\program\soffice.com',
 [string]$NodePath=(Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'),
 [string]$PlaywrightModule=(Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtime=Join-Path $repo 'backend/WebApi/App_Data/flow1'
$active=Join-Path $runtime 'active-local-demo.json'
function Running($state){if(!$state){return $false};$item=Get-CimInstance Win32_Process -Filter "ProcessId=$([int]$state.hostPid)" -ErrorAction SilentlyContinue;return $null -ne $item -and $item.CommandLine -like '*Flow1RelationalHarness.dll*'}
function CheckOutput($state){$resolved=[IO.Path]::GetFullPath($state.output);$parent=[IO.Path]::TrimEndingDirectorySeparator([IO.Path]::GetDirectoryName($resolved));if($parent -ne [IO.Path]::TrimEndingDirectorySeparator($runtime) -or [IO.Path]::GetFileName($resolved) -notmatch '^local-demo-[a-f0-9]{32}$' -or $state.database -notmatch '^RaceHorseFlow1Browser_[a-f0-9]{32}$'){throw 'Unexpected local demo state; do not stop or delete anything'};return $resolved}
$state=if(Test-Path -LiteralPath $active){Get-Content -LiteralPath $active -Raw | ConvertFrom-Json}else{$null}
if($Action -eq 'Status'){if(Running $state){[void](CheckOutput $state);[pscustomobject]@{Running=$true;Url=$state.url;Database=$state.database;Browser='Use the Chrome window opened by this tool; simulator routes are browser-local'}}else{[pscustomobject]@{Running=$false}};return}
if($Action -eq 'Stop'){
 if(!(Running $state)){Write-Output 'No active local demo process.';return}
 $out=CheckOutput $state;[IO.File]::WriteAllText((Join-Path $out 'stop.request'),'stop')
 for($i=0;$i -lt 60;$i++){if(!(Running $state)){Write-Output 'Stopped local demo. The harness removed only its own test database; business DB was not used.';return};Start-Sleep -Milliseconds 500}
 throw 'Graceful shutdown is still pending; inspect the local demo log. No process was force-killed.'
}
if(Running $state){[void](CheckOutput $state);Write-Output ('Existing local demo: '+$state.url+' — use its Chrome window.');return}
foreach($item in @($LibreOfficePath,$NodePath,$PlaywrightModule)){if(!(Test-Path -LiteralPath $item)){throw 'A required local runtime path is missing; supply LibreOfficePath/NodePath/PlaywrightModule explicitly'}}
if($SqlServer.Split('\')[0] -notin @('.','localhost',$env:COMPUTERNAME,'(localdb)')){throw 'Only a local SQL test instance is supported'}
foreach($port in @(5173,5129)){$socket=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$port);try{$socket.Start()}catch{throw "Port $port is occupied. No existing process will be stopped."}finally{$socket.Stop()}}
Push-Location $repo
try{
 & dotnet build backend/tools/Flow1RelationalHarness --nologo
 if($LASTEXITCODE -ne 0){throw 'Build failed; no demo was launched'}
 New-Item -ItemType Directory -Path $runtime -Force | Out-Null
 $env:RACEHORSE_TEST_SQL_SERVER=$SqlServer;$env:RACEHORSE_TEST_LIBREOFFICE=$LibreOfficePath;$env:FLOW1_LOCAL_DEMO_AUTOCHECK='0';$env:FLOW1_BROWSER_MAP_PROVIDER='OSM'
 $dll=Join-Path $repo 'backend/tools/Flow1RelationalHarness/bin/Debug/net8.0/Flow1RelationalHarness.dll'
 $id=[guid]::NewGuid().ToString('N');$log=Join-Path $runtime ('demo-launch-'+$id+'.log');$errorLog=Join-Path $runtime ('demo-launch-'+$id+'.err.log')
 $arguments=@(('"'+$dll+'"'),('"'+[IO.Path]::GetFullPath($NodePath)+'"'),('"'+[IO.Path]::GetFullPath($PlaywrightModule)+'"'),'--serve')
 $process=Start-Process -FilePath (Get-Command dotnet).Source -ArgumentList $arguments -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $errorLog -PassThru
 for($i=0;$i -lt 80;$i++){
  $process.Refresh();if($process.HasExited){throw "Demo startup failed. Inspect $errorLog"}
  foreach($dir in (Get-ChildItem -LiteralPath $runtime -Directory -Filter 'local-demo-*')){
   $hostFile=Join-Path $dir.FullName 'host.json';$ready=Join-Path $dir.FullName 'demo-running.json'
   if((Test-Path -LiteralPath $hostFile) -and (Test-Path -LiteralPath $ready)){$hostData=Get-Content -LiteralPath $hostFile -Raw | ConvertFrom-Json;if($hostData.hostPid -eq $process.Id){$info=Get-Content -LiteralPath $ready -Raw | ConvertFrom-Json;$record=@{hostPid=$hostData.hostPid;database=$hostData.database;output=$hostData.output;url=$info.url};[void](CheckOutput $record);[IO.File]::WriteAllText($active,($record|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false));Write-Output ('READY: '+$info.url);Write-Output 'Use the opened Chrome demo window. Closing all its windows or running -Action Stop stops the app and removes its test DB.';return}}
  }
  Start-Sleep -Milliseconds 500
 }
 throw 'Startup is still pending; inspect the demo-launch log before starting another instance.'
}finally{Pop-Location}
