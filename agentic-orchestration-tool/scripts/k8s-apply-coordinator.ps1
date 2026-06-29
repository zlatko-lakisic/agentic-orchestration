# Apply coordinator Deployment + Service + RBAC (K3.7).
$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$CoordinatorDir = Join-Path $ToolRoot "deploy\k8s\coordinator"

kubectl apply -f (Join-Path $ToolRoot "deploy\k8s\base\namespace.yaml")
kubectl apply -k $CoordinatorDir
kubectl rollout status deployment/agentic-coordinator -n agentic-orchestration --timeout=180s
Write-Host "Coordinator ready. Port-forward: kubectl port-forward -n agentic-orchestration svc/agentic-coordinator 3847:3847"
