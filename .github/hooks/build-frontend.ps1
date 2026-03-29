$input = [Console]::In.ReadToEnd()
try {
    $data = $input | ConvertFrom-Json
} catch {
    exit 0
}

# Only run build after file-editing tools
$editTools = @('create_file', 'replace_string_in_file', 'multi_replace_string_in_file')
if ($data.tool_name -notin $editTools) { exit 0 }

# Only run build if the edited file is in frontend/src/
$filePath = ''
if ($data.tool_input.filePath) { $filePath = $data.tool_input.filePath }
elseif ($data.tool_input.replacements) {
    $filePath = $data.tool_input.replacements[0].filePath
}
if ($filePath -notmatch 'frontend[\\/]src[\\/]') { exit 0 }

# Run the build
Set-Location (Join-Path $data.cwd 'frontend')
$result = npm run build 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    $errMsg = ($result | Out-String).Trim()
    $output = @{
        hookSpecificOutput = @{
            hookEventName = 'PostToolUse'
            additionalContext = "BUILD FAILED — fix errors before continuing:`n$errMsg"
        }
    } | ConvertTo-Json -Depth 4
    Write-Output $output
    exit 2
}

exit 0
