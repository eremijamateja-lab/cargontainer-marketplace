"""Local-only dev launcher. Loads .env (python-dotenv) then starts uvicorn.

Not part of the frozen app itself - main.py's normal `uvicorn main:app` path
does NOT load .env automatically (only run_in_debug_mode() does, and only
under a debugger). This script exists so local dev doesn't need a debugger
or manual env-var exports. Run from app/backend/:

    python run_local.py                                  # .env (local SQLite), port 8000
    python run_local.py --env .env.supabase --port 8001  # shared Supabase project
"""
import argparse

from dotenv import load_dotenv

parser = argparse.ArgumentParser()
parser.add_argument("--env", default=".env", help="env file to load (default .env)")
parser.add_argument("--port", type=int, default=8000)
args = parser.parse_args()

load_dotenv(args.env)

import uvicorn  # noqa: E402  (must import after load_dotenv so settings see the env vars)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=args.port, reload=True, reload_excludes=["**/*.log"])
