# Engineering Copilot - smoke test for the full stack.
# Run AFTER starting the 4 services (see START_HERE.md):
#   powershell -ExecutionPolicy Bypass -File .\check-services.ps1

$checks = @(
  @{ Name = "Qdrant                 "; Url = "http://localhost:6333/healthz"; Method = "GET" },
  @{ Name = "AI backend (FastAPI)    "; Url = "http://localhost:8000/health"; Method = "GET" },
  @{ Name = "AI RAG / Qdrant ready   "; Url = "http://localhost:8000/api/v1/rag/health"; Method = "GET" },
  @{ Name = "Backend (Spring Boot)   "; Url = "http://localhost:8081/api/auth/login"; Method = "POST" },
  @{ Name = "Frontend (Vite)         "; Url = "http://localhost:5173"; Method = "GET" }
)

Write-Host "`nEngineering Copilot - service health check`n" -ForegroundColor Cyan

foreach ($c in $checks) {
  try {
    $r = Invoke-WebRequest -Uri $c.Url -Method $c.Method -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host ("[ UP ]  {0} -> HTTP {1}" -f $c.Name, $r.StatusCode) -ForegroundColor Green
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code) {
      # A 4xx still means the service is reachable (e.g. login with no body -> 400).
      Write-Host ("[ UP ]  {0} -> HTTP {1} (reachable)" -f $c.Name, $code) -ForegroundColor Green
    } else {
      Write-Host ("[DOWN]  {0} -> not reachable" -f $c.Name) -ForegroundColor Red
    }
  }
}

Write-Host "`nTip: the AI RAG check must show collection_exists=true for the assistant to answer." -ForegroundColor DarkGray
Write-Host "Open http://localhost:8000/api/v1/rag/health to confirm.`n" -ForegroundColor DarkGray
