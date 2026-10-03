# NOTX API — Supabase Backend

FastAPI backend for NOTX SaaS.

## Architecture

- Frontend: React/Vite/PWA
- API: FastAPI
- Database: self-hosted Supabase PostgreSQL
- Identity: Supabase Auth JWT
- Reverse proxy: Nginx/Cloudflare Tunnel
- Firebase: temporary migration source only

The API owns authorization and business rules. The browser must not connect directly to PostgreSQL.

## Local development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

Open `/docs` for the OpenAPI contract.

## Production

Run behind your existing Cloudflare Tunnel/Nginx. Keep PostgreSQL private; expose only the API and Supabase services that genuinely need public access.
