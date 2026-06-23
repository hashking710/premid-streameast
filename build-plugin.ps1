$ErrorActionPreference = 'Stop'
$repoRoot = 'h:\coding projects\repos\PreMiD StreamEast'
$activityDir = "$repoRoot\streameast-activity"
$zipPath = "$repoRoot\streameast-activity.zip"

# Compile TypeScript to JS
Write-Output "Building presence.ts..."
Push-Location $activityDir
npm run build
Pop-Location

# Remove old zip
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Output "Removed old zip"
}

# Create temporary staging directory
$stagingDir = "$repoRoot\.build-staging"
if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null

# Copy compiled output and static files
Copy-Item "$activityDir\dist\presence.js" "$stagingDir\" -Force
Copy-Item "$activityDir\metadata.json" "$stagingDir\" -Force

Write-Output "Staging files prepared"

# Create zip from staging
Compress-Archive -Path "$stagingDir\*" -DestinationPath $zipPath -Force
$size = (Get-Item $zipPath).Length / 1024
Write-Output "Created $zipPath ($('{0:F2}' -f $size) KB)"

# Cleanup
Remove-Item $stagingDir -Recurse -Force
Write-Output "Done"
