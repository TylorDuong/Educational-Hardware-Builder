.PHONY: smoke-ollama

smoke-ollama:
	powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\ollama-discovery-smoke.ps1
