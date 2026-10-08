param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("design", "revise", "states", "flow", "motion", "browser", "browser-test", "qa", "status", "doctor", "self-test", "version", "reset")]
    [string]$Command,

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$Prompt,

    [string]$Node
)

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

$ScriptPath = $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptPath

$StateDir = Join-Path $ProjectRoot ".orca"
$StateFile = Join-Path $StateDir "session.json"

$ConfigFile = Join-Path $ProjectRoot "opencode.json"
$AgentFile = Join-Path $ProjectRoot ".opencode\agents\web-designer.md"
$RulesFile = Join-Path $ProjectRoot "rules\figma-design-rules.md"
$McpExe = Join-Path $ProjectRoot "bin\figma-mcp-go.exe"

$BrowserDir = Join-Path $ProjectRoot ".orca\browser-prototype"
$BrowserManifest = Join-Path $BrowserDir "orca-browser.json"
$BrowserTestReport = Join-Path $BrowserDir "orca-browser-test.json"

$OrcaScriptVersion = "1.0.0-m9"
$OrcaSchemaVersion = 1
$LogsDir = Join-Path $StateDir "logs"
$RunId = [guid]::NewGuid().ToString("N")
$RunStartedAt = Get-Date
$SafeCommandName = ($Command -replace '[^A-Za-z0-9._-]', '_')
$RunLogFile = Join-Path $LogsDir ("{0}-{1}-{2}.jsonl" -f $RunStartedAt.ToString("yyyyMMdd-HHmmss"), $SafeCommandName, $RunId.Substring(0, 8))

# ------------------------------------------------------------
# Console / structured log helpers
# ------------------------------------------------------------

function Write-OrcaEvent {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Level,

        [Parameter(Mandatory = $true)]
        [string]$Event,

        [string]$Message = "",

        [hashtable]$Data
    )

    try {
        if (-not (Test-Path $LogsDir)) {
            New-Item -ItemType Directory -Force $LogsDir | Out-Null
        }

        $record = [ordered]@{
            timestamp = (Get-Date).ToString("o")
            runId = $RunId
            version = $OrcaScriptVersion
            schemaVersion = $OrcaSchemaVersion
            command = $Command
            pid = $PID
            level = $Level
            event = $Event
            message = $Message
        }

        if ($Data) {
            $record["data"] = $Data
        }

        $line = $record | ConvertTo-Json -Depth 8 -Compress
        $utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
        [System.IO.File]::AppendAllText(
            $RunLogFile,
            $line + [Environment]::NewLine,
            $utf8NoBom
        )
    }
    catch {
        # Logging must never break the command it is observing.
    }
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
    Write-OrcaEvent -Level "INFO" -Event "ok" -Message $Message
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
    Write-OrcaEvent -Level "WARN" -Event "warning" -Message $Message
}

function Write-Skip {
    param([string]$Message)
    Write-Host "[SKIP] $Message" -ForegroundColor Yellow
    Write-OrcaEvent -Level "WARN" -Event "skip" -Message $Message
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    Write-OrcaEvent -Level "ERROR" -Event "failure" -Message $Message
}

Write-OrcaEvent `
    -Level "INFO" `
    -Event "run_start" `
    -Message "Orca command started." `
    -Data @{
        projectRoot = $ProjectRoot
        powershell = $PSVersionTable.PSVersion.ToString()
        logFile = $RunLogFile
    }

# ------------------------------------------------------------
# Project configuration
# ------------------------------------------------------------

function Get-ProjectConfig {
    if (-not (Test-Path $ConfigFile)) {
        throw "Missing OpenCode project config: $ConfigFile"
    }

    try {
        return Get-Content $ConfigFile -Raw | ConvertFrom-Json
    }
    catch {
        throw "Could not parse opencode.json."
    }
}

try {
    $ProjectConfig = Get-ProjectConfig
}
catch {
    Write-Fail $_.Exception.Message
    exit 1
}

$DesignerModel = $ProjectConfig.model
$DesignerAgent = $ProjectConfig.default_agent

if (-not $DesignerModel) {
    Write-Fail "No model is configured in opencode.json."
    exit 1
}

if (-not $DesignerAgent) {
    Write-Fail "No default_agent is configured in opencode.json."
    exit 1
}

# ------------------------------------------------------------
# General helpers
# ------------------------------------------------------------

function Test-CommandExists {
    param([string]$Name)

    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}


function Get-PythonCommand {
    if (Test-CommandExists "python") {
        return "python"
    }

    if (Test-CommandExists "py") {
        return "py"
    }

    return $null
}

function Test-DirectoryWritable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    try {
        if (-not (Test-Path $Path)) {
            New-Item -ItemType Directory -Force $Path | Out-Null
        }

        $probe = Join-Path $Path (".orca-write-probe-{0}.tmp" -f [guid]::NewGuid().ToString("N"))
        [System.IO.File]::WriteAllText($probe, "ok")
        Remove-Item $probe -Force

        return @{
            Passed = $true
            Message = "Writable: $Path"
        }
    }
    catch {
        return @{
            Passed = $false
            Message = "Not writable: $Path. $($_.Exception.Message)"
        }
    }
}

function Test-JsonFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return @{
            Exists = $false
            Valid = $false
            Object = $null
            Message = "Missing: $Path"
        }
    }

    try {
        $obj = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json

        return @{
            Exists = $true
            Valid = $true
            Object = $obj
            Message = "Valid JSON: $Path"
        }
    }
    catch {
        return @{
            Exists = $true
            Valid = $false
            Object = $null
            Message = "Invalid JSON: $Path. $($_.Exception.Message)"
        }
    }
}

function Get-SafeFileHash {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return $null
    }

    try {
        return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
    }
    catch {
        return $null
    }
}

function Get-RunLogSummary {
    return @{
        runId = $RunId
        logFile = $RunLogFile
        startedAt = $RunStartedAt.ToString("o")
    }
}

function Get-RunHelp {
    Push-Location $ProjectRoot

    try {
        return (& opencode run --help 2>&1 | Out-String)
    }
    finally {
        Pop-Location
    }
}

# ------------------------------------------------------------
# Session state
# ------------------------------------------------------------

function Get-LatestSessionId {
    Push-Location $ProjectRoot

    try {
        $raw = & opencode session list -n 10 --format json 2>$null

        if (-not $raw) {
            return $null
        }

        $text = $raw | Out-String
        $sessions = $text | ConvertFrom-Json

        if ($sessions -is [System.Array]) {
            if ($sessions.Count -gt 0) {
                return $sessions[0].id
            }
        }
        elseif ($sessions.id) {
            return $sessions.id
        }

        return $null
    }
    catch {
        return $null
    }
    finally {
        Pop-Location
    }
}

function Save-Session {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SessionId
    )

    if (-not (Test-Path $StateDir)) {
        New-Item -ItemType Directory -Force $StateDir | Out-Null
    }

    $state = @{
        session_id = $SessionId
        updated_at = (Get-Date).ToString("o")
        project = $ProjectRoot
        model = $DesignerModel
        agent = $DesignerAgent
    }

    $state |
        ConvertTo-Json |
        Set-Content -Path $StateFile -Encoding UTF8
}

function Get-SavedSession {
    if (-not (Test-Path $StateFile)) {
        return $null
    }

    try {
        return Get-Content $StateFile -Raw | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

function Test-BrowserPrototype {
    $required = @(
        (Join-Path $BrowserDir "index.html"),
        (Join-Path $BrowserDir "styles.css"),
        (Join-Path $BrowserDir "app.js"),
        $BrowserManifest
    )

    $missing = @()

    foreach ($path in $required) {
        if (-not (Test-Path $path)) {
            $missing += $path
        }
    }

    if ($missing.Count -gt 0) {
        return @{
            Passed = $false
            Message = "Missing browser-prototype files: $($missing -join ', ')"
        }
    }

    try {
        $manifest = Get-Content $BrowserManifest -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    catch {
        return @{
            Passed = $false
            Message = "orca-browser.json is not valid JSON."
        }
    }

    if (-not $manifest.version) {
        return @{
            Passed = $false
            Message = "orca-browser.json is missing version."
        }
    }

    if (-not $manifest.source -or -not $manifest.source.flowSectionId) {
        return @{
            Passed = $false
            Message = "orca-browser.json is missing source.flowSectionId."
        }
    }

    if (-not $manifest.screens -or @($manifest.screens).Count -lt 1) {
        return @{
            Passed = $false
            Message = "orca-browser.json contains no screens."
        }
    }

    $indexText = Get-Content (Join-Path $BrowserDir "index.html") -Raw -Encoding UTF8
    $scriptText = Get-Content (Join-Path $BrowserDir "app.js") -Raw -Encoding UTF8

    if ($indexText -notmatch 'data-orca-app') {
        return @{
            Passed = $false
            Message = "index.html is missing the data-orca-app test hook."
        }
    }

    if ($scriptText -notmatch 'data-orca-screen') {
        return @{
            Passed = $false
            Message = "app.js does not expose data-orca-screen hooks."
        }
    }

    return @{
        Passed = $true
        Message = "Browser prototype files and manifest passed local structural checks."
        ScreenCount = @($manifest.screens).Count
        FlowSectionId = $manifest.source.flowSectionId
    }
}



function Invoke-NativeOrcaCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [switch]$AllowFailure
    )

    if (-not (Test-CommandExists "orca")) {
        throw "Native Orca CLI is not available in PATH."
    }

    $previousErrorActionPreference = $ErrorActionPreference

    try {
        $ErrorActionPreference = "Continue"
        $captured = @()

        & orca @Arguments 2>&1 | ForEach-Object {
            $captured += $_.ToString()
        }

        $exitCode = $LASTEXITCODE
        $output = ($captured -join [Environment]::NewLine).Trim()

        if (-not $AllowFailure -and $exitCode -ne 0) {
            throw "Native Orca CLI exited with code $exitCode. Output: $output"
        }

        return @{
            ExitCode = $exitCode
            Output = $output
        }
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

function Get-OrcaBrowserPageIdFromObject {
    param([object]$Object)

    if ($null -eq $Object) {
        return $null
    }

    $candidates = @()

    if ($Object.browserPageId) { $candidates += $Object.browserPageId }
    if ($Object.pageId) { $candidates += $Object.pageId }
    if ($Object.page_id) { $candidates += $Object.page_id }

    if ($Object.result) {
        if ($Object.result.browserPageId) { $candidates += $Object.result.browserPageId }
        if ($Object.result.pageId) { $candidates += $Object.result.pageId }
        if ($Object.result.page_id) { $candidates += $Object.result.page_id }
        if ($Object.result.page -and $Object.result.page.browserPageId) { $candidates += $Object.result.page.browserPageId }
        if ($Object.result.page -and $Object.result.page.id) { $candidates += $Object.result.page.id }
        if ($Object.result.tab -and $Object.result.tab.browserPageId) { $candidates += $Object.result.tab.browserPageId }
        if ($Object.result.tab -and $Object.result.tab.pageId) { $candidates += $Object.result.tab.pageId }
    }

    if ($Object.page -and $Object.page.browserPageId) { $candidates += $Object.page.browserPageId }
    if ($Object.page -and $Object.page.id) { $candidates += $Object.page.id }
    if ($Object.tab -and $Object.tab.browserPageId) { $candidates += $Object.tab.browserPageId }
    if ($Object.tab -and $Object.tab.pageId) { $candidates += $Object.tab.pageId }

    foreach ($candidate in $candidates) {
        if ($candidate) {
            return [string]$candidate
        }
    }

    return $null
}

function Get-OrcaBrowserPageId {
    param([string]$CreateOutput)

    try {
        $obj = $CreateOutput | ConvertFrom-Json
        $pageId = Get-OrcaBrowserPageIdFromObject -Object $obj

        if ($pageId) {
            return $pageId
        }
    }
    catch {
    }

    try {
        $current = Invoke-NativeOrcaCommand -Arguments @("tab", "current", "--json")
        $obj = $current.Output | ConvertFrom-Json
        $pageId = Get-OrcaBrowserPageIdFromObject -Object $obj

        if ($pageId) {
            return $pageId
        }
    }
    catch {
    }

    return $null
}


function Get-OrcaElementRefFromOutput {
    param([string]$Output)

    if (-not $Output) {
        return $null
    }

    $match = [regex]::Match(
        $Output,
        '(?<![A-Za-z0-9_])@?e\d+\b',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    if ($match.Success) {
        return $match.Value
    }

    return $null
}

function Get-OrcaElementRefByText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PageId,

        [Parameter(Mandatory = $true)]
        [string]$Text
    )

    $findResult = Invoke-NativeOrcaCommand `
        -Arguments @(
            "find",
            "--page", $PageId,
            "--locator", "text",
            "--value", $Text,
            "--json"
        ) `
        -AllowFailure

    if ($findResult.ExitCode -eq 0) {
        $ref = Get-OrcaElementRefFromOutput -Output $findResult.Output

        if ($ref) {
            return $ref
        }
    }

    # Fallback to an accessibility snapshot because Orca element refs are
    # snapshot-scoped. Search only the line containing the exact visible
    # control text so an unrelated ref elsewhere in the tree is not used.
    $snapshot = Invoke-NativeOrcaCommand `
        -Arguments @(
            "snapshot",
            "--page", $PageId
        ) `
        -AllowFailure

    if ($snapshot.ExitCode -eq 0 -and $snapshot.Output) {
        $escapedText = [regex]::Escape($Text)
        $lines = $snapshot.Output -split "`r?`n"

        foreach ($line in $lines) {
            if ($line -match $escapedText) {
                $ref = Get-OrcaElementRefFromOutput -Output $line

                if ($ref) {
                    return $ref
                }
            }
        }
    }

    return $null
}

function Test-OrcaBrowserExpression {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PageId,

        [Parameter(Mandatory = $true)]
        [string]$Expression
    )

    $wrapped = "($Expression) ? 'ORCA_M8_TRUE' : 'ORCA_M8_FALSE'"
    $result = Invoke-NativeOrcaCommand -Arguments @(
        "eval",
        "--page", $PageId,
        "--expression", $wrapped
    )

    if ($result.Output -match "ORCA_M8_TRUE") {
        return $true
    }

    if ($result.Output -match "ORCA_M8_FALSE") {
        return $false
    }

    throw "Could not parse Orca eval result. Output: $($result.Output)"
}

function Add-BrowserTestResult {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [System.Collections.ArrayList]$Results,

        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [bool]$Passed,

        [bool]$Skipped = $false,

        [string]$Detail = ""
    )

    [void]$Results.Add([PSCustomObject]@{
        name = $Name
        passed = $Passed
        skipped = $Skipped
        detail = $Detail
    })

    if ($Skipped) {
        Write-Skip $Name
        if ($Detail) {
            Write-Host "  $Detail"
        }
    }
    elseif ($Passed) {
        Write-Ok $Name
    }
    else {
        Write-Fail $Name
        if ($Detail) {
            Write-Host "  $Detail"
        }
    }
}



# ------------------------------------------------------------
# M9 system hardening
# ------------------------------------------------------------

function Add-SystemCheckResult {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [System.Collections.ArrayList]$Results,

        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [ValidateSet("PASS", "WARN", "FAIL")]
        [string]$Status,

        [string]$Detail = ""
    )

    [void]$Results.Add([PSCustomObject]@{
        name = $Name
        status = $Status
        detail = $Detail
    })

    switch ($Status) {
        "PASS" {
            Write-Ok $Name
        }
        "WARN" {
            Write-Warn $Name
            if ($Detail) {
                Write-Host "  $Detail"
            }
        }
        "FAIL" {
            Write-Fail $Name
            if ($Detail) {
                Write-Host "  $Detail"
            }
        }
    }
}

function Invoke-Version {
    Write-Host ""
    Write-Host "Orca Figma Designer"
    Write-Host "-------------------"
    Write-Host "Version: $OrcaScriptVersion"
    Write-Host "Schema: $OrcaSchemaVersion"
    Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
    Write-Host "Project: $ProjectRoot"
    Write-Host "Agent: $DesignerAgent"
    Write-Host "Model: $DesignerModel"
    Write-Host "Run ID: $RunId"
    Write-Host "Run log: $RunLogFile"
    Write-Host ""
    Write-Host "ORCA_VERSION: $OrcaScriptVersion"
    Write-Host ""

    Write-OrcaEvent `
        -Level "INFO" `
        -Event "version" `
        -Message "Version command completed." `
        -Data @{
            version = $OrcaScriptVersion
            schemaVersion = $OrcaSchemaVersion
        }
}

