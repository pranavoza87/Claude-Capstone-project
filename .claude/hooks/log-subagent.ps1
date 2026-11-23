$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

$data = $raw | ConvertFrom-Json
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$event = if ($data.hook_event_name) { $data.hook_event_name } else { "UnknownEvent" }

$agent = $null
foreach ($name in @('agent_type', 'agentType', 'subagent_type', 'subagentType', 'agent_name', 'agentName')) {
    $v = $data.$name
    if (-not [string]::IsNullOrWhiteSpace($v)) { $agent = $v; break }
}

$logPath = Join-Path $PSScriptRoot "subagent-audit.log"
$agentId = if ($data.agent_id) { $data.agent_id } elseif ($data.agentId) { $data.agentId } else { $null }

if (-not $agent -and $event -eq 'SubagentStop' -and $agentId) {
    if (Test-Path -LiteralPath $logPath) {
        $startPattern = '\] SubagentStart \| agent=(?<agent>.*?) \| id=' + [regex]::Escape($agentId) + '\s*$'
        $lines = @(Get-Content -LiteralPath $logPath)
        for ($i = $lines.Count - 1; $i -ge 0; $i--) {
            if ($lines[$i] -match $startPattern -and $Matches.agent -and $Matches.agent -ne 'UnknownAgent') {
                $agent = $Matches.agent
                break
            }
        }
    }
}

if (-not $agent) {
    $idForError = if ($agentId) { $agentId } else { 'not provided' }
    Write-Error "Cannot determine agent name for $event (id=$idForError); no name was provided and no matching SubagentStart entry exists."
    exit 1
}

if (-not $agentId) { $agentId = 'n/a' }
Add-Content -Path $logPath -Value "[$timestamp] $event | agent=$agent | id=$agentId"

exit 0
