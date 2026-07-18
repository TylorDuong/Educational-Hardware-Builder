[CmdletBinding()]
param(
  [string]$ComposeFile = "infra/docker-compose.yml",
  [string]$OllamaUrl = "http://localhost:11434",
  [switch]$SkipModelWarmup
)

$ErrorActionPreference = "Stop"

function Invoke-Compose {
  param([string[]]$Arguments)
  & docker compose -f $ComposeFile @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed: $($Arguments -join ' ')"
  }
}

Write-Host "Resetting demo tables and cited corpus..."
$truncate = "TRUNCATE TABLE checkpoint_answers, lessons, project_steps, projects, user_inventory, cad_assets, parts_catalog, users, embeddings RESTART IDENTITY CASCADE;"
$truncate | & docker compose -f $ComposeFile exec -T postgres psql -U hardware_builder -d hardware_builder -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Could not reset demo tables." }

Get-Content -Raw -LiteralPath "ingestion/demo_seed.sql" | & docker compose -f $ComposeFile exec -T postgres psql -U hardware_builder -d hardware_builder -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Could not load the deterministic demo inventory." }

& python ingestion/seed_weather_station.py --ollama-url $OllamaUrl
if ($LASTEXITCODE -ne 0) { throw "Could not seed cited weather-station guidance." }

if (-not $SkipModelWarmup) {
  Write-Host "Warming local models..."
  foreach ($model in @("llama3.2:3b", "llama3.1:8b", "qwen2.5-coder:7b", "nomic-embed-text")) {
    try {
      Invoke-Compose @("exec", "-T", "ollama", "ollama", "run", $model, "Respond with OK")
    } catch {
      Write-Warning "Model warmup failed for $model. Continue the demo with DEMO_SAFE_MODE enabled."
      break
    }
  }
}

Write-Host "Demo reset complete. Use DEMO_SAFE_MODE if model warmup was unavailable."