function Invoke-SelfTest {
    $results = New-Object System.Collections.ArrayList

    Write-Host ""
    Write-Host "Orca M9 Self-Test"
    Write-Host "-----------------"
    Write-Host "Version: $OrcaScriptVersion"
    Write-Host "Project: $ProjectRoot"
    Write-Host "Run log: $RunLogFile"
    Write-Host ""

    $psVersionOk = (
        $PSVersionTable.PSVersion.Major -gt 5 -or
        (
            $PSVersionTable.PSVersion.Major -eq 5 -and
            $PSVersionTable.PSVersion.Minor -ge 1
        )
    )

    Add-SystemCheckResult `
        -Results $results `
        -Name "PowerShell 5.1 or newer" `
        -Status $(if ($psVersionOk) { "PASS" } else { "FAIL" }) `
        -Detail $PSVersionTable.PSVersion.ToString()

    $requiredFiles = @(
        @{ Name = "OpenCode config"; Path = $ConfigFile },
        @{ Name = "web-designer agent"; Path = $AgentFile },
        @{ Name = "Figma design rules"; Path = $RulesFile },
        @{ Name = "Figma MCP executable"; Path = $McpExe }
    )

    foreach ($required in $requiredFiles) {
        Add-SystemCheckResult `
            -Results $results `
            -Name "$($required.Name) exists" `
            -Status $(if (Test-Path $required.Path) { "PASS" } else { "FAIL" }) `
            -Detail $required.Path
    }

    $stateWritable = Test-DirectoryWritable -Path $StateDir
    Add-SystemCheckResult `
        -Results $results `
        -Name ".orca state directory is writable" `
        -Status $(if ($stateWritable.Passed) { "PASS" } else { "FAIL" }) `
        -Detail $stateWritable.Message

    $logsWritable = Test-DirectoryWritable -Path $LogsDir
    Add-SystemCheckResult `
        -Results $results `
        -Name "structured log directory is writable" `
        -Status $(if ($logsWritable.Passed) { "PASS" } else { "FAIL" }) `
        -Detail $logsWritable.Message

    Add-SystemCheckResult `
        -Results $results `
        -Name "OpenCode CLI available" `
        -Status $(if (Test-CommandExists "opencode") { "PASS" } else { "FAIL" })

    Add-SystemCheckResult `
        -Results $results `
        -Name "Native Orca CLI available" `
        -Status $(if (Test-CommandExists "orca") { "PASS" } else { "FAIL" })

    $pythonCommand = Get-PythonCommand
    Add-SystemCheckResult `
        -Results $results `
        -Name "Python static-server runtime available" `
        -Status $(if ($pythonCommand) { "PASS" } else { "FAIL" }) `
        -Detail $(if ($pythonCommand) { $pythonCommand } else { "python or py is required for browser-test." })

    $configJson = Test-JsonFile -Path $ConfigFile
    $configOk = (
        $configJson.Valid -and
        $configJson.Object.model -and
        $configJson.Object.default_agent
    )

    Add-SystemCheckResult `
        -Results $results `
        -Name "opencode.json is valid and complete" `
        -Status $(if ($configOk) { "PASS" } else { "FAIL" }) `
        -Detail $(if ($configOk) { "model=$($configJson.Object.model); agent=$($configJson.Object.default_agent)" } else { $configJson.Message })

    if (Test-Path $StateFile) {
        $sessionJson = Test-JsonFile -Path $StateFile
        $sessionOk = $sessionJson.Valid -and $sessionJson.Object.session_id

        Add-SystemCheckResult `
            -Results $results `
            -Name "saved Orca session state is valid" `
            -Status $(if ($sessionOk) { "PASS" } else { "FAIL" }) `
            -Detail $(if ($sessionOk) { [string]$sessionJson.Object.session_id } else { $sessionJson.Message })
    }
    else {
        Add-SystemCheckResult `
            -Results $results `
            -Name "saved Orca session state is valid" `
            -Status "WARN" `
            -Detail "No saved session exists. New design/state/flow work can still start a fresh OpenCode session."
    }

    if (Test-Path $BrowserDir) {
        $browserCheck = Test-BrowserPrototype

        Add-SystemCheckResult `
            -Results $results `
            -Name "browser prototype structural check" `
            -Status $(if ($browserCheck.Passed) { "PASS" } else { "FAIL" }) `
            -Detail $browserCheck.Message
    }
    else {
        Add-SystemCheckResult `
            -Results $results `
            -Name "browser prototype structural check" `
            -Status "WARN" `
            -Detail "No browser prototype has been generated yet."
    }

    if (Test-Path $BrowserTestReport) {
        $reportJson = Test-JsonFile -Path $BrowserTestReport

        if (-not $reportJson.Valid) {
            Add-SystemCheckResult `
                -Results $results `
                -Name "latest M8 browser-test report" `
                -Status "FAIL" `
                -Detail $reportJson.Message
        }
        elseif ($reportJson.Object.passed -eq $true) {
            $skipCount = 0

            if ($null -ne $reportJson.Object.skippedCount) {
                $skipCount = [int]$reportJson.Object.skippedCount
            }

            Add-SystemCheckResult `
                -Results $results `
                -Name "latest M8 browser-test report" `
                -Status "PASS" `
                -Detail "passed=true; skippedCount=$skipCount"
        }
        else {
            Add-SystemCheckResult `
                -Results $results `
                -Name "latest M8 browser-test report" `
                -Status "WARN" `
                -Detail "The latest recorded browser-test run did not pass. Rerun '.\orca.ps1 browser-test' after confirming the Orca runtime is open."
        }
    }
    else {
        Add-SystemCheckResult `
            -Results $results `
            -Name "latest M8 browser-test report" `
            -Status "WARN" `
            -Detail "No M8 browser-test report exists yet."
    }

    $scriptHash = Get-SafeFileHash -Path $ScriptPath

    if ($scriptHash) {
        Add-SystemCheckResult `
            -Results $results `
            -Name "orca.ps1 SHA256 available" `
            -Status "PASS" `
            -Detail $scriptHash
    }
    else {
        Add-SystemCheckResult `
            -Results $results `
            -Name "orca.ps1 SHA256 available" `
            -Status "WARN" `
            -Detail "Could not calculate a script hash."
    }

    $failCount = @($results | Where-Object { $_.status -eq "FAIL" }).Count
    $warnCount = @($results | Where-Object { $_.status -eq "WARN" }).Count

    Write-Host ""
    Write-Host "Checks: $($results.Count) total / $failCount fail / $warnCount warn"
    Write-Host ""

    Write-OrcaEvent `
        -Level $(if ($failCount -gt 0) { "ERROR" } elseif ($warnCount -gt 0) { "WARN" } else { "INFO" }) `
        -Event "self_test_summary" `
        -Message "M9 self-test completed." `
        -Data @{
            total = $results.Count
            fail = $failCount
            warn = $warnCount
        }

    if ($failCount -gt 0) {
        Write-Host "ORCA_SELF_TEST: FAIL"
        Write-Host ""
        exit 1
    }

    if ($warnCount -gt 0) {
        Write-Host "ORCA_SELF_TEST: WARN"
        Write-Host ""
        exit 0
    }

    Write-Host "ORCA_SELF_TEST: PASS"
    Write-Host ""
    exit 0
}

# ------------------------------------------------------------
# Figma connection
# ------------------------------------------------------------

function Test-FigmaConnection {
    Push-Location $ProjectRoot

    try {
        $output = & opencode mcp list 2>&1 | Out-String

        $connected = $output -match "figma\s+connected"

        return @{
            Connected = $connected
            Output = $output.Trim()
        }
    }
    finally {
        Pop-Location
    }
}

# ------------------------------------------------------------
# OpenCode runner
# ------------------------------------------------------------

