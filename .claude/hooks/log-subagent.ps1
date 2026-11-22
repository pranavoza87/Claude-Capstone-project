$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

$data = $raw | ConvertFrom-Json
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$event = if ($data.hook_event_name) { $data.hook_event_name } else { "UnknownEvent" }

$agent = $null
foreach ($name in @('agent_type', 'subagent_type', 'agent_name')) {
    $v = $data.$name
    if (-not [string]::IsNullOrWhiteSpace($v)) { $agent = $v; break }
}
if (-not $agent) { $agent = "UnknownAgent" }

$logPath = Join-Path $PSScriptRoot "subagent-audit.log"
$agentId = if ($data.agent_id) { $data.agent_id } else { "n/a" }
Add-Content -Path $logPath -Value "[$timestamp] $event | agent=$agent | id=$agentId"

exit 0
