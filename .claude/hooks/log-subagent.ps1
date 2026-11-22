$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

$data = $raw | ConvertFrom-Json
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$event = if ($data.hook_event_name) { $data.hook_event_name } else { "UnknownEvent" }
$agent = if ($data.agent_type) { $data.agent_type } else { "UnknownAgent" }

$logPath = Join-Path $PSScriptRoot "subagent-audit.log"
Add-Content -Path $logPath -Value "[$timestamp] $event | agent=$agent"

exit 0