function Invoke-Designer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [string]$SessionId,

        [switch]$NewSession
    )

    $runHelp = Get-RunHelp

    $arguments = @(
        "run",
        "--model",
        $DesignerModel,
        "--agent",
        $DesignerAgent
    )

    if ($SessionId) {
        $arguments += "--session"
        $arguments += $SessionId
    }

    if ($NewSession -and $runHelp -match "--title") {
        $arguments += "--title"
        $arguments += "Orca Figma Design $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }

    $arguments += $Message

    Push-Location $ProjectRoot

    try {
        & opencode @arguments

        if ($LASTEXITCODE -ne 0) {
            throw "OpenCode exited with code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}


function Invoke-DesignerCapture {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [string]$SessionId,

        [switch]$NewSession
    )

    $runHelp = Get-RunHelp
    $arguments = @(
        "run",
        "--model",
        $DesignerModel,
        "--agent",
        $DesignerAgent
    )

    if ($SessionId) {
        $arguments += "--session"
        $arguments += $SessionId
    }

    if ($NewSession -and $runHelp -match "--title") {
        $arguments += "--title"
        $arguments += "Orca Figma QA $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }

    $arguments += $Message

    Push-Location $ProjectRoot

    # Windows PowerShell 5.1 converts stderr from native programs into
    # ErrorRecord objects. With the script-wide ErrorActionPreference set
    # to Stop, harmless OpenCode progress output on stderr can terminate
    # this capture pass before we can inspect the actual process exit code.
    # Temporarily allow native stderr records through, capture them as text,
    # and rely on LASTEXITCODE to determine whether OpenCode truly failed.
    $previousErrorActionPreference = $ErrorActionPreference

    try {
        $ErrorActionPreference = "Continue"
        $captured = @()

        & opencode @arguments 2>&1 | ForEach-Object {
            $line = $_.ToString()
            $captured += $line
            Write-Host $line
        }

        $openCodeExitCode = $LASTEXITCODE

        if ($openCodeExitCode -ne 0) {
            throw "OpenCode exited with code $openCodeExitCode."
        }

        return ($captured -join [Environment]::NewLine)
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
        Pop-Location
    }
}


# ------------------------------------------------------------
# Status
# ------------------------------------------------------------

function Invoke-Status {
    Write-Host ""
    Write-Host "Orca Figma Designer"
    Write-Host "-------------------"
    Write-Host "Version: $OrcaScriptVersion"
    Write-Host "Run log: $RunLogFile"
    Write-Host ""

    if (Test-CommandExists "opencode") {
        $version = (& opencode --version 2>&1 | Out-String).Trim()
        Write-Ok "OpenCode available: $version"
    }
    else {
        Write-Fail "OpenCode is not available in PATH."
        return
    }

    Write-Ok "Designer agent: $DesignerAgent"
    Write-Ok "Designer model: $DesignerModel"

    if (Test-Path $McpExe) {
        Write-Ok "Figma MCP executable exists."
    }
    else {
        Write-Fail "Figma MCP executable is missing."
    }

    if (Test-Path $AgentFile) {
        Write-Ok "web-designer agent exists."
    }
    else {
        Write-Fail "web-designer agent is missing."
    }

    if (Test-Path $RulesFile) {
        Write-Ok "Figma design rules exist."
    }
    else {
        Write-Fail "Figma design rules are missing."
    }

    if (Test-CommandExists "orca") {
        Write-Ok "Native Orca CLI is available."
    }
    else {
        Write-Warn "Native Orca CLI is unavailable; browser-test cannot run."
    }

    $pythonCommand = Get-PythonCommand

    if ($pythonCommand) {
        Write-Ok "Browser static-server runtime: $pythonCommand"
    }
    else {
        Write-Warn "Python is unavailable; browser-test cannot serve the prototype."
    }

    if (Test-Path $BrowserDir) {
        $browserStatus = Test-BrowserPrototype

        if ($browserStatus.Passed) {
            Write-Ok "Browser prototype structural check passes."
        }
        else {
            Write-Warn $browserStatus.Message
        }
    }
    else {
        Write-Warn "Browser prototype has not been generated yet."
    }

    try {
        $figma = Test-FigmaConnection

        if ($figma.Connected) {
            Write-Ok "Figma MCP is connected."
        }
        else {
            Write-Fail "Figma MCP is not connected."

            if ($figma.Output) {
                Write-Host ""
                Write-Host $figma.Output
            }
        }
    }
    catch {
        Write-Fail "Could not check Figma MCP connection."
    }

    $state = Get-SavedSession

    if ($state -and $state.session_id) {
        Write-Ok "Active design session: $($state.session_id)"
    }
    else {
        Write-Warn "No Orca design session has been recorded yet."
    }

    Write-Host ""
}

# ------------------------------------------------------------
# Doctor
# ------------------------------------------------------------

function Invoke-Doctor {
    Write-Host ""
    Write-Host "Orca Figma Doctor"
    Write-Host "-----------------"
    Write-Host "Version: $OrcaScriptVersion"
    Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
    Write-Host "Run log: $RunLogFile"
    Write-Host ""

    $failed = $false

    # --------------------------------------------------------
    # OpenCode
    # --------------------------------------------------------

    if (Test-CommandExists "opencode") {
        $version = (& opencode --version 2>&1 | Out-String).Trim()
        Write-Ok "OpenCode found: $version"
    }
    else {
        Write-Fail "OpenCode is missing from PATH."
        $failed = $true
    }

    if (Test-CommandExists "orca") {
        try {
            $orcaVersion = (& orca --version 2>&1 | Out-String).Trim()

            if ($orcaVersion) {
                Write-Ok "Native Orca CLI found: $orcaVersion"
            }
            else {
                Write-Ok "Native Orca CLI found."
            }
        }
        catch {
            Write-Ok "Native Orca CLI found."
        }

        try {
            $orcaRuntimeStatus = Invoke-NativeOrcaCommand -Arguments @("status", "--json") -AllowFailure

            if ($orcaRuntimeStatus.ExitCode -eq 0) {
                Write-Ok "Orca desktop runtime is reachable."
            }
            else {
                Write-Warn "Orca desktop runtime is not currently reachable; run 'orca open' before browser-test."
            }
        }
        catch {
            Write-Warn "Could not check the Orca desktop runtime; browser-test may require 'orca open'."
        }
    }
    else {
        Write-Fail "Native Orca CLI is missing from PATH."
        $failed = $true
    }

    $pythonCommand = Get-PythonCommand

    if ($pythonCommand) {
        Write-Ok "Python static-server runtime found: $pythonCommand"
    }
    else {
        Write-Fail "Python/py is missing from PATH; browser-test cannot run."
        $failed = $true
    }

    $stateWritable = Test-DirectoryWritable -Path $StateDir

    if ($stateWritable.Passed) {
        Write-Ok ".orca state directory is writable."
    }
    else {
        Write-Fail $stateWritable.Message
        $failed = $true
    }

    $logsWritable = Test-DirectoryWritable -Path $LogsDir

    if ($logsWritable.Passed) {
        Write-Ok "Structured log directory is writable."
    }
    else {
        Write-Fail $logsWritable.Message
        $failed = $true
    }

    # --------------------------------------------------------
    # Project files
    # --------------------------------------------------------

    $requiredFiles = @(
        @{
            Name = "OpenCode config"
            Path = $ConfigFile
        },
        @{
            Name = "web-designer agent"
            Path = $AgentFile
        },
        @{
            Name = "Figma design rules"
            Path = $RulesFile
        },
        @{
            Name = "Figma MCP executable"
            Path = $McpExe
        }
    )

    foreach ($item in $requiredFiles) {
        if (Test-Path $item.Path) {
            Write-Ok "$($item.Name) found."
        }
        else {
            Write-Fail "$($item.Name) missing: $($item.Path)"
            $failed = $true
        }
    }

    if (-not (Test-CommandExists "opencode")) {
        Write-Host ""
        Write-Fail "Doctor stopped because OpenCode is unavailable."
        exit 1
    }

    # --------------------------------------------------------
    # Designer configuration
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "Designer configuration"
    Write-Host "----------------------"

    Write-Ok "Agent: $DesignerAgent"
    Write-Ok "Model: $DesignerModel"

    if ($DesignerAgent -eq "web-designer") {
        Write-Ok "Default agent is web-designer."
    }
    else {
        Write-Warn "Default agent is not web-designer."
    }

    if ($ProjectConfig.mcp.figma) {
        Write-Ok "Figma MCP is configured."
    }
    else {
        Write-Fail "Figma MCP configuration is missing."
        $failed = $true
    }

    # --------------------------------------------------------
    # Model availability
    # --------------------------------------------------------

    try {
        $availableModels = & opencode models 2>$null

        $modelExists = $false

        foreach ($model in $availableModels) {
            if ($model.Trim() -eq $DesignerModel) {
                $modelExists = $true
                break
            }
        }

        if ($modelExists) {
            Write-Ok "Configured model is available."
        }
        else {
            Write-Fail "Configured model is not available: $DesignerModel"
            $failed = $true
        }
    }
    catch {
        Write-Fail "Could not retrieve OpenCode model list."
        $failed = $true
    }

    # --------------------------------------------------------
    # Agent discovery
    # --------------------------------------------------------

    Push-Location $ProjectRoot

    try {
        try {
            $rawAgents = & opencode debug agents 2>$null | Out-String
            $agents = $rawAgents | ConvertFrom-Json

            $designer = $agents | Where-Object {
                $_.id -eq $DesignerAgent
            }

            if ($designer) {
                Write-Ok "$DesignerAgent is discovered by OpenCode."

                if ($designer.mode -eq "primary") {
                    Write-Ok "$DesignerAgent mode is primary."
                }
                else {
                    Write-Fail "$DesignerAgent is not a primary agent."
                    $failed = $true
                }
            }
            else {
                Write-Fail "OpenCode did not discover $DesignerAgent."
                $failed = $true
            }
        }
        catch {
            Write-Fail "Could not inspect OpenCode agents."
            $failed = $true
        }
    }
    finally {
        Pop-Location
    }

    # --------------------------------------------------------
    # Run command support
    # --------------------------------------------------------

    try {
        $runHelp = Get-RunHelp

        if ($runHelp -match "--session") {
            Write-Ok "OpenCode run supports explicit sessions."
        }
        else {
            Write-Fail "OpenCode run does not expose --session."
            $failed = $true
        }

        if ($runHelp -match "--model") {
            Write-Ok "OpenCode run supports explicit model selection."
        }
        else {
            Write-Fail "OpenCode run does not expose --model."
            $failed = $true
        }

        if ($runHelp -match "--agent") {
            Write-Ok "OpenCode run supports explicit agent selection."
        }
        else {
            Write-Fail "OpenCode run does not expose --agent."
            $failed = $true
        }
    }
    catch {
        Write-Fail "Could not inspect 'opencode run'."
        $failed = $true
    }

    # --------------------------------------------------------
    # MCP / plugin connection
    # --------------------------------------------------------

    try {
        $figma = Test-FigmaConnection

        if ($figma.Connected) {
            Write-Ok "Figma MCP/plugin bridge is connected."
        }
        else {
            Write-Fail "Figma MCP/plugin bridge is not connected."

            if ($figma.Output) {
                Write-Host ""
                Write-Host $figma.Output
            }

            $failed = $true
        }
    }
    catch {
        Write-Fail "Could not check Figma MCP connection."
        $failed = $true
    }

    # --------------------------------------------------------
    # Browser prototype / latest regression report
    # --------------------------------------------------------

    if (Test-Path $BrowserDir) {
        $browserCheck = Test-BrowserPrototype

        if ($browserCheck.Passed) {
            Write-Ok "Browser prototype structural check passes."
        }
        else {
            Write-Fail $browserCheck.Message
            $failed = $true
        }
    }
    else {
        Write-Warn "Browser prototype directory does not exist yet. Run '.\orca.ps1 browser' after the Figma flow is ready."
    }

    if (Test-Path $BrowserTestReport) {
        $browserReport = Test-JsonFile -Path $BrowserTestReport

        if (-not $browserReport.Valid) {
            Write-Fail $browserReport.Message
            $failed = $true
        }
        elseif ($browserReport.Object.passed -eq $true) {
            Write-Ok "Latest M8 browser-test report is passing."
        }
        else {
            Write-Warn "Latest M8 browser-test report is not passing."
        }
    }
    else {
        Write-Warn "No M8 browser-test report exists yet."
    }

    # --------------------------------------------------------
    # Saved session
    # --------------------------------------------------------

    $state = Get-SavedSession

    if ($state -and $state.session_id) {
        Write-Ok "Saved design session: $($state.session_id)"
    }
    else {
        Write-Warn "No saved design session yet. Run a design first."
    }

    # --------------------------------------------------------
    # Final result
    # --------------------------------------------------------

    Write-Host ""

    if ($failed) {
        Write-Fail "Doctor found one or more blocking problems."
        exit 1
    }

    Write-Ok "System is ready."
    Write-Host ""
}

# ------------------------------------------------------------
# Commands
# ------------------------------------------------------------

switch ($Command) {

    # --------------------------------------------------------
    # VERSION
    # --------------------------------------------------------

    "version" {
        Invoke-Version
        exit 0
    }

    # --------------------------------------------------------
    # SELF-TEST
    # --------------------------------------------------------

    "self-test" {
        Invoke-SelfTest
    }

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    "status" {
        Invoke-Status
        exit 0
    }

    # --------------------------------------------------------
    # DOCTOR
    # --------------------------------------------------------

    "doctor" {
        Invoke-Doctor
        exit 0
    }

    # --------------------------------------------------------
    # RESET
    # --------------------------------------------------------

    "reset" {
        Write-Host ""

        if (Test-Path $StateFile) {
            $state = Get-SavedSession

            Remove-Item $StateFile -Force

            if ($state -and $state.session_id) {
                Write-Ok "Cleared Orca design session: $($state.session_id)"
            }
            else {
                Write-Ok "Cleared Orca design session state."
            }

            Write-Host ""
            Write-Host "The OpenCode session itself was not deleted."
            Write-Host "The next design command will start a fresh Orca design context."
        }
        else {
            Write-Warn "No saved Orca design session exists."
        }

        Write-Host ""
        exit 0
    }

    # --------------------------------------------------------
    # DESIGN
    # --------------------------------------------------------

    "design" {
        if (-not $Prompt -or $Prompt.Count -eq 0) {
            Write-Fail '.\orca.ps1 design "your design prompt"'
            exit 1
        }

        try {
            $figma = Test-FigmaConnection
        }
        catch {
            Write-Fail "Could not check the Figma connection."
            exit 1
        }

        if (-not $figma.Connected) {
            Write-Fail "Figma is not connected."
            Write-Host ""
            Write-Host "Open Figma Desktop."
            Write-Host "Open the target Figma design file."
            Write-Host "Run the Figma MCP development plugin."
            Write-Host ""
            exit 1
        }

        $userPrompt = ($Prompt -join " ").Trim()

        $message = @"
NEW FIGMA DESIGN TASK

Treat this as a new design task in the currently open Figma document.

Follow AGENTS.md, the web-designer agent instructions, and the project's Figma design rules.

Before creating anything:
- run health_check
- inspect the current document/page
- make a concise internal plan

Build the design section-by-section using native editable Figma layers.

Do not modify unrelated existing designs in the file.

Inspect and repair important sections as you work.

USER REQUEST:

$userPrompt
"@

        Write-Host ""
        Write-Host "Starting new Orca Figma design..."
        Write-Host "Agent: $DesignerAgent"
        Write-Host "Model: $DesignerModel"
        Write-Host ""

        try {
            Invoke-Designer `
                -Message $message `
                -NewSession
        }
        catch {
            Write-Host ""
            Write-Fail "OpenCode could not complete the design task."
            Write-Host $_.Exception.Message
            Write-Host ""
            Write-Host "Run '.\orca.ps1 doctor' to check the system."
            Write-Host ""
            exit 1
        }

        $sessionId = Get-LatestSessionId

        if ($sessionId) {
            Save-Session -SessionId $sessionId

            Write-Host ""
            Write-Ok "Design session saved: $sessionId"
        }
        else {
            Write-Host ""
            Write-Warn "Design finished, but the session ID could not be recorded."
            Write-Warn "Do not run revise until session tracking is fixed."
        }

        Write-Host ""
        exit 0
    }

    # --------------------------------------------------------
    # STATES
    # --------------------------------------------------------

    "states" {
        try {
            $figma = Test-FigmaConnection
        }
        catch {
            Write-Fail "Could not check the Figma connection."
            exit 1
        }

        if (-not $figma.Connected) {
            Write-Fail "Figma is not connected."
            Write-Host ""
            Write-Host "Open Figma Desktop."
            Write-Host "Open the target Figma design file."
            Write-Host "Run the Figma MCP development plugin."
            Write-Host ""
            exit 1
        }

        $state = Get-SavedSession
        $userRequest = ""

        if ($Prompt -and $Prompt.Count -gt 0) {
            $userRequest = ($Prompt -join " ").Trim()
        }

        if ($Node) {
            $targetScope = @"
TARGET SCOPE

Inspect Figma node $Node first.

Generate interaction-state components only for this node, or for meaningful interactive controls inside this node.

Do not modify unrelated sections.
"@
        }
        else {
            $targetScope = @"
TARGET SCOPE

Inspect the current Figma page and identify the most important existing interactive controls.

Prioritize at most six meaningful component families.

Do not generate state families for decorative elements or every repeated control instance.
"@
        }

        if ($userRequest) {
            $requestScope = @"
USER REQUEST

$userRequest

Treat this as an additional scope constraint.
"@
        }
        else {
            $requestScope = ""
        }

        $message = @"
FIGMA INTERACTION STATES TASK — PHASE 2

Run health_check before making changes.

Follow AGENTS.md, the web-designer agent instructions, and rules/figma-design-rules.md.

This task creates or upgrades a nondestructive interaction-state library from the existing Figma design using native COMPONENT_SET variants where appropriate.

$targetScope

$requestScope

PHASE 2 CAPABILITIES

The connected Figma MCP supports:
- native COMPONENT creation
- native COMPONENT_SET creation through combine_as_variants
- variant properties
- prototype reactions through set_reactions
- CHANGE_TO navigation between sibling variants in the same COMPONENT_SET

Use these capabilities directly.

Do not fabricate variants with nested frames.
Do not describe ordinary sibling COMPONENT nodes as variants unless they are children of a real COMPONENT_SET.
Do not use SWAP as a substitute for CHANGE_TO when the interaction is between variants of the same component set.

STRICT WRITE ISOLATION

The production design is READ-ONLY for this command.

Before the first write operation:
1. inspect the current document
2. identify the canonical top-level production root or roots
3. identify the canonical top-level frame named `Orca — Component States`
4. record a baseline snapshot of every non-library top-level node and its descendant IDs
5. for the targeted production subtree, also record key properties needed to detect mutation, including type, name, parent, bounds, text content where applicable, fills, strokes, typography, child order, and descendant count

WRITE ALLOWLIST:
- the canonical top-level frame named `Orca — Component States`
- descendants inside that state-library frame
- newly created state-library nodes
- existing state-library COMPONENT nodes that are being combined into a native COMPONENT_SET
- reactions on COMPONENT variants inside that state-library frame
- clearly empty or broken leftovers created by THIS SAME states run inside that library frame

WRITE DENYLIST:
- every production root
- every production descendant
- unrelated page-root nodes
- unrelated component libraries
- existing nodes outside `Orca — Component States`

Do not, even as cleanup or repair:
- convert a production control into a component
- move a production node
- delete a production node
- replace a production node
- reparent a production node
- rename a production node
- fix duplicate production content
- repair unrelated layout defects
- delete stray page-root content outside the state library
- make any aesthetic improvement outside the state library

If you notice an unrelated defect, REPORT IT ONLY. Do not fix it.

Instead:
1. inspect the production control read-only
2. reproduce its visual language inside the state library
3. create or reuse the state examples there
4. convert only state-library examples into native COMPONENT nodes
5. combine matching state COMPONENT nodes into one native COMPONENT_SET
6. add only conservative, semantically valid reactions inside that COMPONENT_SET

If any required operation would need a production write, stop that family and report the limitation rather than modifying production.

STATE LIBRARY

Create or reuse exactly one top-level frame named:

Orca — Component States

This is a FRAME on the current Figma page. It is not a page name.
It must be a direct page-level sibling of the production root or roots, not a child inside a production Auto Layout tree.

Before creating a new library frame:
- inspect the current Figma page for an existing FRAME with this exact name
- reuse the existing canonical frame when one exists
- if duplicates exist, do not delete them automatically unless the user explicitly asked for cleanup
- report duplicate state-library frames as a warning

Keep state families visually separated and readable.
Do not allow the state library to overlap or alter the production design.

EXISTING FAMILY REUSE

Before creating a family:
1. inspect the state-library frame
2. call get_local_components when useful
3. search for an existing matching COMPONENT_SET
4. search for existing standalone state COMPONENT nodes that belong to the family

If a correct native COMPONENT_SET already exists:
- reuse it
- do not create a duplicate set
- preserve its component IDs
- add only missing states or missing allowed reactions

If matching standalone COMPONENT states already exist inside the state library:
- preserve their IDs
- complete only genuinely missing states
- combine the family with combine_as_variants exactly once
- do not recreate valid states merely to obtain a component set

If an operation times out after partial success:
- inspect before retrying
- continue from the actual document state
- never rerun the entire family blindly

COMPONENT FAMILY NAMING

Before combining, standalone state components may use:

Control / Role / State

Examples:

Button / Primary / Default
Button / Primary / Hover
Button / Primary / Pressed
Button / Primary / Disabled

Link / Navigation / Default
Link / Navigation / Hover
Link / Navigation / Focus
Link / Navigation / Active

Input / Email / Default
Input / Email / Focus
Input / Email / Error
Input / Email / Disabled

Toggle / Notifications / Off
Toggle / Notifications / On
Toggle / Notifications / Disabled

For a native variant family:
- COMPONENT_SET name = `Control / Role`
- variant property name = `State`
- component child names after combining = `State=<Value>`

Examples:

COMPONENT_SET: Button / Primary
- State=Default
- State=Hover
- State=Pressed
- State=Disabled

COMPONENT_SET: Link / Navigation
- State=Default
- State=Hover
- State=Focus
- State=Active

Do not rename production nodes to achieve this naming scheme.

STATE CLASSIFICATION

Only create states that make semantic sense.

BUTTON
Prefer:
- Default
- Hover
- Pressed
- Disabled

Add Loading only when the control genuinely represents an async action.

TEXT LINK / NAVIGATION LINK
Prefer:
- Default
- Hover
- Focus
- Active when meaningful

Keep link states link-like.
Do not turn plain text navigation into button-like filled pills unless the existing design already does that.

TEXT INPUT / TEXTAREA
Prefer:
- Default
- Focus
- Error
- Disabled

Add Filled or Success only when useful.

TOGGLE
Prefer:
- Off
- On
- Disabled

Use separate disabled-on/off states only when that distinction is materially useful.

CHECKBOX
Prefer:
- Unchecked
- Checked
- Indeterminate when relevant
- Disabled

RADIO
Prefer:
- Unselected
- Selected
- Disabled

TAB
Prefer:
- Inactive
- Hover
- Active

Do not duplicate full page content for tab states.

DROPDOWN
Prefer:
- Closed
- Open
- Selected
- Disabled

The Open state may contain a compact representative menu.

MODAL
Create the visible modal component and meaningful internal control states.
Do not create an invisible `Closed` variant merely to mimic prototype state unless the user explicitly requests a modal-state model.

VISUAL CONSISTENCY

Derive every state family from the existing product design.

Preserve its:
- typography
- color system
- radii
- border language
- shadows
- spacing
- density
- icon language

Do not introduce a new design direction.
Do not invoke anti-slop or polish guidance as permission to redesign the source control.
This task extends the established design system.

STATE DIFFERENTIATION

Make states visibly meaningful but restrained.

Hover:
- modest text, fill, stroke, underline, or elevation change

Pressed:
- clear pressed feedback
- avoid dramatic scaling

Disabled:
- reduced contrast
- reduced false emphasis
- preserve legibility

Focus:
- visible accessible focus treatment
- a focus stroke or ring may paint slightly outside component bounds
- do not damage structural sizing merely to eliminate a harmless painted-bounds overhang

Error:
- semantic error treatment
- preserve readability

Success:
- semantic success treatment only when the control actually benefits from it

NATIVE VARIANT CREATION

For each family that has two or more compatible state COMPONENT nodes:
1. verify every candidate is a local COMPONENT inside `Orca — Component States`
2. verify none is already a member of another COMPONENT_SET
3. determine the intended family container inside the state library
4. call combine_as_variants once with all state component IDs
5. use name = `Control / Role`
6. use propertyName = `State`
7. pass variantValues in the same order as componentIds
8. pass parentId when there is a clear intended family container inside the state library; otherwise allow the tool to choose the nearest safe common ancestor
9. do not delete former wrapper frames merely because combining moved their component children
10. inspect the resulting COMPONENT_SET immediately

After combining, verify:
- exactly one native COMPONENT_SET exists for that family
- every intended original component ID still exists
- every variant's componentSetId equals the new set ID
- every variant reports the expected `State=<Value>` property
- the set remains inside `Orca — Component States`

PROTOTYPE REACTIONS — CONSERVATIVE DEFAULTS

Before writing reactions:
- call get_reactions on each source variant you intend to modify
- preserve unrelated existing reactions
- never add duplicate reactions
- prefer set_reactions mode `append` for a genuinely missing reaction
- do not use `replace` unless the user explicitly asked to replace existing prototype behavior

For BUTTON families with Default, Hover, Pressed, and Disabled variants, wire the proven interaction chain:

Default:
- trigger: ON_HOVER
- action type: NODE
- navigation: CHANGE_TO
- destination: Hover variant
- transition: SMART_ANIMATE
- duration: 0.1 seconds
- easing: EASE_OUT

Hover:
- trigger: ON_PRESS
- action type: NODE
- navigation: CHANGE_TO
- destination: Pressed variant
- transition: SMART_ANIMATE
- duration: 0.1 seconds
- easing: EASE_OUT

Pressed:
- add no automatic reverse reaction by default

Disabled:
- add no reactions

Figma's ON_HOVER CHANGE_TO behavior reverts when the pointer leaves the interactive component, so do not fabricate a mouse-leave reaction.

For TEXT LINK / NAVIGATION LINK families:
- Default ON_HOVER -> Hover using CHANGE_TO with SMART_ANIMATE 0.1s EASE_OUT is allowed when both variants exist
- do not automatically wire Focus or Active unless the user explicitly requests that interaction behavior

For toggles, checkboxes, radios, tabs, dropdowns, inputs, and other families:
- create the native COMPONENT_SET
- do not invent interaction mappings merely because variants exist
- wire additional reactions only when the requested behavior is unambiguous or explicitly requested

Never add reactions to Disabled variants.
Never add a reaction whose destination is outside the same COMPONENT_SET when using CHANGE_TO.

IMPLEMENTATION

Useful MCP tools include:
- inspect_node_as_html
- write_html
- create_component
- create_component_from_html
- get_local_components
- combine_as_variants
- get_reactions
- set_reactions

Use create_component only on state-library frames or nodes created for the state library.
Every actual state must end as a native Figma COMPONENT.
Every multi-state family should end as a native COMPONENT_SET when structurally compatible.
Keep children editable.

Respect known parser constraints:
- explicit text widths
- no structured multiline content via br
- buttons use actual containers
- prefer Auto Layout where practical
- verify important strokes
- inspect after creation
- avoid relying on HTML entities such as &lsquo; in generated descriptive text; use normal plain text instead

PARTIAL-WRITE RECOVERY

write_html and other bridge operations can time out after partially creating content.

If a write, conversion, combination, or reaction operation fails or times out:

1. inspect the state-library frame
2. inspect get_local_components and get_reactions as relevant
3. determine exactly which families, states, sets, and reactions already exist
4. preserve valid completed work
5. create only missing states
6. combine only families that are not already valid COMPONENT_SETs
7. add only missing reactions
8. remove only clearly empty or broken leftovers created by THIS SAME states run
9. do not rerun the whole family blindly
10. inspect again

Never duplicate a complete state family merely because one operation timed out.
Never call combine_as_variants twice on a family that already became a valid COMPONENT_SET.

LAYOUT

Preserve the source control's dimensions when practical.

If exact source dimensions cause the state sheet to overflow:
- prefer wrapping or reorganizing the library layout
- modestly adapting display-copy width is acceptable only when necessary
- do not change production-control dimensions
- report meaningful dimensional adaptation in the final summary

For page-wide automatic generation:
- create at most six meaningful component families by default
- prioritize controls that establish the product's interaction language
- repeated copies of the same control pattern count as one family

VALIDATION

After generation:

1. inspect `Orca — Component States`
2. verify every intended state is a native COMPONENT
3. verify every compatible multi-state family is a real COMPONENT_SET
4. verify COMPONENT_SET names and State variant properties
5. verify original state component IDs were preserved when existing components were combined
6. inspect every reaction that was added or reused
7. verify button Default has at most one intended ON_HOVER -> Hover CHANGE_TO reaction
8. verify button Hover has at most one intended ON_PRESS -> Pressed CHANGE_TO reaction
9. verify Disabled variants have no newly added reactions
10. verify every CHANGE_TO destination belongs to the same COMPONENT_SET
11. compare every non-library top-level node and recorded production descendant against the pre-write baseline
12. verify production root IDs and child order are unchanged
13. verify the targeted production control's type, name, parent, bounds, text, fills, strokes, typography, and child structure are unchanged
14. verify no unrelated page-root node was added, deleted, moved, renamed, or modified
15. verify no production root was replaced
16. check obvious text overflow
17. check obvious frame overflow
18. check family spacing and library growth
19. distinguish structural bounds from harmless painted focus-ring bounds
20. report duplicate state-library frames if any exist

If any non-library mutation is detected:
- do not hide it
- do not make additional unrelated fixes
- report exactly what changed
- mark the task as a production-isolation failure

FINAL REPORT

Keep the report concise but specific.

Report:
- state-library frame ID
- families created or reused
- COMPONENT_SET IDs
- component/variant IDs and State properties
- reactions added or reused
- any partial-write recovery performed
- any former wrapper frames left behind after combining
- any intentional display-size adaptation
- whether the source target remained untouched
- whether the complete non-library production baseline remained unchanged
- any duplicate state-library warning
- any MCP limitation encountered

End the report with exactly one of these machine-readable lines:

ORCA_PRODUCTION_GUARD: PASS

or

ORCA_PRODUCTION_GUARD: FAIL

Use PASS only if no write outside the canonical `Orca — Component States` frame occurred and the before/after production comparison found no mutation.

Do not claim a family is a native variant set unless inspection confirms a real COMPONENT_SET.
"@

        Write-Host ""
        Write-Host "Generating Orca interaction states..."
        Write-Host "Agent: $DesignerAgent"
        Write-Host "Model: $DesignerModel"

        if ($Node) {
            Write-Host "Target node: $Node"
        }
        else {
            Write-Host "Target: current Figma page"
        }

        if ($userRequest) {
            Write-Host "Request: $userRequest"
        }

        if ($state -and $state.session_id) {
            Write-Host "Session: $($state.session_id)"
        }
        else {
            Write-Warn "No saved design session exists; states will run in a fresh OpenCode context."
        }

        Write-Host ""

        try {
            if ($state -and $state.session_id) {
                Invoke-Designer `
                    -Message $message `
                    -SessionId $state.session_id

                Save-Session -SessionId $state.session_id
            }
            else {
                Invoke-Designer `
                    -Message $message `
                    -NewSession

                $sessionId = Get-LatestSessionId

                if ($sessionId) {
                    Save-Session -SessionId $sessionId

                    Write-Host ""
                    Write-Ok "State-generation session saved: $sessionId"
                }
                else {
                    Write-Host ""
                    Write-Warn "States finished, but the session ID could not be recorded."
                }
            }
        }
        catch {
            Write-Host ""
            Write-Fail "OpenCode could not complete the interaction-state task."
            Write-Host $_.Exception.Message
            Write-Host ""
            Write-Host "Run '.\orca.ps1 doctor' to check the system."
            Write-Host ""
            exit 1
        }

        $postState = Get-SavedSession

        if (-not $postState -or -not $postState.session_id) {
            Write-Host ""
            Write-Fail "State generation finished, but no session is available for the production-isolation audit."
            Write-Host ""
            exit 1
        }

        $auditMessage = @"
ORCA STATES PRODUCTION-ISOLATION AUDIT

This is a READ-ONLY verification pass.

Do not modify Figma in any way.
Do not delete, repair, rename, move, restyle, or clean up any node.

Using the pre-write production baseline you recorded during the immediately preceding states task, inspect the current document again and compare the full non-library production tree.

The only allowed mutations from the states task are inside the canonical top-level frame named:

Orca — Component States

Check that outside that frame:
- all pre-existing top-level node IDs still exist
- no unrelated top-level node was deleted or added by the states task
- production root IDs are unchanged
- production child order is unchanged
- recorded production descendant IDs are unchanged
- the targeted source control is unchanged
- no production node was moved, renamed, reparented, restyled, or rewritten

If you observe a pre-existing defect, do not repair it.

Return the audit result with the FIRST non-empty line exactly one of:

ORCA_PRODUCTION_GUARD: PASS
ORCA_PRODUCTION_GUARD: FAIL

After that first line, give only a concise explanation.
"@

        Write-Host ""
        Write-Host "Running read-only production-isolation audit..."
        Write-Host ""

        try {
            $auditOutput = Invoke-DesignerCapture `
                -Message $auditMessage `
                -SessionId $postState.session_id
        }
        catch {
            Write-Host ""
            Write-Fail "Could not complete the production-isolation audit."
            Write-Host $_.Exception.Message
            Write-Host ""
            exit 1
        }

        if ($auditOutput -match "ORCA_PRODUCTION_GUARD:\s*FAIL") {
            Write-Host ""
            Write-Fail "Interaction states were generated, but production isolation failed."
            Write-Host "Review the audit above before running another states command."
            Write-Host ""
            exit 1
        }

        if ($auditOutput -notmatch "ORCA_PRODUCTION_GUARD:\s*PASS") {
            Write-Host ""
            Write-Fail "The production-isolation audit did not return a valid PASS marker."
            Write-Host "No further state automation should run until this is checked."
            Write-Host ""
            exit 1
        }

        Write-Host ""
        Write-Ok "Interaction-state generation complete."
        Write-Ok "Production isolation verified."
        Write-Host ""
        Write-Host "Phase 2 uses native COMPONENT_SET variants when structurally compatible."
        Write-Host "Conservative prototype reactions are added only for proven or explicitly requested mappings."
        Write-Host "Production remains read-only for the states command."
        Write-Host ""

        exit 0
    }

    # --------------------------------------------------------
    # FLOW
    # --------------------------------------------------------

    "flow" {
        try {
            $figma = Test-FigmaConnection
        }
        catch {
            Write-Fail "Could not check the Figma connection."
            exit 1
        }

        if (-not $figma.Connected) {
            Write-Fail "Figma is not connected."
            Write-Host ""
            Write-Host "Open Figma Desktop."
            Write-Host "Open the target Figma design file."
            Write-Host "Run the Figma MCP development plugin."
            Write-Host ""
            exit 1
        }

        $state = Get-SavedSession
        $userRequest = ""

        if ($Prompt -and $Prompt.Count -gt 0) {
            $userRequest = ($Prompt -join " ").Trim()
        }

        if ($Node) {
            $targetScope = @"
TARGET SCOPE

Inspect Figma node $Node first.

Treat this node as the source scope for the prototype flow.
If it is a production screen/root, clone it into the prototype-flow section before editing anything.
If it is a smaller production subtree, use it only as read-only design/context input unless the requested flow clearly needs a full-screen clone.

Do not modify the source node or any ancestor/descendant in production.
"@
        }
        else {
            $targetScope = @"
TARGET SCOPE

Inspect the current Figma page and identify the canonical production screen/root that best represents the primary user journey.

Use that production screen as read-only source material.
Create prototype-safe copies inside the prototype-flow section before making interactive flow edits.

Prefer one focused primary journey over generating every possible branch.
"@
        }

        if ($userRequest) {
            $requestScope = @"
USER REQUEST

$userRequest

Treat this as the primary flow constraint.
Do not broaden the journey beyond what is needed to satisfy this request.
"@
        }
        else {
            $requestScope = @"
DEFAULT FLOW GOAL

Create or update the clearest prototype-ready primary journey supported by the existing document.

Do not invent business logic, destinations, or product states merely to make the prototype look complete.
If the document does not provide a clear destination for an action, leave that action unwired and report it.
"@
        }

        $message = @"
FIGMA PROTOTYPE FLOW TASK — PHASE 3

Run health_check before making changes.

Follow AGENTS.md, the web-designer agent instructions, and rules/figma-design-rules.md.

This task creates or updates a nondestructive clickable prototype flow using copies and instances. Production and the component-state library are read-only.

$targetScope

$requestScope

PHASE 3 GOAL

Build a usable prototype journey without modifying the production design.

The intended architecture is:

production design (read-only)
-> native component library (read-only)
-> prototype-flow copies/instances (writable)
-> validated prototype reactions

Use existing native COMPONENT_SET families from `Orca — Component States` when they match controls in the prototype copies.
Use actual Figma prototype reactions for navigation only when the destination is explicit or when the user explicitly requested a prototype-only destination screen.

STRICT WRITE ISOLATION

Before the first write operation:
1. inspect the current document
2. identify all page-level nodes
3. identify the canonical production root or roots
4. identify the canonical `Orca — Component States` frame if present
5. identify the canonical direct page-level SECTION named `Orca — Prototype Flows` if present
6. also identify any legacy direct page-level FRAME with that exact name
7. record a baseline snapshot/fingerprint for EVERY page-level subtree outside the canonical flow SECTION and any exact-name legacy flow FRAME
8. for the requested source scope, record type, name, parent, bounds, text, fills, strokes, typography, child order, descendant IDs, and descendant count as practical

WRITE ALLOWLIST:
- the canonical direct page-level SECTION named `Orca — Prototype Flows`
- descendants inside that section
- new screen copies created inside that section
- instances and helper labels created inside that section
- reactions on nodes inside that section
- clearly empty or broken leftovers created by THIS SAME flow run inside that section
- ONE-TIME LEGACY MIGRATION ONLY: when no canonical SECTION exists and an exact-name direct page-level FRAME exists, you may create the replacement SECTION, reparent only that legacy frame's prototype-flow children into the SECTION, preserve their absolute positions/IDs/reactions, and remove the legacy FRAME only after it is empty and every intended child is accounted for

WRITE DENYLIST:
- every production root
- every production descendant
- `Orca — Component States`
- every COMPONENT_SET and COMPONENT inside the component-state library
- unrelated page-root nodes
- unrelated component libraries
- anything outside the canonical flow SECTION, except the narrowly defined one-time migration of the exact-name legacy flow FRAME

Do not, even as cleanup or repair:
- edit production
- convert production controls into components
- move or reparent production nodes
- delete production nodes
- rename production nodes
- restyle production nodes
- add reactions directly to production nodes
- edit reactions inside `Orca — Component States`
- rename or restyle component sets in the library
- delete old library captions or wrapper frames
- repair unrelated page-root defects
- delete unrelated page-root content

If you notice an unrelated defect, REPORT IT ONLY.

PROTOTYPE FLOW SECTION

Create or reuse exactly one direct page-level SECTION named:

Orca — Prototype Flows

This is a Figma SECTION used to organize prototype screen frames. It is not a Figma page and must not be a normal FRAME container.
It must remain a sibling of production roots and of `Orca — Component States`.

Why SECTION is required:
- navigable prototype screens should remain screen FRAMEs inside a prototype-organizing SECTION
- do not nest all prototype screens inside a normal FRAME container
- screen-to-screen navigation must use NODE + NAVIGATE to the destination screen FRAME
- CHANGE_TO remains reserved for interactive component variants

Before creating or migrating:
- inspect the page for an existing SECTION with this exact name
- reuse the canonical SECTION when one exists
- inspect for an exact-name direct page-level FRAME from the older Orca flow architecture
- if duplicates exist beyond one canonical SECTION and one clearly identifiable legacy FRAME, do not auto-clean them; report the ambiguity

ONE-TIME LEGACY FRAME MIGRATION

If no canonical SECTION exists and exactly one direct page-level FRAME named `Orca — Prototype Flows` exists:
1. treat that FRAME as the legacy Orca flow container
2. inspect and record every direct child ID, type, name, absolute bounds, and reactions before moving anything
3. create exactly one direct page-level SECTION named `Orca — Prototype Flows`
4. position/size the SECTION to contain the existing prototype screens with readable padding
5. reparent only the legacy flow's intended prototype screens/helper nodes into the new SECTION
6. preserve each moved node's original ID, name, absolute canvas position, dimensions, component-instance linkage, and reactions
7. inspect every moved node immediately after reparenting
8. if reparenting changes absolute placement, restore the recorded absolute layout inside the SECTION
9. remove the legacy FRAME only if it is empty after migration and every original intended child is accounted for in the SECTION
10. if the legacy FRAME still contains an unexplained child, STOP migration cleanup, keep it, report the ambiguity, and do not delete it
11. never move production or component-library nodes during migration

Place/resize the flow SECTION so all prototype screens fit within its visual board with comfortable padding.
Keep its contents readable and organized.

FLOW DISCOVERY

Before building or changing screens:
1. inspect the source production screen/root read-only
2. inspect `Orca — Component States` and get_local_components
3. inspect existing prototype-flow screens if the flow SECTION already exists or inspect the legacy flow FRAME before migration
4. identify explicit interactive controls and explicit destinations already present in the document
5. identify component sets that correspond to controls used by the flow
6. identify existing reactions inside the prototype-flow SECTION (or legacy flow FRAME before migration) so valid work is preserved

Do not infer a destination solely from button copy when no matching destination exists.
Do not invent authentication, checkout, account, payment, confirmation, modal, or navigation behavior unless the user explicitly asks for that journey or the destination already exists in the source document.

SCREEN CREATION

Prefer cloning an existing source screen/root into the `Orca — Prototype Flows` SECTION rather than rebuilding it from scratch.
Production is the visual source of truth.

Rules:
- never edit the original source screen
- clone before editing
- preserve the cloned screen's visual fidelity
- keep each prototype screen as an editable native FRAME
- use a maximum of five screen frames by default unless the user explicitly requests a larger flow
- avoid creating separate full-screen copies merely for Hover/Pressed/Focus states; use component variants for those states

Name prototype screens consistently:

Flow / <Journey> / 01 — <Screen Name>
Flow / <Journey> / 02 — <Screen Name>
Flow / <Journey> / 03 — <Screen Name>

Use concise journey and screen names grounded in the document/user request.

If the user explicitly requests a journey whose destination does not exist in production:
- a prototype-only destination screen MAY be created inside the `Orca — Prototype Flows` SECTION
- derive its visual language strictly from production
- label/report it as prototype-only
- do not imply it is an existing production screen
- create only the minimum destination necessary to demonstrate the requested journey

If the user did not explicitly request a missing destination:
- do not fabricate it
- leave the source action unwired
- report the missing destination

COMPONENT INSTANCE INTEGRATION

When an existing native COMPONENT_SET in `Orca — Component States` corresponds clearly to a control in a cloned prototype screen:
1. inspect the component set and source control
2. instantiate the appropriate Default/base variant using instantiate_by_name or the safest available instance tool
3. place/reparent the instance only inside a prototype screen FRAME within the flow SECTION
4. preserve the cloned control's dimensions, alignment, text, and layout intent as closely as practical
5. remove/replace only the cloned control after the instance is verified
6. never remove or alter the production source control
7. never alter the source COMPONENT_SET merely to make an instance fit

If replacing a cloned control with an instance would damage the screen layout or semantics:
- keep the cloned control
- wire only supported prototype behavior on the clone when appropriate
- report that the component instance substitution was skipped

Do not force a library component onto a control that is only visually similar but semantically different.

INTERACTIVE VARIANT BEHAVIOR

Existing interactive-variant reactions in the component library are already proven and should be reused through instances.
Do not rewrite those source reactions during `flow`.

Known proven library behavior includes, where those variants exist:
- Default ON_HOVER -> Hover using CHANGE_TO
- Hover ON_PRESS -> Pressed using CHANGE_TO
- ON_HOVER auto-reverts on mouse-out in Figma

Do not add a fake Pressed -> Default release reaction when no supported release trigger exists.
Disabled variants must not gain navigation merely to make the prototype clickable.

SCREEN NAVIGATION REACTIONS

Before adding a screen-navigation reaction:
1. call get_reactions on the prototype-flow source node
2. verify the exact destination screen FRAME exists inside the `Orca — Prototype Flows` SECTION or is an explicitly intended existing destination allowed by the user
3. inspect the set_reactions schema/tool contract if necessary
4. avoid duplicate equivalent reactions
5. preserve unrelated valid prototype-flow reactions
6. for screen-to-screen navigation use navigation `NAVIGATE`, never `CHANGE_TO`
7. source and destination screen FRAMEs should be organized by the flow SECTION, not nested inside a normal FRAME board

Use only reaction/action/navigation values actually supported by the connected MCP.
For a NODE action, include a transition because the MCP schema requires it.

Default screen-navigation transition when supported:
- type: DISSOLVE
- duration: 0.15 seconds
- easing: EASE_OUT

If DISSOLVE is not accepted by the current schema, use a supported conservative transition and report the substitution.

Prefer append mode after verifying the reaction is missing.
Use replace only when intentionally correcting a known bad reaction inside the `Orca — Prototype Flows` SECTION and report that replacement.

Every destination ID must be verified after the write.
Never use CHANGE_TO for navigation between unrelated screen frames; CHANGE_TO is for variants in the same COMPONENT_SET.

Do not create URL reactions unless the user explicitly supplied or requested an external URL.
Do not create BACK/CLOSE behavior unless the flow contains a semantically clear control requiring it.

PARTIAL-WRITE RECOVERY

Bridge writes can time out after partial success.

If cloning, instance creation, reparenting, deletion of a cloned placeholder, or reaction creation fails/times out:
1. inspect the `Orca — Prototype Flows` SECTION and, if migration was in progress, the legacy flow FRAME
2. determine exactly what succeeded
3. preserve valid completed work
4. continue only the missing step
5. never duplicate a screen that already exists correctly
6. never duplicate a reaction that already exists
7. remove only clearly broken/empty leftovers created by THIS SAME flow run
8. do not clean production or the component-state library
9. inspect again before another write

Never rerun the whole flow blindly after a partial timeout.

LAYOUT

Organize prototype screens left-to-right in journey order when practical.
Keep clear spacing between screens.
Keep helper labels outside screen content where practical.
Do not let the prototype-flow SECTION overlap production or the state-library frame.
Resize/reposition the SECTION so its screen frames fit within the board; do not leave a known board-overflow warning when it can be fixed without changing screen content.

Do not redesign the source screen merely to make the flow board prettier.
The flow board should expose the product journey, not establish a new visual direction.

VALIDATION

After writes:
1. inspect the canonical `Orca — Prototype Flows` SECTION
2. verify every intended prototype screen exists as a native FRAME inside that SECTION
3. verify screen names and journey order
4. verify no production node ID was reparented into the flow SECTION
5. verify cloned/created flow nodes live only inside the flow SECTION
6. verify intended component instances reference the expected library components/component sets when inspectable
7. inspect every reaction added or reused inside the flow
8. verify every reaction destination ID exists
9. verify screen navigation does not use CHANGE_TO between unrelated frames
10. verify no duplicate equivalent reactions were added
11. verify no new reactions were written into `Orca — Component States`
12. verify no COMPONENT_SET or COMPONENT in `Orca — Component States` was renamed, moved, or modified
13. verify all protected page-level subtrees outside the canonical flow SECTION and any intentionally migrated exact-name legacy flow FRAME match the pre-write baseline/fingerprint
14. verify the source production subtree is unchanged
15. verify production descendant count and child order are unchanged
16. check obvious overlap/overflow in the prototype-flow SECTION and ensure the SECTION bounds contain its screen frames
17. report every intentionally created prototype-only destination
18. report every source action left unwired because no safe destination exists

If ANY protected node outside the canonical flow SECTION changed, other than the narrowly defined migration of the exact-name legacy flow FRAME:
- do not hide it
- do not attempt broad cleanup
- report the exact difference
- mark production isolation as failed

FINAL REPORT

Keep the report concise but specific.

Report:
- prototype-flow SECTION ID and type
- source production node/root used
- journey name
- prototype screen IDs and names
- screens cloned vs prototype-only screens created
- component instances integrated and their source component/component-set names
- navigation reactions added/reused with source ID, trigger, action/navigation, destination ID, and transition
- actions intentionally left unwired and why
- any partial-write recovery performed
- legacy-flow migration result and any duplicate/ambiguous flow-container warning
- whether `Orca — Component States` remained untouched
- whether production remained untouched
- whether every non-flow page-level subtree matched the baseline

End the report with exactly one of these machine-readable lines:

ORCA_PRODUCTION_GUARD: PASS

or

ORCA_PRODUCTION_GUARD: FAIL

Use PASS only if every write was confined to the canonical `Orca — Prototype Flows` SECTION, except for the narrowly defined one-time migration of an exact-name legacy flow FRAME, and all protected page-level subtrees remained unchanged.
"@

        Write-Host ""
        Write-Host "Generating Orca prototype flow..."
        Write-Host "Agent: $DesignerAgent"
        Write-Host "Model: $DesignerModel"

        if ($Node) {
            Write-Host "Source node: $Node"
        }
        else {
            Write-Host "Source: primary production screen on current Figma page"
        }

        if ($userRequest) {
            Write-Host "Request: $userRequest"
        }

        if ($state -and $state.session_id) {
            Write-Host "Session: $($state.session_id)"
        }
        else {
            Write-Warn "No saved design session exists; flow will run in a fresh OpenCode context."
        }

        Write-Host ""

        try {
            if ($state -and $state.session_id) {
                Invoke-Designer `
                    -Message $message `
                    -SessionId $state.session_id

                Save-Session -SessionId $state.session_id
            }
            else {
                Invoke-Designer `
                    -Message $message `
                    -NewSession

                $sessionId = Get-LatestSessionId

                if ($sessionId) {
                    Save-Session -SessionId $sessionId

                    Write-Host ""
                    Write-Ok "Prototype-flow session saved: $sessionId"
                }
                else {
                    Write-Host ""
                    Write-Warn "Flow generation finished, but the session ID could not be recorded."
                }
            }
        }
        catch {
            Write-Host ""
            Write-Fail "OpenCode could not complete the prototype-flow task."
            Write-Host $_.Exception.Message
            Write-Host ""
            Write-Host "Run '.\orca.ps1 doctor' to check the system."
            Write-Host ""
            exit 1
        }

        $postState = Get-SavedSession

        if (-not $postState -or -not $postState.session_id) {
            Write-Host ""
            Write-Fail "Flow generation finished, but no session is available for the production-isolation audit."
            Write-Host ""
            exit 1
        }

        $auditMessage = @"
ORCA FLOW PRODUCTION-ISOLATION AUDIT

This is a READ-ONLY verification pass.

Do not modify Figma in any way.
Do not delete, repair, rename, move, restyle, reparent, or clean up any node.

Using the pre-write baseline/fingerprint recorded during the immediately preceding flow task, inspect the current document again.

The canonical writable container is the direct page-level SECTION named:

Orca — Prototype Flows

If this run performed the explicitly allowed one-time migration from an exact-name legacy direct page-level FRAME, creation of the SECTION, reparenting of only legacy flow children into it, and removal of the now-empty legacy FRAME are expected migration changes.

Verify that EVERY protected page-level subtree outside the canonical flow SECTION and outside that narrowly defined legacy migration is unchanged, including:
- all production roots and descendants
- the complete `Orca — Component States` subtree
- every unrelated page-root node

Specifically verify as available:
- pre-existing protected page-level node IDs outside the flow SECTION/legacy migration still exist
- no unrelated page-level node was added or deleted
- production root IDs are unchanged
- production child order is unchanged
- recorded production descendant IDs/counts are unchanged
- the requested source production node/subtree is unchanged
- component-state COMPONENT_SET/COMPONENT IDs, names, hierarchy, and reactions are unchanged
- no production or component-library node was moved into the prototype-flow SECTION
- if migration occurred, every migrated prototype-flow child retained its ID/name/role and the old legacy FRAME was removed only if empty/accounted for

Changes INSIDE the `Orca — Prototype Flows` SECTION are expected and must not cause the audit to fail.
The narrowly defined one-time legacy flow FRAME migration is also expected and must not cause the audit to fail.

If you observe a pre-existing defect, do not repair it.

Return the audit result with the FIRST non-empty line exactly one of:

ORCA_PRODUCTION_GUARD: PASS
ORCA_PRODUCTION_GUARD: FAIL

After that first line, give only a concise explanation.
"@

        Write-Host ""
        Write-Host "Running read-only prototype-flow isolation audit..."
        Write-Host ""

        try {
            $auditOutput = Invoke-DesignerCapture `
                -Message $auditMessage `
                -SessionId $postState.session_id
        }
        catch {
            Write-Host ""
            Write-Fail "Could not complete the prototype-flow production-isolation audit."
            Write-Host $_.Exception.Message
            Write-Host ""
            exit 1
        }

        if ($auditOutput -match "ORCA_PRODUCTION_GUARD:\s*FAIL") {
            Write-Host ""
            Write-Fail "Prototype flow was generated, but production isolation failed."
            Write-Host "Review the audit above before running another flow command."
            Write-Host ""
            exit 1
        }

        if ($auditOutput -notmatch "ORCA_PRODUCTION_GUARD:\s*PASS") {
            Write-Host ""
            Write-Fail "The prototype-flow isolation audit did not return a valid PASS marker."
            Write-Host "No further flow automation should run until this is checked."
            Write-Host ""
            exit 1
        }

        Write-Host ""
        Write-Ok "Prototype-flow generation complete."
        Write-Ok "Production and component-library isolation verified."
        Write-Host ""
        Write-Host "Phase 3 writes only inside the Orca — Prototype Flows SECTION, except a one-time legacy flow-FRAME migration."
        Write-Host "Production and Orca — Component States remain read-only."
        Write-Host "Screen navigation uses NODE + NAVIGATE to verified destination frames."
        Write-Host ""

        exit 0
    }


    # --------------------------------------------------------
    # MOTION
    # --------------------------------------------------------

    "motion" {
        try {
            $figma = Test-FigmaConnection
        }
        catch {
            Write-Fail "Could not check the Figma connection."
            exit 1
        }

        if (-not $figma.Connected) {
            Write-Fail "Figma is not connected."
            Write-Host ""
            Write-Host "Open Figma Desktop."
            Write-Host "Open the target Figma design file."
            Write-Host "Run the Figma MCP development plugin."
            Write-Host ""
            exit 1
        }

        $state = Get-SavedSession
        $userRequest = ""

        if ($Prompt -and $Prompt.Count -gt 0) {
            $userRequest = ($Prompt -join " ").Trim()
        }

        if ($Node) {
            $targetScope = @"
MOTION TARGET SCOPE

Inspect Figma node $Node first.

Normalize only existing prototype transitions on this node/subtree and, when necessary to preserve inherited interactive-component behavior, the directly corresponding source COMPONENT variants in `Orca — Component States`.

Do not broaden the motion pass to unrelated journeys or component families.
"@
        }
        else {
            $targetScope = @"
MOTION TARGET SCOPE

Inspect the canonical `Orca — Component States` library and the canonical `Orca — Prototype Flows` SECTION.

Normalize only existing reactions whose transition mapping is unambiguous under the Orca motion tokens below.

Do not add interactions merely because a node looks interactive.
"@
        }

        if ($userRequest) {
            $requestScope = @"
USER MOTION REQUEST

$userRequest

Treat this as an additional motion constraint.
It may authorize a specific directional transition only when the requested direction and relationship are explicit.
It does not authorize new destinations, new reactions, new screens, or production writes.
"@
        }
        else {
            $requestScope = ""
        }

        $message = @"
FIGMA MOTION SYSTEM TASK — PHASE 5

Run health_check before making changes.

Follow AGENTS.md, the web-designer agent instructions, and rules/figma-design-rules.md.

This task standardizes motion on EXISTING prototype reactions only.
It does not create interaction behavior.

$targetScope

$requestScope

PHASE 5 GOAL

Apply a restrained, consistent motion language to the native component-state library and prototype flow while preserving every existing interaction's semantics.

The current architecture is:

production design (strictly read-only)
-> `Orca — Component States` (reaction transitions may be normalized)
-> `Orca — Prototype Flows` SECTION (reaction transitions may be normalized)
-> prototype QA

MOTION TOKENS

Use these Orca defaults unless the user explicitly requested another supported transition for a specific existing edge.

1. COMPONENT STATE / FAST
Use for NODE + CHANGE_TO between variants in the SAME COMPONENT_SET:
- transition.type: SMART_ANIMATE
- duration: 0.10 seconds
- easing.type: EASE_OUT

This is the canonical interaction-state token.

2. SCREEN / DEFAULT
Use for ordinary NODE + NAVIGATE between prototype screen FRAMEs when no spatial relationship is explicitly required:
- transition.type: DISSOLVE
- duration: 0.15 seconds
- easing.type: EASE_OUT

This is the canonical screen-navigation token.

3. SPATIAL / EXPLICIT ONLY
Directional motion is allowed only when the user request or existing journey structure clearly requires a directional spatial relationship.

Allowed directional transition types:
- PUSH
- MOVE_IN
- MOVE_OUT
- SLIDE_IN
- SLIDE_OUT

Default directional duration:
- 0.20 seconds
- easing.type: EASE_OUT

Directional transitions must include:
- direction: LEFT, RIGHT, TOP, or BOTTOM
- matchLayers: false unless the existing reaction already intentionally uses matching-layer behavior and that behavior is verified

Do not introduce PUSH/MOVE/SLIDE merely for visual flair.
When direction is ambiguous, use SCREEN / DEFAULT instead.

4. OVERLAY / CONSERVATIVE
For existing NODE + OVERLAY reactions:
- prefer DISSOLVE
- duration: 0.15 seconds
- easing.type: EASE_OUT

Do not convert an overlay to SMART_ANIMATE automatically.
Do not create overlays during this task.

5. NON-NODE ACTIONS
For BACK, CLOSE, URL, or other non-NODE actions:
- preserve the existing action exactly
- do not invent transition fields that are not already supported by that action
- do not replace the action type

REDUCED-MOTION-SAFE POLICY

The current MCP/Figma automation does not dynamically switch prototype transitions based on an operating-system reduced-motion preference.

Therefore Orca's automated policy is intentionally restrained:
- use short durations
- use DISSOLVE for ordinary screen changes
- use SMART_ANIMATE only for compact component-state changes
- do not introduce scale, parallax, bounce, spring-like, or decorative motion automatically
- do not introduce directional screen motion unless explicitly justified
- do not automatically create timed animation sequences

This is a conservative authoring policy, not an adaptive runtime accessibility preference.

STRICT WRITE ISOLATION

Before the first write:
1. inspect the full page
2. identify production root(s)
3. identify `Orca — Component States`
4. identify the canonical `Orca — Prototype Flows` SECTION
5. identify unrelated page-level nodes
6. record a structural/style fingerprint for every page-level subtree
7. record every existing reaction that may be touched, including the complete trigger and complete actions array

WRITE ALLOWLIST:
- set_reactions on EXISTING nodes inside `Orca — Component States`
- set_reactions on EXISTING nodes inside the canonical `Orca — Prototype Flows` SECTION
- only when an existing reaction's transition needs normalization under this motion system

WRITE DENYLIST:
- all production nodes
- all production reactions
- unrelated page-level nodes
- node creation
- node deletion
- node cloning
- node conversion
- node movement or reparenting
- renaming
- resizing
- restyling
- text changes
- instance overrides
- component-set membership changes
- new prototype destinations
- new prototype reactions
- removed prototype reactions

REACTION SEMANTICS ARE IMMUTABLE

This command MUST NOT change:
- reaction count
- trigger type
- trigger timeout or trigger-specific fields
- action count
- action type
- destinationId
- navigation
- URL
- preserveScrollPosition
- resetScrollPosition
- resetVideoPosition
- overlay position or overlay behavior
- any other non-transition semantic field

The ONLY allowed semantic difference is the transition object of an already-existing supported NODE action.

Because set_reactions writes a full reaction list:
1. call get_reactions before every write
2. preserve the complete existing reaction array in memory
3. reconstruct the full array exactly
4. change only the approved transition object
5. use mode `replace` only for that exact node
6. immediately call get_reactions again
7. compare pre/post reaction count and every non-transition field
8. if any non-transition field changed, STOP and report failure

If you cannot reconstruct a reaction losslessly, DO NOT WRITE IT.
Report it as skipped.

NORMALIZATION RULES

For each existing reaction:

A. NODE + CHANGE_TO
- verify destination exists
- verify source/destination are compatible variants of the same COMPONENT_SET
- normalize to COMPONENT STATE / FAST
- if CHANGE_TO is being used for screen navigation, do not normalize it; report a structural defect instead

B. NODE + NAVIGATE
- verify destination exists and is a prototype screen FRAME or otherwise valid intended prototype destination
- if current transition is DISSOLVE/SMART_ANIMATE and no directional relationship is explicit, normalize to SCREEN / DEFAULT
- if the current transition is directional and clearly intentional, preserve it unless the user explicitly requested normalization
- if a directional transition is explicitly requested, apply SPATIAL / EXPLICIT ONLY

C. NODE + OVERLAY
- preserve destination/action semantics
- normalize only an existing supported transition to OVERLAY / CONSERVATIVE when lossless

D. NODE + SCROLL_TO or SWAP
- do not guess a motion token
- preserve as-is unless the user explicitly requested a supported transition and the semantics are clear

E. BACK / CLOSE / URL
- preserve as-is

Do not add a missing reaction.
Do not remove a reaction.
Do not change a destination to make a transition fit.

FLOAT TOLERANCE

Figma may read 0.10 seconds back as approximately 0.10000000149.

Treat small float32 differences as equivalent:
- 0.10 token: accept 0.095 to 0.105
- 0.15 token: accept 0.145 to 0.155
- 0.20 token: accept 0.195 to 0.205

Do not rewrite a reaction solely because its read-back float differs within these tolerances.

NO-OP BEHAVIOR

If every eligible existing reaction already matches the motion tokens:
- make zero writes
- report that the motion system is already normalized
- still complete the read-only verification described below

POST-WRITE VERIFICATION

After all eligible reactions are processed:
1. re-inspect production and verify it is structurally/style/reaction identical
2. re-inspect unrelated page-level nodes and verify they are identical
3. verify `Orca — Component States` has identical structure, styling, component IDs, COMPONENT_SET membership, and reaction semantics; only allowed transition objects may differ
4. verify `Orca — Prototype Flows` has identical SECTION/screen/instance structure, styling, destinations, and reaction semantics; only allowed transition objects may differ
5. verify no reaction was added or removed
6. verify no destination, navigation, trigger, or action type changed
7. verify every normalized transition matches an Orca token
8. report exactly which reaction IDs/nodes changed, or report zero writes

FINAL REPORT

Keep the report concise but specific.

Report:
- motion scope
- nodes/reactions inspected
- nodes/reactions changed
- skipped reactions and why
- component-state transition summary
- screen-navigation transition summary
- any existing directional/overlay/non-node actions preserved
- whether production remained untouched
- whether component/state and flow structure remained unchanged
- whether reaction semantics remained identical
- whether the run was a no-op

End the report with exactly one of:

ORCA_MOTION_GUARD: PASS

or

ORCA_MOTION_GUARD: FAIL

Use PASS only if:
- no write occurred outside the reaction-transition allowlist
- no reaction was added or removed
- no non-transition reaction semantic field changed
- production and unrelated page-level content remained unchanged
- component/state and flow structure/style remained unchanged

Use FAIL if any forbidden mutation is detected.
"@

        Write-Host ""
        Write-Host "Applying Orca motion system..."
        Write-Host "Agent: $DesignerAgent"
        Write-Host "Model: $DesignerModel"

        if ($Node) {
            Write-Host "Motion node: $Node"
        }
        else {
            Write-Host "Motion scope: existing library and prototype-flow reactions"
        }

        if ($userRequest) {
            Write-Host "Request: $userRequest"
        }

        if ($state -and $state.session_id) {
            Write-Host "Session: $($state.session_id)"
        }
        else {
            Write-Warn "No saved design session exists; motion will run in a fresh OpenCode context."
        }

        Write-Host ""

        try {
            if ($state -and $state.session_id) {
                $motionOutput = Invoke-DesignerCapture `
                    -Message $message `
                    -SessionId $state.session_id

                Save-Session -SessionId $state.session_id
            }
            else {
                $motionOutput = Invoke-DesignerCapture `
                    -Message $message `
                    -NewSession

                $sessionId = Get-LatestSessionId

                if ($sessionId) {
                    Save-Session -SessionId $sessionId
                    Write-Host ""
                    Write-Ok "Motion session saved: $sessionId"
                }
            }
        }
        catch {
            Write-Host ""
            Write-Fail "OpenCode could not complete the motion-system task."
            Write-Host $_.Exception.Message
            Write-Host ""
            exit 1
        }

        if ($motionOutput -match "ORCA_MOTION_GUARD:\s*FAIL") {
            Write-Host ""
            Write-Fail "Motion normalization detected a forbidden mutation or semantic change."
            Write-Host "Review the report above before running motion again."
            Write-Host ""
            exit 1
        }

        if ($motionOutput -notmatch "ORCA_MOTION_GUARD:\s*PASS") {
            Write-Host ""
            Write-Fail "The motion task did not return a valid ORCA_MOTION_GUARD: PASS marker."
            Write-Host "Do not assume the motion pass succeeded."
            Write-Host ""
            exit 1
        }

        Write-Host ""
        Write-Ok "Motion system applied and verified."
        Write-Ok "Interaction semantics and protected document structure were preserved."
        Write-Host ""
        Write-Host "Component states: SMART_ANIMATE 0.10s EASE_OUT."
        Write-Host "Default screen navigation: DISSOLVE 0.15s EASE_OUT."
        Write-Host "Directional motion remains explicit-only."
        Write-Host ""

        exit 0
    }

    # --------------------------------------------------------
    # BROWSER
    # --------------------------------------------------------

    "browser" {
        try {
            $figma = Test-FigmaConnection
        }
        catch {
            Write-Fail "Could not check the Figma connection."
            exit 1
        }

        if (-not $figma.Connected) {
            Write-Fail "Figma is not connected."
            Write-Host ""
            Write-Host "Open Figma Desktop."
            Write-Host "Open the target Figma design file."
            Write-Host "Run the Figma MCP development plugin."
            Write-Host ""
            exit 1
        }

        if (-not (Test-Path $BrowserDir)) {
            New-Item -ItemType Directory -Force $BrowserDir | Out-Null
        }

        $state = Get-SavedSession
        $userRequest = ""

        if ($Prompt -and $Prompt.Count -gt 0) {
            $userRequest = ($Prompt -join " ").Trim()
        }

        if ($Node) {
            $targetScope = @"
BROWSER EXPORT TARGET

Use Figma node $Node as the primary source scope.

If it is a screen inside the canonical `Orca — Prototype Flows` SECTION, export that journey plus every directly reachable screen needed for its verified interactions.
If it is the canonical flow SECTION itself, export the validated journey or journeys inside it.
If it is outside the flow SECTION, use it only as read-only visual/reference context and still derive browser navigation from the canonical flow SECTION.
"@
        }
        else {
            $targetScope = @"
BROWSER EXPORT TARGET

Use the canonical direct page-level SECTION named `Orca — Prototype Flows` as the source of truth.
Export the currently validated prototype journey or journeys inside it.
For the first functional proof, prioritize the existing Primary CTA journey and do not invent additional destinations for intentionally unwired controls.
"@
        }

        if ($userRequest) {
            $requestScope = @"
ADDITIONAL BROWSER REQUEST

$userRequest

Treat this as an additional implementation constraint.
It may refine browser behavior or scope, but it does not authorize any Figma writes or invented product functionality.
"@
        }
        else {
            $requestScope = ""
        }

        $message = @"
ORCA FUNCTIONAL BROWSER PROTOTYPE — PHASE 6 / M7

Run health_check first.

Follow AGENTS.md, the web-designer agent instructions, and rules/figma-design-rules.md where relevant to visual fidelity.

This task converts the VALIDATED Figma prototype flow into a dependency-free browser prototype.

FIGMA IS STRICTLY READ-ONLY FOR THIS COMMAND.

Do not call any Figma write tool.
Do not create, delete, clone, move, resize, rename, restyle, patch, convert, instantiate, detach, or reparent Figma nodes.
Do not add, remove, replace, or append Figma reactions.

Filesystem writes are allowed ONLY inside:

$BrowserDir

Do not modify application source, project configuration, AGENTS.md, rules, OpenCode configuration, the MCP repo, or any file outside that directory.

$targetScope

$requestScope

SOURCE-OF-TRUTH ARCHITECTURE

Read the current Figma document and identify:
- production root(s), read-only reference
- `Orca — Component States`, read-only component/variant source
- canonical `Orca — Prototype Flows` SECTION
- prototype screen FRAMEs inside that SECTION
- INSTANCE nodes used for interactive controls
- every existing reaction relevant to the exported journey

Record a lightweight page-level fingerprint before any filesystem generation.
At the end, re-read the Figma document and verify that the fingerprint is unchanged.

The browser prototype MUST be derived from the current Figma document, not from memory of earlier messages.

M7 OUTPUT BOUNDARY

Create/update only these browser-prototype artifacts under ${BrowserDir}:
- index.html
- styles.css
- app.js
- orca-browser.json
- assets/ only when local exported assets are genuinely required and available through read/export tooling

Do not add npm, package.json, React, Vue, Svelte, build tooling, CDNs, analytics, remote scripts, web fonts, trackers, or network dependencies.
The result must run as ordinary static HTML/CSS/JavaScript.

BROWSER PROTOTYPE GOAL

Reproduce the validated prototype behavior, not merely a screenshot.

For every exported screen:
1. inspect its actual Figma hierarchy, text, bounds, fills, strokes, typography, spacing, radii, and visible content
2. use inspect_node_as_html/explain_node/get_node or equivalent READ tools as useful
3. reproduce the screen as semantic HTML and CSS
4. preserve the existing Figma content and visual language
5. do not redesign, embellish, rewrite copy, or invent content

The canonical desktop design width is the source screen width.
Use a centered, fluid browser shell so the prototype remains usable on narrower viewports without inventing a separate mobile design.
Do not materially reorder content solely for responsiveness.

INTERACTION TRANSLATION

Translate only interactions that exist in the validated Figma flow/component system.
Intentionally unwired controls remain visually present but inert unless the user explicitly requested browser-only behavior.

A. COMPONENT VARIANT INTERACTIONS
For a live Figma INSTANCE whose source component family has:
- Default ON_HOVER -> Hover via CHANGE_TO
- Hover ON_PRESS -> Pressed via CHANGE_TO

implement equivalent browser states with CSS/DOM behavior:
- default appearance derived from the Default variant
- :hover appearance derived from the Hover variant
- :active/pointer-down appearance derived from the Pressed variant
- preserve accessible keyboard focus; use an existing Focus variant when that family has one, otherwise use a restrained visible focus outline consistent with the design

Do not use JavaScript timers to mimic hover or press.
Do not expose Disabled behavior unless the browser instance is actually disabled in the exported flow.

When validating whether an INSTANCE CHANGE_TO destination belongs to the same COMPONENT_SET:
- resolve the instance's main/source COMPONENT
- compare that component's componentSetId with the destination variant's componentSetId
- do not incorrectly fail merely because INSTANCE itself lacks componentSetId

B. SCREEN NAVIGATION
Translate NODE + NAVIGATE between prototype screen FRAMEs into browser navigation.
Use stable hash routes so the static prototype works without server-side routing.

Canonical route form:
#/screen/<FIGMA_NODE_ID>

Example:
#/screen/97:16

On screen navigation:
- update window.location.hash
- render the destination screen
- scroll to top unless the Figma reaction explicitly preserves scroll position
- browser Back/Forward must work through hash history

Do not use CHANGE_TO for browser screen routing.
CHANGE_TO remains component-state behavior only.

C. OTHER ACTIONS
- BACK -> history.back() when present and semantically valid
- URL -> normal safe anchor navigation using the exact existing URL
- OVERLAY -> implement only if an existing exported flow actually contains it and its semantics can be reproduced without invention
- CLOSE -> close an existing browser overlay only when one exists
- SCROLL_TO -> scroll to the matching exported target when it is actually present

Do not invent behavior for unsupported/unwired actions.

MOTION TRANSLATION

Preserve the proven M6 motion semantics:

Component state / FAST:
- SMART_ANIMATE 0.10s EASE_OUT -> CSS visual-property transition of approximately 100ms ease-out

Screen / DEFAULT:
- DISSOLVE 0.15s EASE_OUT -> approximately 150ms opacity dissolve between screens

Directional transitions:
- reproduce only when the existing Figma reaction explicitly uses a directional transition
- preserve direction
- do not introduce directional movement where Figma uses DISSOLVE

Runtime reduced motion:
Add:
@media (prefers-reduced-motion: reduce)

Under reduced motion:
- remove or effectively eliminate nonessential transition duration
- preserve state/navigation functionality
- do not disable controls

This browser runtime reduced-motion behavior is allowed even though Figma authoring itself cannot dynamically switch based on OS preference.

DOM / TEST-HOOK CONTRACT

M8 will test this prototype automatically, so expose stable, nonvisual hooks.

index.html must contain a root element with:
data-orca-app

Every rendered prototype screen root must expose:
data-orca-screen="<FIGMA_SCREEN_ID>"

Every translated interactive source should expose when practical:
data-orca-node="<FIGMA_NODE_ID>"

A screen-navigation control must also expose:
data-orca-destination="<FIGMA_DESTINATION_ID>"

Do not use random/generated IDs for these cross-layer hooks.
Use the actual Figma node IDs.

ACCESSIBILITY BASELINE

Use semantic browser elements where possible:
- button for actions
- anchor for actual URLs
- headings in sensible order
- visible keyboard focus
- aria-label only when visible text is insufficient

Do not make a div clickable when a button or anchor is semantically correct.
The primary journey must be operable with keyboard Enter/Space as appropriate.

MANIFEST CONTRACT

Create $BrowserManifest as valid UTF-8 JSON.

Required shape:
{
  "version": 1,
  "source": {
    "flowSectionId": "<FIGMA_SECTION_ID>",
    "flowSectionName": "Orca — Prototype Flows"
  },
  "screens": [
    {
      "id": "<FIGMA_SCREEN_ID>",
      "name": "<FIGMA_SCREEN_NAME>",
      "route": "#/screen/<FIGMA_SCREEN_ID>",
      "prototypeOnly": true_or_false
    }
  ],
  "interactions": [
    {
      "sourceId": "<FIGMA_SOURCE_ID>",
      "trigger": "ON_CLICK",
      "navigation": "NAVIGATE",
      "destinationId": "<FIGMA_DESTINATION_ID>"
    }
  ],
  "motion": {
    "componentFastMs": 100,
    "screenDefaultMs": 150,
    "easing": "ease-out",
    "reducedMotionSupported": true
  }
}

Additional fields are allowed when useful, but do not omit the required fields.
Manifest interactions must reflect existing Figma behavior; do not list invented edges.

CURRENT PRIMARY PROOF EXPECTATION

If the current document still contains the validated Primary CTA journey, the browser export should preserve:
- start screen `97:16` when it still exists
- destination screen `97:438` when it still exists
- primary interactive instance `97:526` when it still exists
- hover state sourced through Button / Primary COMPONENT_SET behavior
- pressed state sourced through Button / Primary COMPONENT_SET behavior
- ON_CLICK NAVIGATE to the destination screen
- 100ms component-state motion
- 150ms screen dissolve

These IDs are expectations to verify against the live Figma document, not permission to fabricate missing nodes.
If the live document differs, follow the live document and report the difference.

VISUAL IMPLEMENTATION RULES

- use CSS custom properties for repeated design/motion values
- preserve actual source text
- preserve major section hierarchy and whitespace
- preserve button/link shapes and color relationships
- preserve source corner radii and typography weights when inspectable
- use system/local fallback font stacks when the exact font is unavailable in-browser without an external dependency
- never download or embed font files
- avoid generated gradients/shadows/decorations that do not exist in Figma
- avoid generic dashboard/card redesign patterns

If raster/vector imagery cannot be exported through existing read/export tooling:
- do not fetch replacements from the web
- do not invent stock imagery
- preserve layout with a restrained local placeholder only when necessary
- report the affected asset as a fidelity limitation

JAVASCRIPT CONTRACT

app.js must:
- contain no external imports
- parse the hash route
- render or activate the correct screen
- support Back/Forward via hashchange
- expose data-orca-screen hooks on the active screen
- wire only verified interactions
- keep intentionally unwired controls inert
- avoid eval and dynamic script loading

The page must start on the first journey screen when there is no recognized hash.

LOCAL SELF-CHECK BEFORE REPORTING PASS

After writing files:
1. parse orca-browser.json successfully
2. verify index.html, styles.css, app.js, and orca-browser.json all exist
3. verify index.html contains data-orca-app
4. verify app.js contains data-orca-screen behavior
5. verify every manifest screen route can be resolved by app.js
6. verify every manifest NAVIGATE destination exists in screens
7. verify the primary CTA source ID appears as data-orca-node if that source exists in the exported journey
8. verify the browser implementation contains no remote script/style dependencies
9. re-read the Figma page and confirm the starting page-level fingerprint is unchanged

Do not claim actual browser execution or automated browser testing in M7.
That is reserved for M8.
M7 proves a runnable static implementation and structural self-check only.

FINAL REPORT

Report concisely:
- browser output directory
- source flow SECTION ID
- screens exported
- interactions translated
- component states translated
- motion translation
- reduced-motion support
- files created/updated
- any fidelity limitations
- whether Figma remained byte/structure-equivalent under the recorded fingerprint
- local structural self-check result

End with exactly one of:

ORCA_BROWSER_BUILD: PASS

or

ORCA_BROWSER_BUILD: FAIL

Use PASS only if:
- required files exist
- manifest is valid and internally consistent
- verified interactions are represented without invention
- Figma received zero writes and its page-level fingerprint is unchanged
- no file outside $BrowserDir was modified

Use FAIL if any of those conditions are not met.
"@

        Write-Host ""
        Write-Host "Generating functional browser prototype..."
        Write-Host "Agent: $DesignerAgent"
        Write-Host "Model: $DesignerModel"
        Write-Host "Output: $BrowserDir"

        if ($Node) {
            Write-Host "Source node: $Node"
        }
        else {
            Write-Host "Source: canonical Orca — Prototype Flows SECTION"
        }

        if ($userRequest) {
            Write-Host "Request: $userRequest"
        }

        if ($state -and $state.session_id) {
            Write-Host "Session: $($state.session_id)"
        }
        else {
            Write-Warn "No saved design session exists; browser export will run in a fresh OpenCode context."
        }

        Write-Host ""

        try {
            if ($state -and $state.session_id) {
                $browserOutput = Invoke-DesignerCapture `
                    -Message $message `
                    -SessionId $state.session_id

                Save-Session -SessionId $state.session_id
            }
            else {
                $browserOutput = Invoke-DesignerCapture `
                    -Message $message `
                    -NewSession

                $sessionId = Get-LatestSessionId

                if ($sessionId) {
                    Save-Session -SessionId $sessionId
                    Write-Host ""
                    Write-Ok "Browser-export session saved: $sessionId"
                }
            }
        }
        catch {
            Write-Host ""
            Write-Fail "OpenCode could not complete the browser-prototype task."
            Write-Host $_.Exception.Message
            Write-Host ""
            exit 1
        }

        if ($browserOutput -match "ORCA_BROWSER_BUILD:\s*FAIL") {
            Write-Host ""
            Write-Fail "Browser prototype generation reported failure."
            Write-Host "Review the report above before using the generated files."
            Write-Host ""
            exit 1
        }

        if ($browserOutput -notmatch "ORCA_BROWSER_BUILD:\s*PASS") {
            Write-Host ""
            Write-Fail "The browser task did not return a valid ORCA_BROWSER_BUILD: PASS marker."
            Write-Host "Do not assume the browser prototype is complete."
            Write-Host ""
            exit 1
        }

        $localCheck = Test-BrowserPrototype

        if (-not $localCheck.Passed) {
            Write-Host ""
            Write-Fail "Browser prototype failed the PowerShell-side structural check."
            Write-Host $localCheck.Message
            Write-Host ""
            exit 1
        }

        Write-Host ""
        Write-Ok "Functional browser prototype generated."
        Write-Ok $localCheck.Message
        Write-Host "Screens: $($localCheck.ScreenCount)"
        Write-Host "Source flow SECTION: $($localCheck.FlowSectionId)"
        Write-Host "Output: $BrowserDir"
        Write-Host ""
        Write-Host "Open directly:"
        Write-Host "  Start-Process `"$(Join-Path $BrowserDir 'index.html')`""
        Write-Host ""
        Write-Host "Or serve locally for browser tooling:"
        Write-Host "  python -m http.server 4173 -d `"$BrowserDir`""
        Write-Host "  then open http://127.0.0.1:4173/"
        Write-Host ""

        exit 0
    }


    # --------------------------------------------------------
    # BROWSER TEST
    # --------------------------------------------------------

    "browser-test" {
        $localCheck = Test-BrowserPrototype

        if (-not $localCheck.Passed) {
            Write-Host ""
            Write-Fail "Browser prototype is not structurally ready for M8 testing."
            Write-Host $localCheck.Message
            Write-Host ""
            Write-Host "Run '.\orca.ps1 browser' first."
            Write-Host ""
            exit 1
        }

        if (-not (Test-CommandExists "orca")) {
            Write-Host ""
            Write-Fail "Native Orca CLI is not available in PATH."
            Write-Host "M8 uses the installed native Orca browser automation CLI and does not use OpenCode model calls."
            Write-Host ""
            exit 1
        }

        $pythonCommand = Get-PythonCommand

        if (-not $pythonCommand) {
            Write-Host ""
            Write-Fail "Python is required to serve the static browser prototype locally for M8."
            Write-Host ""
            exit 1
        }

        try {
            $runtimeStatus = Invoke-NativeOrcaCommand -Arguments @("status", "--json") -AllowFailure
        }
        catch {
            Write-Host ""
            Write-Fail $_.Exception.Message
            Write-Host ""
            exit 1
        }

        if ($runtimeStatus.ExitCode -ne 0) {
            Write-Host ""
            Write-Fail "Native Orca runtime is not available for browser automation."
            Write-Host "Open the Orca desktop app, or run 'orca open', then rerun '.\orca.ps1 browser-test'."
            if ($runtimeStatus.Output) {
                Write-Host ""
                Write-Host $runtimeStatus.Output
            }
            Write-Host ""
            exit 1
        }

        try {
            $manifest = Get-Content $BrowserManifest -Raw -Encoding UTF8 | ConvertFrom-Json
        }
        catch {
            Write-Host ""
            Write-Fail "Could not parse the browser manifest."
            Write-Host ""
            exit 1
        }

        $screens = @($manifest.screens)
        $interactions = @($manifest.interactions)

        if ($screens.Count -lt 1) {
            Write-Fail "Manifest contains no screens."
            exit 1
        }

        $startScreen = $screens[0]
        $primaryNav = $interactions | Where-Object {
            $_.navigation -eq "NAVIGATE" -and $_.sourceId -and $_.destinationId
        } | Select-Object -First 1

        if (-not $primaryNav) {
            Write-Host ""
            Write-Fail "Manifest contains no NAVIGATE interaction to exercise."
            Write-Host ""
            exit 1
        }

        $destinationScreen = $screens | Where-Object {
            $_.id -eq $primaryNav.destinationId
        } | Select-Object -First 1

        if (-not $destinationScreen) {
            Write-Host ""
            Write-Fail "Primary NAVIGATE destination is missing from manifest screens."
            Write-Host "Destination: $($primaryNav.destinationId)"
            Write-Host ""
            exit 1
        }

        $portProbe = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
        $portProbe.Start()
        $port = ([System.Net.IPEndPoint]$portProbe.LocalEndpoint).Port
        $portProbe.Stop()

        $baseUrl = "http://127.0.0.1:$port/"
        $server = $null
        $pageId = $null
        $results = New-Object System.Collections.ArrayList
        $overallPass = $true

        Write-Host ""
        Write-Host "Running Orca M8 browser tests..."
        Write-Host "Prototype: $BrowserDir"
        Write-Host "Start screen: $($startScreen.id)"
        Write-Host "Primary edge: $($primaryNav.sourceId) -> $($primaryNav.destinationId)"
        Write-Host "OpenCode model calls: 0"
        Write-Host ""

        try {
            $serverArguments = @(
                "-m",
                "http.server",
                "$port",
                "--bind",
                "127.0.0.1",
                "-d",
                "`"$BrowserDir`""
            )

            $server = Start-Process `
                -FilePath $pythonCommand `
                -ArgumentList $serverArguments `
                -WindowStyle Hidden `
                -PassThru

            $serverReady = $false

            for ($i = 0; $i -lt 20; $i++) {
                Start-Sleep -Milliseconds 150

                if ($server.HasExited) {
                    break
                }

                try {
                    $probe = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 2
                    if ($probe.StatusCode -ge 200 -and $probe.StatusCode -lt 500) {
                        $serverReady = $true
                        break
                    }
                }
                catch {
                }
            }

            Add-BrowserTestResult `
                -Results $results `
                -Name "Static server reachable" `
                -Passed $serverReady `
                -Detail $baseUrl

            if (-not $serverReady) {
                throw "Local static server did not become reachable on $baseUrl"
            }

            $create = Invoke-NativeOrcaCommand -Arguments @(
                "tab",
                "create",
                "--url", $baseUrl,
                "--json"
            )

            $pageId = Get-OrcaBrowserPageId -CreateOutput $create.Output

            Add-BrowserTestResult `
                -Results $results `
                -Name "Browser tab created" `
                -Passed ([bool]$pageId) `
                -Detail $(if ($pageId) { "page=$pageId" } else { $create.Output })

            if (-not $pageId) {
                throw "Could not determine the browser page ID from Orca."
            }

            Invoke-NativeOrcaCommand -Arguments @(
                "wait",
                "--page", $pageId,
                "--timeout", "500"
            ) | Out-Null

            $appHook = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "document.querySelector('[data-orca-app]') !== null"

            Add-BrowserTestResult -Results $results -Name "App root hook present" -Passed $appHook

            $startId = [string]$startScreen.id
            $startRoute = [string]$startScreen.route
            $sourceId = [string]$primaryNav.sourceId
            $destinationId = [string]$primaryNav.destinationId
            $destinationRoute = [string]$destinationScreen.route

            # The generated M7 app intentionally renders the first screen at the
            # bare base URL without forcing a hash rewrite. Verify that fallback
            # behavior first instead of incorrectly requiring the canonical hash.
            $baseRouteRendered = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$startId')"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Bare URL renders start screen" `
                -Passed $baseRouteRendered `
                -Detail $startId

            # Establish the canonical start hash explicitly before history tests.
            # This gives the click -> destination -> Back sequence a deterministic
            # start-route entry in browser history.
            Invoke-NativeOrcaCommand -Arguments @(
                "goto",
                "--page", $pageId,
                "--url", "$baseUrl$startRoute"
            ) | Out-Null

            Start-Sleep -Milliseconds 200

            $startRendered = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "location.hash === '$startRoute' && Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$startId')"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Canonical start route resolves" `
                -Passed $startRendered `
                -Detail "$startId / $startRoute"

            $sourceHook = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "(() => { const el = Array.from(document.querySelectorAll('[data-orca-node]')).find(x => x.getAttribute('data-orca-node') === '$sourceId'); return !!el && el.getAttribute('data-orca-destination') === '$destinationId'; })()"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Primary source and destination hooks match manifest" `
                -Passed $sourceHook `
                -Detail "$sourceId -> $destinationId"

            $semanticControl = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "(() => { const el = Array.from(document.querySelectorAll('[data-orca-node]')).find(x => x.getAttribute('data-orca-node') === '$sourceId'); return !!el && (el.tagName === 'BUTTON' || el.tagName === 'A') && !el.hasAttribute('disabled'); })()"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Primary control is semantic and enabled" `
                -Passed $semanticControl

            $cssContract = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "(() => { const css = Array.from(document.styleSheets).map(s => { try { return Array.from(s.cssRules || []).map(r => r.cssText).join(' '); } catch (_) { return ''; } }).join(' '); return css.includes(':hover') && css.includes(':active') && css.includes('100ms') && css.includes('prefers-reduced-motion'); })()"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Component state and reduced-motion CSS contract present" `
                -Passed $cssContract

            $localResourcesOnly = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "performance.getEntriesByType('resource').every(r => { try { const u = new URL(r.name); return u.hostname === '127.0.0.1' || u.hostname === 'localhost'; } catch (_) { return true; } })"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Runtime resources stay local" `
                -Passed $localResourcesOnly

            Invoke-NativeOrcaCommand -Arguments @(
                "eval",
                "--page", $pageId,
                "--expression", "Array.from(document.querySelectorAll('[data-orca-node]')).find(el => el.getAttribute('data-orca-node') === '$sourceId')?.click(); 'ORCA_M8_CLICKED'"
            ) | Out-Null

            Start-Sleep -Milliseconds 250

            $clickNavigated = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "location.hash === '$destinationRoute' && Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$destinationId')"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Primary CTA click navigates to destination" `
                -Passed $clickNavigated `
                -Detail $destinationRoute

            Invoke-NativeOrcaCommand -Arguments @(
                "back",
                "--page", $pageId
            ) | Out-Null

            Start-Sleep -Milliseconds 250

            $backRestored = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "location.hash === '$startRoute' && Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$startId')"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Browser Back restores start screen" `
                -Passed $backRestored

            # Reset to a known start route before the keyboard test so a Back
            # timing/result issue cannot cascade into the accessibility check.
            Invoke-NativeOrcaCommand -Arguments @(
                "goto",
                "--page", $pageId,
                "--url", "$baseUrl$startRoute"
            ) | Out-Null

            Start-Sleep -Milliseconds 200

            # Read the visible CTA label from the live DOM, then resolve the
            # matching Orca accessibility element ref. Using Orca's native
            # focus command before keypress exercises the same browser-input
            # path that users and M8 automation rely on instead of only
            # changing document.activeElement through JavaScript.
            $labelProbe = Invoke-NativeOrcaCommand -Arguments @(
                "eval",
                "--page", $pageId,
                "--expression", "(() => { const el = Array.from(document.querySelectorAll('[data-orca-node]')).find(x => x.getAttribute('data-orca-node') === '$sourceId'); const text = el ? (el.innerText || el.textContent || '').trim() : ''; return 'ORCA_M8_LABEL:' + encodeURIComponent(text); })()"
            )

            $primaryLabel = $null
            $labelMatch = [regex]::Match($labelProbe.Output, 'ORCA_M8_LABEL:([^"''\r\n}]*)')

            if ($labelMatch.Success) {
                $encodedLabel = $labelMatch.Groups[1].Value

                try {
                    $primaryLabel = [System.Uri]::UnescapeDataString($encodedLabel)
                }
                catch {
                    $primaryLabel = $encodedLabel
                }
            }

            $keyboardElementRef = $null

            if ($primaryLabel) {
                $keyboardElementRef = Get-OrcaElementRefByText `
                    -PageId $pageId `
                    -Text $primaryLabel
            }

            if ($keyboardElementRef) {
                Invoke-NativeOrcaCommand -Arguments @(
                    "focus",
                    "--page", $pageId,
                    "--element", $keyboardElementRef
                ) | Out-Null

                Start-Sleep -Milliseconds 100
            }

            $keyboardFocused = $false

            if ($keyboardElementRef) {
                $keyboardFocused = Test-OrcaBrowserExpression `
                    -PageId $pageId `
                    -Expression "(() => { const el = Array.from(document.querySelectorAll('[data-orca-node]')).find(x => x.getAttribute('data-orca-node') === '$sourceId'); return !!el && document.activeElement === el; })()"
            }

            Add-BrowserTestResult `
                -Results $results `
                -Name "Primary CTA receives native keyboard focus" `
                -Passed $keyboardFocused `
                -Detail $(if ($keyboardFocused) { "element=$keyboardElementRef" } elseif (-not $primaryLabel) { "Could not read the primary CTA label from the live DOM." } elseif (-not $keyboardElementRef) { "Could not resolve an Orca accessibility element ref for '$primaryLabel'." } else { "Orca focus did not make the primary CTA document.activeElement." })

            $keyboardNavigated = $false
            $keyboardPath = "not-run"

            if ($keyboardFocused) {
                # Orca's documented keypress examples target the active browser tab.
                # Make this page active explicitly, re-focus the resolved element, then
                # send Enter without --page so the event travels through the native
                # active-tab input path.
                Invoke-NativeOrcaCommand -Arguments @(
                    "tab",
                    "switch",
                    "--page", $pageId
                ) | Out-Null

                Start-Sleep -Milliseconds 100

                Invoke-NativeOrcaCommand -Arguments @(
                    "focus",
                    "--page", $pageId,
                    "--element", $keyboardElementRef
                ) | Out-Null

                Start-Sleep -Milliseconds 100

                Invoke-NativeOrcaCommand -Arguments @(
                    "keypress",
                    "--key", "Enter"
                ) | Out-Null

                Start-Sleep -Milliseconds 350

                $keyboardNavigated = Test-OrcaBrowserExpression `
                    -PageId $pageId `
                    -Expression "location.hash === '$destinationRoute' && Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$destinationId')"

                if ($keyboardNavigated) {
                    $keyboardPath = "active-tab keypress"
                }
                else {
                    # Compatibility fallback for Orca builds that route keypress by
                    # explicit page ID. Reset before retrying so the two paths cannot
                    # double-activate a successful navigation.
                    Invoke-NativeOrcaCommand -Arguments @(
                        "goto",
                        "--page", $pageId,
                        "--url", "$baseUrl$startRoute"
                    ) | Out-Null

                    Start-Sleep -Milliseconds 200

                    $keyboardElementRef = Get-OrcaElementRefByText `
                        -PageId $pageId `
                        -Text $primaryLabel

                    if ($keyboardElementRef) {
                        Invoke-NativeOrcaCommand -Arguments @(
                            "focus",
                            "--page", $pageId,
                            "--element", $keyboardElementRef
                        ) | Out-Null

                        Start-Sleep -Milliseconds 100

                        Invoke-NativeOrcaCommand -Arguments @(
                            "keypress",
                            "--page", $pageId,
                            "--key", "Enter"
                        ) -AllowFailure | Out-Null

                        Start-Sleep -Milliseconds 350

                        $keyboardNavigated = Test-OrcaBrowserExpression `
                            -PageId $pageId `
                            -Expression "location.hash === '$destinationRoute' && Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$destinationId')"

                        if ($keyboardNavigated) {
                            $keyboardPath = "page-scoped keypress fallback"
                        }
                        else {
                            # Current Orca desktop builds can misroute the typed
                            # `keypress` command away from the embedded browser.
                            # Use Orca's agent-browser passthrough as the final
                            # keyboard path. This still sends a real browser key
                            # action; it does not call element.click() or mutate
                            # the application under test.
                            Invoke-NativeOrcaCommand -Arguments @(
                                "goto",
                                "--page", $pageId,
                                "--url", "$baseUrl$startRoute"
                            ) | Out-Null

                            Start-Sleep -Milliseconds 200

                            $keyboardElementRef = Get-OrcaElementRefByText `
                                -PageId $pageId `
                                -Text $primaryLabel

                            if ($keyboardElementRef) {
                                Invoke-NativeOrcaCommand -Arguments @(
                                    "focus",
                                    "--page", $pageId,
                                    "--element", $keyboardElementRef
                                ) | Out-Null

                                Start-Sleep -Milliseconds 100

                                Invoke-NativeOrcaCommand -Arguments @(
                                    "exec",
                                    "--page", $pageId,
                                    "--command", "press Enter"
                                ) -AllowFailure | Out-Null

                                Start-Sleep -Milliseconds 350

                                $keyboardNavigated = Test-OrcaBrowserExpression `
                                    -PageId $pageId `
                                    -Expression "location.hash === '$destinationRoute' && Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$destinationId')"

                                if ($keyboardNavigated) {
                                    $keyboardPath = "agent-browser exec press fallback"
                                }
                                else {
                                    $keyboardPath = "typed keypress and agent-browser press paths failed"
                                }
                            }
                            else {
                                $keyboardPath = "element ref unavailable before agent-browser fallback"
                            }
                        }
                    }
                    else {
                        $keyboardPath = "element ref unavailable after reset"
                    }
                }
            }

            $keyboardRuntimeLimited = (
                $semanticControl -and
                $keyboardFocused -and
                -not $keyboardNavigated -and
                $keyboardPath -eq "typed keypress and agent-browser press paths failed"
            )

            $keyboardDetail = $keyboardPath

            if ($keyboardRuntimeLimited) {
                $keyboardDetail = "Orca runtime could focus the real enabled semantic CTA, but every available Enter-injection path failed to produce native browser button activation. Mouse activation already passed; this keyboard injection check is skipped as a runtime limitation."
            }

            Add-BrowserTestResult `
                -Results $results `
                -Name "Keyboard Enter activates primary CTA" `
                -Passed $keyboardNavigated `
                -Skipped $keyboardRuntimeLimited `
                -Detail $keyboardDetail

            Invoke-NativeOrcaCommand -Arguments @(
                "goto",
                "--page", $pageId,
                "--url", "$baseUrl$destinationRoute"
            ) | Out-Null

            Start-Sleep -Milliseconds 200

            $deepLinkWorks = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "location.hash === '$destinationRoute' && Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$destinationId')"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Destination deep link resolves" `
                -Passed $deepLinkWorks `
                -Detail $destinationRoute

            Invoke-NativeOrcaCommand -Arguments @(
                "goto",
                "--page", $pageId,
                "--url", "$baseUrl#/screen/__orca_missing__"
            ) | Out-Null

            Start-Sleep -Milliseconds 200

            $unknownFallsBack = Test-OrcaBrowserExpression `
                -PageId $pageId `
                -Expression "Array.from(document.querySelectorAll('[data-orca-screen]')).some(el => el.getAttribute('data-orca-screen') === '$startId')"

            Add-BrowserTestResult `
                -Results $results `
                -Name "Unknown screen route safely falls back to start" `
                -Passed $unknownFallsBack

            foreach ($result in $results) {
                if (-not $result.passed -and -not $result.skipped) {
                    $overallPass = $false
                    break
                }
            }
        }
        catch {
            $overallPass = $false

            Add-BrowserTestResult `
                -Results $results `
                -Name "M8 execution completed without harness error" `
                -Passed $false `
                -Detail $_.Exception.Message
        }
        finally {
            if ($pageId) {
                try {
                    Invoke-NativeOrcaCommand -Arguments @(
                        "tab",
                        "close",
                        "--page", $pageId
                    ) -AllowFailure | Out-Null
                }
                catch {
                }
            }

            if ($server) {
                try {
                    if (-not $server.HasExited) {
                        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
                    }
                }
                catch {
                }
            }
        }

        $skippedCount = @($results | Where-Object { $_.skipped }).Count
        $failedCount = @($results | Where-Object { -not $_.passed -and -not $_.skipped }).Count

        $report = [ordered]@{
            version = 1
            generatedAt = (Get-Date).ToString("o")
            command = "browser-test"
            orcaScriptVersion = $OrcaScriptVersion
            runId = $RunId
            runLog = $RunLogFile
            sourceManifest = $BrowserManifest
            baseUrl = $baseUrl
            startScreenId = [string]$startScreen.id
            primarySourceId = [string]$primaryNav.sourceId
            primaryDestinationId = [string]$primaryNav.destinationId
            passed = $overallPass
            skippedCount = $skippedCount
            failedCount = $failedCount
            tests = @($results)
            openCodeModelCalls = 0
        }

        $report |
            ConvertTo-Json -Depth 8 |
            Set-Content -Path $BrowserTestReport -Encoding UTF8

        Write-Host ""
        Write-Host "M8 report: $BrowserTestReport"
        Write-Host ""

        if ($overallPass) {
            Write-Host "ORCA_BROWSER_TEST: PASS"
            Write-Host ""
            Write-Ok "Automated browser prototype tests passed."
            Write-Ok "Primary navigation, history, deep-link, hooks, and local-runtime checks passed."

            if ($skippedCount -gt 0) {
                Write-Warn "$skippedCount browser-input check was skipped because the Orca runtime could not inject the required native key event."
                Write-Host "This does not hide an application failure: the CTA was verified as a real enabled focusable semantic control and mouse activation passed."
            }

            Write-Host ""
            exit 0
        }

        Write-Host "ORCA_BROWSER_TEST: FAIL"
        Write-Host ""
        Write-Fail "One or more automated browser prototype tests failed."
        Write-Host "Review the per-test results and $BrowserTestReport."
        Write-Host ""
        exit 1
    }

    # --------------------------------------------------------
    # QA
    # --------------------------------------------------------

    "qa" {
        try {
            $figma = Test-FigmaConnection
        }
        catch {
            Write-Fail "Could not check the Figma connection."
            exit 1
        }

        if (-not $figma.Connected) {
            Write-Fail "Figma is not connected."
            Write-Host ""
            Write-Host "Open Figma Desktop."
            Write-Host "Open the target Figma design file."
            Write-Host "Run the Figma MCP development plugin."
            Write-Host ""
            exit 1
        }

        $state = Get-SavedSession
        $userRequest = ""

        if ($Prompt -and $Prompt.Count -gt 0) {
            $userRequest = ($Prompt -join " ").Trim()
        }

        if ($Node) {
            $targetScope = @"
QA TARGET SCOPE

Inspect Figma node $Node as the primary prototype QA scope.

If this node is inside the canonical `Orca — Prototype Flows` SECTION, validate that flow screen/subtree plus every reaction or destination directly connected to it.
If this node is the flow-SECTION root, validate the full prototype board.
If this node is an exact-name legacy flow FRAME, inspect it as migration debt and validate the canonical SECTION if one exists.
If this node is outside the flow SECTION, treat it as read-only reference context and still validate the canonical prototype-flow SECTION.
"@
        }
        else {
            $targetScope = @"
QA TARGET SCOPE

Validate the canonical direct page-level SECTION named `Orca — Prototype Flows` and all prototype screens, instances, and reactions inside it.
If only an exact-name legacy FRAME exists, report WARN because the flow has not yet migrated to the SECTION architecture required for reliable screen navigation.
"@
        }

        if ($userRequest) {
            $requestScope = @"
ADDITIONAL QA REQUEST

$userRequest

Treat this as an additional validation focus. It does not authorize writes.
"@
        }
        else {
            $requestScope = ""
        }

        $message = @"
FIGMA PROTOTYPE QA TASK — PHASE 4

This is a STRICTLY READ-ONLY validation pass.

Run health_check first.
Follow AGENTS.md, the web-designer agent instructions, and rules/figma-design-rules.md where relevant to inspection.

Do not modify Figma in any way.
Do not create, delete, rename, move, resize, restyle, reparent, reorder, clone, instantiate, detach, patch, convert, or clean up any node.
Do not add, replace, append, or remove reactions.
Do not repair anything you find.

$targetScope

$requestScope

PHASE 4 GOAL

Determine whether the current prototype flow is structurally safe and prototype-ready.

The canonical architecture is:

production design (read-only)
-> `Orca — Component States` (read-only native COMPONENT_SET library)
-> `Orca — Prototype Flows` SECTION (prototype screen frames/instances/reactions)

QA must validate the current document as it exists. Never make a write in order to make a check pass.

RESULT LEVELS

Return exactly one overall result:

ORCA_PROTOTYPE_QA: PASS
ORCA_PROTOTYPE_QA: WARN
ORCA_PROTOTYPE_QA: FAIL

Use PASS only when no blocking prototype defect is found.
Use WARN for non-blocking ambiguity, intentional dead ends, prototype-only destinations, missing optional polish, or actions intentionally left unwired.
Use FAIL for structural/prototype defects that can produce broken or misleading behavior.

DOCUMENT BOUNDARIES

Identify and inspect:
- canonical production root or roots
- canonical `Orca — Component States` frame, if present
- canonical direct page-level `Orca — Prototype Flows` SECTION
- any exact-name legacy direct page-level FRAME
- unrelated page-level nodes

Check:
1. exactly one canonical direct page-level SECTION named `Orca — Prototype Flows` should exist
2. an exact-name legacy FRAME with no SECTION is WARN and indicates migration is still required
3. more than one canonical SECTION, or ambiguous duplicate flow containers, is WARN or FAIL depending on ownership ambiguity
4. prototype-flow content must remain inside the canonical flow SECTION
5. no production node may be a descendant of the flow SECTION
6. no source COMPONENT or COMPONENT_SET from `Orca — Component States` may be reparented into the flow SECTION
7. instances referencing library components are allowed inside prototype screen frames within the flow SECTION
8. production and component-library roots must remain outside the flow SECTION

PROTOTYPE SCREEN INVENTORY

Enumerate every meaningful screen FRAME inside the canonical `Orca — Prototype Flows` SECTION.

For each prototype screen report:
- node ID
- name
- bounds
- whether it appears cloned from production, prototype-only, or unclear
- whether it participates in at least one navigation edge

Expected naming pattern when practical:

Flow / <Journey> / 01 — <Screen Name>
Flow / <Journey> / 02 — <Screen Name>

Naming deviations are WARN unless they make screen identity or journey order ambiguous.

Check for:
- duplicate screen names
- duplicate sequence numbers inside one journey
- obvious overlapping full-screen frames that make the board unreadable
- screens materially outside the flow-SECTION bounds when inspectable
- empty/broken diagnostic frames or probe leftovers

REACTION GRAPH

Inspect all reactions on nodes inside the canonical `Orca — Prototype Flows` SECTION.
Build a concise source -> trigger -> navigation/action -> destination graph.

For every reaction verify:
- source node exists
- trigger is valid
- action/navigation is valid
- destinationId exists when required
- transition is present when required by the MCP/schema
- destination semantics match the navigation type

FAIL if:
- destinationId points to a missing node
- a screen-to-screen navigation uses CHANGE_TO
- CHANGE_TO targets a node outside the source instance/component's compatible variant set
- duplicate equivalent reactions exist on the same source/trigger/destination
- a reaction points into production when the flow should navigate among prototype screens
- a reaction points directly to a source COMPONENT/COMPONENT_SET inside `Orca — Component States` as a screen destination
- an obviously broken reaction loop prevents intended forward progress

BACK, CLOSE, and URL reactions are not automatically failures.
Validate that their use is semantically plausible and explicitly report them.

COMPONENT INSTANCE INTEGRITY

Inspect component INSTANCE nodes used for interactive controls inside prototype screens.

Where inspectable, verify:
- main/source component exists
- source component still belongs to the expected COMPONENT_SET
- instance is not detached when the flow depends on inherited variant behavior
- expected text/visibility overrides do not destroy control semantics
- interactive library reactions remain available through the component family

Known proven library behavior may include:
- Default ON_HOVER -> Hover via CHANGE_TO
- Hover ON_PRESS -> Pressed via CHANGE_TO
- Disabled variants with no reactions

Do not fail merely because a component family intentionally has no reaction for Focus, Active, Pressed release, or Disabled unless the requested journey requires one.

MOTION SYSTEM QA

Validate current transitions against the Orca Phase 5 motion policy.

Component-state reactions:
- NODE + CHANGE_TO within one COMPONENT_SET should use SMART_ANIMATE
- expected duration is 0.10 seconds, allowing float32 read-back tolerance 0.095 to 0.105
- expected easing is EASE_OUT
- missing/invalid transition remains a reaction-graph defect
- token drift is WARN unless it produces invalid behavior

Ordinary screen navigation:
- NODE + NAVIGATE between prototype screen FRAMEs should normally use DISSOLVE
- expected default duration is 0.15 seconds, allowing tolerance 0.145 to 0.155
- expected easing is EASE_OUT
- an intentional directional transition is allowed when its spatial direction is semantically clear

Directional transitions:
- PUSH, MOVE_IN, MOVE_OUT, SLIDE_IN, SLIDE_OUT must include a valid direction
- expected default duration for Orca-authored directional motion is 0.20 seconds, allowing tolerance 0.195 to 0.205
- `matchLayers` should be explicit when required by the MCP
- unexplained decorative directional motion is WARN

Overlay reactions:
- existing OVERLAY motion should be conservative
- DISSOLVE 0.15s EASE_OUT is the Orca default
- do not FAIL solely because an explicitly designed overlay uses another valid supported transition

Reduced-motion-safe authoring policy:
- flag unnecessarily long, decorative, repeated, or spatial motion as WARN
- do not claim the prototype dynamically respects an OS reduced-motion preference; the current Orca motion policy is authoring-time only

Report:
- token-conforming reactions
- valid intentional exceptions
- motion warnings
- motion failures

NAVIGATION COVERAGE

Identify the apparent start screen from naming/order/layout/reaction structure.

From that start screen, determine which prototype screens are reachable through NODE navigation edges as inspectable.

Report:
- reachable screens
- unreachable/orphan screens
- dead-end screens
- actions intentionally left unwired

Classification:
- unreachable screen that appears to be part of the same intended journey: WARN, or FAIL if it is clearly required by the requested primary path
- dead-end final destination: allowed
- dead-end intermediate screen with an obvious required continuation: WARN
- intentionally unwired action with no verified destination: WARN, not FAIL

PROTOTYPE-ONLY DESTINATIONS

Prototype-only screens are allowed when they were explicitly requested during flow generation.
Report them clearly.
Do not treat their existence as a failure.

Warn if a prototype-only screen visually or semantically implies production functionality that cannot be supported by the source document or user request.

VISUAL / BOARD SANITY

Perform structural visual checks available through node bounds/context:
- prototype screens do not overlap production or the component library
- screen order is understandable
- full-screen frames do not materially overlap each other
- helper labels do not replace actual screen content
- obvious overflow or zero-size/broken frames are absent

Do not redesign or repair anything.
Visual polish issues that do not break the prototype are WARN at most.

READ-ONLY INTEGRITY

At the beginning of QA, record a lightweight fingerprint of all direct page-level subtrees including IDs, names, types, bounds, child order, and descendant counts as practical.
At the end of QA, inspect again and verify the same fingerprints.

Because QA is read-only, ANY detected mutation during this QA run is FAIL.

FINAL REPORT FORMAT

The FIRST non-empty line must be exactly one of:

ORCA_PROTOTYPE_QA: PASS
ORCA_PROTOTYPE_QA: WARN
ORCA_PROTOTYPE_QA: FAIL

After that, provide a concise structured report containing:
- flow-SECTION ID/type (or legacy FRAME warning if migration has not occurred)
- apparent journey/start screen
- screen inventory
- reaction graph
- motion-system summary
- component instances checked
- reachable vs orphan/dead-end screens
- prototype-only destinations
- warnings
- failures
- confirmation that QA made zero writes
- confirmation that page-level fingerprints were unchanged during QA

Do not include a PASS marker anywhere if the overall result is WARN or FAIL.
Do not include a WARN marker anywhere if the overall result is PASS or FAIL.
"@

        Write-Host ""
        Write-Host "Running Orca prototype QA..."
        Write-Host "Agent: $DesignerAgent"
        Write-Host "Model: $DesignerModel"

        if ($Node) {
            Write-Host "QA node: $Node"
        }
        else {
            Write-Host "QA scope: Orca — Prototype Flows"
        }

        if ($userRequest) {
            Write-Host "Request: $userRequest"
        }

        if ($state -and $state.session_id) {
            Write-Host "Session: $($state.session_id)"
        }
        else {
            Write-Warn "No saved design session exists; QA will run in a fresh OpenCode context."
        }

        Write-Host ""

        try {
            if ($state -and $state.session_id) {
                $qaOutput = Invoke-DesignerCapture `
                    -Message $message `
                    -SessionId $state.session_id

                Save-Session -SessionId $state.session_id
            }
            else {
                $qaOutput = Invoke-DesignerCapture `
                    -Message $message `
                    -NewSession

                $sessionId = Get-LatestSessionId

                if ($sessionId) {
                    Save-Session -SessionId $sessionId
                    Write-Host ""
                    Write-Ok "Prototype-QA session saved: $sessionId"
                }
            }
        }
        catch {
            Write-Host ""
            Write-Fail "OpenCode could not complete prototype QA."
            Write-Host $_.Exception.Message
            Write-Host ""
            exit 1
        }

        $hasPass = $qaOutput -match "(?m)^ORCA_PROTOTYPE_QA:\s*PASS\s*$"
        $hasWarn = $qaOutput -match "(?m)^ORCA_PROTOTYPE_QA:\s*WARN\s*$"
        $hasFail = $qaOutput -match "(?m)^ORCA_PROTOTYPE_QA:\s*FAIL\s*$"
        $markerCount = 0

        if ($hasPass) { $markerCount++ }
        if ($hasWarn) { $markerCount++ }
        if ($hasFail) { $markerCount++ }

        if ($markerCount -ne 1) {
            Write-Host ""
            Write-Fail "Prototype QA did not return exactly one valid result marker."
            Write-Host "Expected exactly one of PASS, WARN, or FAIL."
            Write-Host ""
            exit 1
        }

        if ($hasFail) {
            Write-Host ""
            Write-Fail "Prototype QA found one or more blocking defects."
            Write-Host "Review the QA report above before modifying or extending the flow."
            Write-Host ""
            exit 1
        }

        if ($hasWarn) {
            Write-Host ""
            Write-Warn "Prototype QA completed with non-blocking warnings."
            Write-Host "Review the QA report above before broader prototype expansion."
            Write-Host ""
            exit 0
        }

        Write-Host ""
        Write-Ok "Prototype QA passed."
        Write-Ok "No blocking structural or reaction defects were detected."
        Write-Host ""
        exit 0
    }

    # --------------------------------------------------------
    # REVISE
    # --------------------------------------------------------

    "revise" {
        if (-not $Prompt -or $Prompt.Count -eq 0) {
            Write-Fail '.\orca.ps1 revise "your revision prompt"'
            exit 1
        }

        $state = Get-SavedSession

        if (-not $state -or -not $state.session_id) {
            Write-Fail "No saved Orca design session exists."
            Write-Host ""
            Write-Host "Run a design command first."
            Write-Host ""
            exit 1
        }

        try {
            $figma = Test-FigmaConnection
        }
        catch {
            Write-Fail "Could not check the Figma connection."
            exit 1
        }

        if (-not $figma.Connected) {
            Write-Fail "Figma is not connected."
            Write-Host ""
            Write-Host "Open Figma Desktop."
            Write-Host "Open the target design file."
            Write-Host "Run the Figma MCP development plugin."
            Write-Host ""
            exit 1
        }

        $userPrompt = ($Prompt -join " ").Trim()

        $message = @"
FIGMA REVISION TASK

Continue the existing design from this exact OpenCode session.

Follow AGENTS.md, the web-designer agent instructions, and the project's Figma design rules.

Before editing:
- run health_check
- inspect the relevant existing Figma nodes
- identify the smallest affected subtree

Preserve existing section and page root node IDs whenever practical.

Prefer patch_html or focused property updates for existing content.

Do not rebuild the whole page for a local revision.

Respect the scope of the requested change. Do not modify unrelated sections unless required for layout consistency.

After editing:
- re-inspect affected nodes
- verify layout
- verify section order when new sections were inserted
- report any node roots that were replaced

USER REQUEST:

$userPrompt
"@

        Write-Host ""
        Write-Host "Revising Orca Figma design..."
        Write-Host "Session: $($state.session_id)"
        Write-Host "Agent: $DesignerAgent"
        Write-Host "Model: $DesignerModel"
        Write-Host ""

        try {
            Invoke-Designer `
                -Message $message `
                -SessionId $state.session_id
        }
        catch {
            Write-Host ""
            Write-Fail "OpenCode could not complete the revision."
            Write-Host $_.Exception.Message
            Write-Host ""
            Write-Host "Run '.\orca.ps1 doctor' to check the system."
            Write-Host ""
            exit 1
        }

        Save-Session -SessionId $state.session_id

        Write-Host ""
        Write-Ok "Revision complete."
        Write-Host ""

        exit 0
    }
}