# SmartLoad Optimization API

## How to run

```bash
git clone https://github.com/manureja64/smartload-api.git
cd smartload-api
docker compose up --build
# → Service will be available at http://localhost:8080
```

## Health check

```bash
curl http://localhost:8080/healthz
```

## Example request

```bash
curl -X POST http://localhost:8080/api/v1/load-optimizer/optimize \
  -H "Content-Type: application/json" \
  -d @sample-request.json
```
