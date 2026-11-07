param([switch]$Reset, [switch]$MainDatabase, [string]$CustomerId = 'USER_001')
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
Set-Location -LiteralPath $root
$sourceName = 'HorseTransportDB'
$fixtureName = 'HorseTransportDB_Flow1Fixtures'
$local = Join-Path $root '.local\flow1-fixtures'
[void](New-Item -ItemType Directory -Path $local -Force)
[void](New-Item -ItemType Directory -Path (Join-Path $root 'data\Flow1Fixtures') -Force)
$statePath = Join-Path $local 'state.json'
$runtime = docker inspect racehorse-transport-system-backend-1 | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Start the local backend first.' }
$connectionRow = $runtime.Config.Env | Where-Object { $_ -like 'ConnectionStrings__DefaultConnection=*' }
$source = [System.Data.SqlClient.SqlConnectionStringBuilder]::new(($connectionRow -split '=',2)[1])
if ($source['Initial Catalog'] -ne $sourceName -or $source['Data Source'] -notmatch '^(host\.docker\.internal|localhost|127\.0\.0\.1)([,\\]|$)') {
    throw 'Only the named local HorseTransportDB is supported.'
}
$hostConnection = [System.Data.SqlClient.SqlConnectionStringBuilder]::new($source.ConnectionString)
$hostConnection['Data Source'] = $hostConnection['Data Source'] -replace 'host\.docker\.internal','localhost'
$hostConnection['Initial Catalog'] = 'master'
function Sql([string]$text, [hashtable]$parameters = @{}) {
    $connection = [System.Data.SqlClient.SqlConnection]::new($hostConnection.ConnectionString)
    try {
        $command = $connection.CreateCommand()
        $command.CommandText = $text
        $command.CommandTimeout = 180
        foreach ($key in $parameters.Keys) { [void]$command.Parameters.AddWithValue($key, $parameters[$key]) }
        $adapter = [System.Data.SqlClient.SqlDataAdapter]::new($command)
        $table = [System.Data.DataTable]::new()
        [void]$adapter.Fill($table)
        return ,$table
    } finally { $connection.Dispose() }
}
if ($MainDatabase) {
    if ($Reset) { throw '-Reset is only supported for the separate disposable fixture database.' }
    if ($CustomerId -notmatch '^USER_[0-9]{3,}$') { throw 'Invalid customer ID.' }
    $paths = (Sql "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000)) AS BackupPath, CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(4000)) AS DataPath").Rows[0]
    $backupPath = if ($paths.BackupPath -is [DBNull]) { [string]$paths.DataPath } else { [string]$paths.BackupPath }
    $backup = $backupPath.TrimEnd('\') + '\Flow1Fixtures_main_before_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.bak'
    [void](Sql 'BACKUP DATABASE [HorseTransportDB] TO DISK=@file WITH COPY_ONLY, INIT, CHECKSUM' @{ '@file'=$backup })
    dotnet publish backend/tools/Flow1Fixtures/Flow1Fixtures.csproj -c Release -o "$local\tool" --verbosity quiet
    if ($LASTEXITCODE -ne 0) { throw 'Fixture tool build failed.' }
    docker cp "$local\tool\." 'racehorse-transport-system-backend-1:/app/flow1-fixture-tool'
    if ($LASTEXITCODE -ne 0) { throw 'Fixture tool copy failed.' }
    docker exec -e "FLOW1_FIXTURE_CONNECTION=$($source.ConnectionString)" -e 'FLOW1_FIXTURE_ALLOW_MAIN=true' -e "FLOW1_FIXTURE_CUSTOMER=$CustomerId" -e 'FIXTURE_MANIFEST_PATH=/app/App_Data/flow1-main-fixtures.json' racehorse-transport-system-backend-1 dotnet /app/flow1-fixture-tool/Flow1Fixtures.dll
    if ($LASTEXITCODE -ne 0) { throw 'Seeding failed. Inspect the partial fixture state before retrying; never restore the entire main database automatically.' }
    docker cp 'racehorse-transport-system-backend-1:/app/App_Data/flow1-main-fixtures.json' (Join-Path $root 'data\Flow1Fixtures\main-manifest.json')
    if ($LASTEXITCODE -ne 0) { throw 'Manifest copy failed.' }
    Write-Output "Main database fixtures are ready for $CustomerId at http://localhost:5173. Backup: $backup"
    return
}
$exists = (Sql 'SELECT DB_ID(@name) AS Id' @{ '@name'=$fixtureName }).Rows[0].Id
if ($exists -isnot [DBNull] -and !$Reset) { throw 'Fixture database exists. Use -Reset to rebuild only that test database.' }
if ($Reset -and $exists -isnot [DBNull]) {
    foreach ($service in @('fixture-mail','fixture-frontend','fixture-backend')) {
        $ids = @(docker ps -q --filter 'label=com.docker.compose.project=racehorse-transport-system' --filter "label=com.docker.compose.service=$service")
        if ($ids.Count -gt 0) { docker stop $ids | Out-Null }
    }
}
if ($Reset -and (Test-Path -LiteralPath $statePath)) {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ($state.Database -ne $fixtureName) { throw 'Unexpected fixture metadata.' }
    $backup = $state.SourceBackup
    $dataPath = $state.DataPath
} else {
    $paths = (Sql "SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(4000)) AS DataPath, CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000)) AS BackupPath").Rows[0]
    $dataPath = [string]$paths.DataPath
    $backupPath = if ($paths.BackupPath -is [DBNull]) { $dataPath } else { [string]$paths.BackupPath }
    $backup = $backupPath.TrimEnd('\') + '\Flow1Fixtures_source_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.bak'
    [void](Sql 'BACKUP DATABASE [HorseTransportDB] TO DISK=@file WITH COPY_ONLY, INIT, CHECKSUM' @{ '@file'=$backup })
    @{ Database=$fixtureName; SourceBackup=$backup; DataPath=$dataPath } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
}
if (!$dataPath -or $backup -notmatch 'Flow1Fixtures_source_\d{8}_\d{6}\.bak$') { throw 'Unexpected backup path.' }
# The only replace/rollback target is the explicitly disposable fixture database.
$files = Sql 'RESTORE FILELISTONLY FROM DISK=@file' @{ '@file'=$backup }
$moves = foreach ($file in $files.Rows) {
    $extension = if ($file.Type -eq 'L') { '.ldf' } else { '.mdf' }
    $target = $dataPath.TrimEnd('\') + '\' + $fixtureName + '_' + $file.FileId + $extension
    "MOVE N'" + ([string]$file.LogicalName).Replace("'","''") + "' TO N'" + $target.Replace("'","''") + "'"
}
if ($exists -isnot [DBNull]) {
    [void](Sql 'ALTER DATABASE [HorseTransportDB_Flow1Fixtures] SET SINGLE_USER WITH ROLLBACK IMMEDIATE')
}
try {
    [void](Sql ('RESTORE DATABASE [HorseTransportDB_Flow1Fixtures] FROM DISK=@file WITH REPLACE, RECOVERY, CHECKSUM, ' + ($moves -join ', ')) @{ '@file'=$backup })
} finally {
    [void](Sql 'IF DB_ID(''HorseTransportDB_Flow1Fixtures'') IS NOT NULL ALTER DATABASE [HorseTransportDB_Flow1Fixtures] SET MULTI_USER')
}
dotnet publish backend/tools/Flow1Fixtures/Flow1Fixtures.csproj -c Release -o "$local\tool" --verbosity quiet
if ($LASTEXITCODE -ne 0) { throw 'Fixture tool build failed.' }
$sourceVolume = ($runtime.Mounts | Where-Object { $_.Destination -eq '/app/App_Data' }).Name
$frontend = docker inspect racehorse-transport-system-frontend-1 | ConvertFrom-Json
$moduleVolume = ($frontend.Mounts | Where-Object { $_.Destination -eq '/app/node_modules' }).Name
if (!$sourceVolume -or !$moduleVolume) { throw 'Expected local Docker volumes are missing.' }
docker volume create racehorse-flow1-fixtures-data | Out-Null
docker run --rm --network none --mount "type=volume,src=$sourceVolume,dst=/source,readonly" --mount 'type=volume,src=racehorse-flow1-fixtures-data,dst=/target' alpine:3.20 cp -a /source/. /target/
if ($LASTEXITCODE -ne 0) { throw 'Fixture file copy failed.' }
$source['Initial Catalog'] = $fixtureName
$priorConnection = $env:FLOW1_FIXTURE_CONNECTION
$priorModules = $env:FIXTURE_NODE_MODULES_VOLUME
try {
    $env:FLOW1_FIXTURE_CONNECTION = $source.ConnectionString
    $env:FIXTURE_NODE_MODULES_VOLUME = $moduleVolume
    docker compose -f compose.flow1-fixtures.yaml up -d --force-recreate fixture-backend fixture-mail fixture-frontend
    if ($LASTEXITCODE -ne 0) { throw 'Fixture services failed to start.' }
    $container = docker compose -f compose.flow1-fixtures.yaml ps -q fixture-backend
    docker cp "$local\tool\." "${container}:/app/flow1-fixture-tool"
    if ($LASTEXITCODE -ne 0) { throw 'Fixture tool copy failed.' }
    docker exec -e "FLOW1_FIXTURE_CONNECTION=$env:FLOW1_FIXTURE_CONNECTION" $container dotnet /app/flow1-fixture-tool/Flow1Fixtures.dll
    if ($LASTEXITCODE -ne 0) { throw 'Seeding failed. Run this script with -Reset after correcting the error.' }
    Write-Output 'Fixtures are ready at http://localhost:5174. Manifest: data/Flow1Fixtures/manifest.json'
} finally {
    $env:FLOW1_FIXTURE_CONNECTION = $priorConnection
    $env:FIXTURE_NODE_MODULES_VOLUME = $priorModules
}
