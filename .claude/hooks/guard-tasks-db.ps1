$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

$data = $raw | ConvertFrom-Json
$toolInput = $data.tool_input

$targets = @(
    $toolInput.file_path,
    $toolInput.path,
    $toolInput.command
) -join " "

if ($targets -match '(?i)tasks\.db') {
    [Console]::Error.WriteLine("Blocked by guard-tasks-db hook: Direct edits or commands touching tasks.db are not allowed.")
    exit 2
}

exit 0