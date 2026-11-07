[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$PythonPath,
    [string]$LibreOfficePath = (Join-Path $PSScriptRoot '../WebApi/App_Data/flow1/runtime/libreoffice-26.8.1/extracted/program/soffice.com'),
    [string]$TemplatePath = (Join-Path $PSScriptRoot '../WebApi/Resources/Contracts/v1/contract-template.docx'),
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '../WebApi/App_Data/flow1/pdf-spike-libreoffice')
)
$ErrorActionPreference = 'Stop'
$python = (Resolve-Path -LiteralPath $PythonPath).Path
$engine = (Resolve-Path -LiteralPath $LibreOfficePath).Path
$source = (Resolve-Path -LiteralPath $TemplatePath).Path
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
$fixture = Join-Path $PSScriptRoot 'fixtures/contract-pdf-spike.json'
& $python -X utf8 (Join-Path $PSScriptRoot 'contract_pdf_spike.py') --template $source --fixture $fixture --soffice $engine --output $outputRoot
if ($LASTEXITCODE -ne 0) { throw 'Contract PDF spike failed. Inspect its private output/logs.' }
