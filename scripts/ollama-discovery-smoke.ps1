[CmdletBinding()]
param(
  [string]$ApiBaseUrl = "http://localhost:3000",
  [string]$OllamaUrl = "http://localhost:11434",
  [string]$CleanStartSeconds = $env:CLEAN_START_SECONDS
)

$ErrorActionPreference = "Stop"

# Windows PowerShell 5.1 does not load this assembly automatically, unlike
# PowerShell 7. Load it explicitly so the target works in both shells.
Add-Type -AssemblyName System.Net.Http

function Get-FirstTokenMilliseconds {
  param([string]$BaseUrl)

  $client = [System.Net.Http.HttpClient]::new()
  try {
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, "$($BaseUrl.TrimEnd('/'))/api/generate")
    $body = @{
      model = "llama3.2:3b"
      prompt = "Respond with exactly OK."
      stream = $true
      options = @{ temperature = 0 }
    } | ConvertTo-Json -Depth 4 -Compress
    $request.Content = [System.Net.Http.StringContent]::new($body, [System.Text.Encoding]::UTF8, "application/json")
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    $response.EnsureSuccessStatusCode() | Out-Null
    $reader = [System.IO.StreamReader]::new($response.Content.ReadAsStreamAsync().GetAwaiter().GetResult())
    do {
      $firstLine = $reader.ReadLine()
    } while ([string]::IsNullOrWhiteSpace($firstLine))
    $timer.Stop()
    $firstChunk = $firstLine | ConvertFrom-Json
    if ($null -eq $firstChunk.response) { throw "Ollama returned no generated token in its first stream chunk." }
    return [Math]::Round($timer.Elapsed.TotalMilliseconds, 1)
  } finally {
    if ($null -ne $reader) { $reader.Dispose() }
    if ($null -ne $response) { $response.Dispose() }
    $client.Dispose()
  }
}

$health = Invoke-RestMethod "$($ApiBaseUrl.TrimEnd('/'))/api/health"
if ($health.status -ne "ok") { throw "The web health check is not ready: $($health | ConvertTo-Json -Compress)" }

$firstTokenMs = Get-FirstTokenMilliseconds -BaseUrl $OllamaUrl

$retrievalTimer = [System.Diagnostics.Stopwatch]::StartNew()
$retrieval = Invoke-RestMethod -Method Post -ContentType "application/json" -Body (@{ query = "BME280 wiring" } | ConvertTo-Json -Compress) -Uri "$($ApiBaseUrl.TrimEnd('/'))/api/retrieve"
$retrievalTimer.Stop()
if (@($retrieval).Count -eq 0) { throw "The local retrieval smoke returned no cited results." }

$discoveryRequest = @{
  prompt = "Build a beginner USB desk light using my ESP32"
  mode = "beginner"
  userId = "40000000-0000-4000-8000-000000000001"
  inventoryPartIds = @("7e893f29-068e-43e2-9c3c-b9ba2d9ed6db")
  constraints = @("usb-power-only")
} | ConvertTo-Json -Compress
$discoveryTimer = [System.Diagnostics.Stopwatch]::StartNew()
$operation = Invoke-RestMethod -Method Post -ContentType "application/json" -Body $discoveryRequest -Uri "$($ApiBaseUrl.TrimEnd('/'))/api/discovery"
$discoveryTimer.Stop()
$completed = Invoke-RestMethod -Uri "$($ApiBaseUrl.TrimEnd('/'))/api/discovery/$($operation.operationId)"
if ($completed.status -ne "complete" -or $null -eq $completed.proposal) { throw "The live discovery smoke did not complete: $($completed | ConvertTo-Json -Depth 8 -Compress)" }

$cleanStart = $null
if (-not [string]::IsNullOrWhiteSpace($CleanStartSeconds)) {
  $parsed = 0.0
  if (-not [double]::TryParse($CleanStartSeconds, [ref]$parsed) -or $parsed -le 0) { throw "CLEAN_START_SECONDS must be a positive number." }
  $cleanStart = $parsed
}

[ordered]@{
  firstTokenMs = $firstTokenMs
  retrievalMs = [Math]::Round($retrievalTimer.Elapsed.TotalMilliseconds, 1)
  discoveryResponseMs = [Math]::Round($discoveryTimer.Elapsed.TotalMilliseconds, 1)
  cleanStartSeconds = $cleanStart
  operationId = $operation.operationId
  result = "live discovery completed"
} | ConvertTo-Json
