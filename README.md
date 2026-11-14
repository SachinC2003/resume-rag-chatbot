# Resume Screening Dashboard

TalentDesk provides a public product landing page, company registration/login,
a hiring-event workspace, and event-scoped resume screening. The FastAPI backend
uses PostgreSQL for company/event data and JWT bearer authentication. ChromaDB
stores resume vectors with company and event metadata so each search is scoped
to the authenticated company's event.

The existing RAG parsing, chunking, embedding, query analysis/expansion, ranking,
and reranking behavior is preserved. The integration only adds company/event
identifiers to vector metadata and applies those identifiers as retrieval filters.
Previously indexed, unscoped resumes are not automatically assigned to a
company or event; upload them into the appropriate event to make them available
through the authenticated workspace.

## Run the API

1. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`,
   `DATABASE_ADMIN_URL`, a unique `JWT_SECRET_KEY`, and the existing
   `GROQ_API_KEY`. `DATABASE_ADMIN_URL` must connect to an existing maintenance
   database (usually `postgres`) with permission to create databases. The
   application role in `DATABASE_URL` must already exist and will own the new
   database. CORS origins can be set in `FRONTEND_ORIGINS`; the default is
   `http://localhost:3000,http://127.0.0.1:3000`.

From this directory:

```powershell
uv sync --project .\server
uv run --project .\server python -m uvicorn server.main:app --reload
```

To use pip instead of uv, install the backend dependencies from the `server`
directory with `pip install -r requirements.txt`. Then run `python main.py`
from that directory to start the API without auto-reload.

The RAG code is part of the backend under `server/rag`; no separate RAG server
process is needed. On startup, the API creates the application database if it
does not exist, then creates the `companies` and `events` tables. Once the
application database is reachable, the admin URL is not used. Resume files are
stored under `server/data`, and ChromaDB persists its vectors in the
repository-root `chroma_db` directory. Mount a Docker volume at the
application's `chroma_db` directory to persist vector data across deployments.
Visit
`http://localhost:8000/docs` for the API schema.

## Run the frontend

Create `frontend/.env.local` using `frontend/.env.example`, then run:

```powershell
cd .\frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Start at the public landing page, register a
company, create a hiring event, upload PDF resumes, and ask candidate questions.
The frontend API URL is configured with `NEXT_PUBLIC_API_URL`; database and
Groq credentials remain on the backend.
