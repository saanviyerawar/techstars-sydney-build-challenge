import json
import os
import subprocess
import sys
import threading
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

SERVER_DIR = Path(__file__).resolve().parent
REPO_DIR = SERVER_DIR.parent
CLIENT_DIST = REPO_DIR / "client" / "dist"
DEFAULT_SCRAPER_OUTPUT = REPO_DIR / "linkedin-scraper" / "output"
SCRAPER_PATH = REPO_DIR / "linkedin-scraper" / "main.py"
scrape_lock = threading.Lock()

load_dotenv(REPO_DIR / ".env")
load_dotenv(SERVER_DIR / ".env", override=True)


def text_contains(value, expected):
    return expected.casefold() in str(value or "").casefold()


class ScrapedProfileRepository:
    def __init__(self, output_dir):
        self.output_dir = Path(output_dir)

    def _profiles(self):
        latest = {}
        for path in self.output_dir.glob("profile_*.json"):
            try:
                profile = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue

            if not profile.get("name") or not (
                profile.get("experiences") or profile.get("educations")
            ):
                continue

            key = profile.get("source_url") or profile.get("linkedin_url") or path.stem
            current = latest.get(key)
            if current is None or path.stat().st_mtime > current[0]:
                latest[key] = (path.stat().st_mtime, profile)

        profiles = []
        for profile_id, (_, profile) in enumerate(
            sorted(latest.values(), key=lambda item: item[1]["name"].casefold()),
            start=1,
        ):
            normalized = dict(profile)
            normalized["id"] = profile_id
            normalized["linkedin_url"] = normalized.get(
                "linkedin_url"
            ) or normalized.get("source_url")
            normalized.setdefault("tags", [])
            profiles.append(normalized)
        return profiles

    def get_all(self):
        return self._profiles()

    def get_by_id(self, profile_id):
        return next(
            (profile for profile in self._profiles() if profile["id"] == profile_id),
            None,
        )

    def search(self, filters):
        profiles = self._profiles()
        text_filters = {
            "name": "name",
            "city": "city",
            "startup_name": "current_company",
        }
        exact_filters = {
            "gender": "gender",
            "migrant": "migrant",
            "founder_persona": "founder_persona",
            "curr_startup_industry": "curr_startup_industry",
            "curr_startup_funding_stage": "curr_startup_funding_stage",
        }

        for filter_name, field in text_filters.items():
            if filters.get(filter_name):
                profiles = [
                    profile
                    for profile in profiles
                    if text_contains(profile.get(field), filters[filter_name])
                ]
        for filter_name, field in exact_filters.items():
            if filters.get(filter_name) is not None:
                profiles = [
                    profile
                    for profile in profiles
                    if str(profile.get(field, "")).casefold()
                    == str(filters[filter_name]).casefold()
                ]
        for tag in filters.get("tags", []):
            profiles = [
                profile
                for profile in profiles
                if any(
                    str(profile_tag).casefold() == tag.casefold()
                    for profile_tag in profile.get("tags", [])
                )
            ]
        return profiles


def create_repository(app):
    if os.getenv("DB_BACKEND", "scraped").casefold() != "mysql":
        output_dir = os.getenv("SCRAPED_PROFILE_DIR", DEFAULT_SCRAPER_OUTPUT)
        app.logger.info("Using scraped profile data from %s", output_dir)
        return ScrapedProfileRepository(output_dir)

    from mysqlSchema import FounderProfileDB

    database = FounderProfileDB(app=app)

    class MySQLRepository:
        def get_all(self):
            return database.getAllFounders()

        def get_by_id(self, profile_id):
            return database.getFounderById(profile_id)

        def search(self, filters):
            return database.searchFounders(filters)

    return MySQLRepository()


app = Flask(__name__)
repository = create_repository(app)


@app.errorhandler(Exception)
def handle_exception(error):
    if isinstance(error, HTTPException):
        return jsonify({"error": error.description}), error.code
    app.logger.exception("Unhandled request error")
    return jsonify({"error": str(error)}), 500


@app.get("/api/search")
def search_founders():
    filters = {
        "name": request.args.get("name"),
        "city": request.args.get("city"),
        "startup_name": request.args.get("startup"),
        "gender": request.args.get("gender"),
        "migrant": request.args.get("migrant"),
        "founder_persona": request.args.get("founder_persona"),
        "curr_startup_industry": request.args.get("curr_startup_industry"),
        "curr_startup_funding_stage": request.args.get("curr_startup_funding_stage"),
        "tags": request.args.getlist("tags"),
    }
    filters = {
        key: value for key, value in filters.items() if value not in (None, "", [])
    }
    return jsonify(repository.search(filters) if filters else repository.get_all())


@app.get("/api/founders/<int:profile_id>")
def get_founder(profile_id):
    founder = repository.get_by_id(profile_id)
    if founder is None:
        return jsonify({"error": "Founder not found"}), 404
    return jsonify(founder)


def normalize_profile_url(value):
    parsed = urlparse(str(value or "").strip())
    host = (parsed.hostname or "").casefold()
    parts = [part for part in parsed.path.split("/") if part]
    if (
        parsed.scheme != "https"
        or host not in {"linkedin.com", "www.linkedin.com"}
        or len(parts) != 2
        or parts[0].casefold() != "in"
    ):
        return None
    return f"https://www.linkedin.com/in/{parts[1]}/"


@app.post("/api/scrape")
def scrape_founder():
    payload = request.get_json(silent=True) or {}
    profile_url = normalize_profile_url(payload.get("url"))
    if profile_url is None:
        return jsonify({"error": "Enter a valid LinkedIn profile URL."}), 400
    if not isinstance(repository, ScrapedProfileRepository):
        return jsonify(
            {"error": "Live scraping is available only in scraped-data mode."}
        ), 409
    if not scrape_lock.acquire(blocking=False):
        return jsonify({"error": "Another profile scrape is already running."}), 409

    try:
        result = subprocess.run(
            [
                sys.executable,
                str(SCRAPER_PATH),
                "--manual-login",
                "--login-timeout",
                "300",
                profile_url,
            ],
            cwd=REPO_DIR,
            capture_output=True,
            text=True,
            timeout=360,
            check=False,
        )
        if result.returncode != 0:
            app.logger.error("Profile scrape failed: %s", result.stderr.strip())
            return jsonify(
                {
                    "error": (
                        "LinkedIn did not return profile data. Confirm the profile "
                        "is visible to your signed-in account and try again."
                    )
                }
            ), 502

        founder = next(
            (
                profile
                for profile in repository.get_all()
                if profile.get("linkedin_url") == profile_url
            ),
            None,
        )
        if founder is None:
            return jsonify({"error": "The scraper produced no usable profile."}), 502
        return jsonify(founder), 201
    except subprocess.TimeoutExpired:
        return jsonify({"error": "The profile scrape timed out."}), 504
    finally:
        scrape_lock.release()


@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def serve_frontend(path):
    requested = CLIENT_DIST / path
    if path and requested.is_file():
        return send_from_directory(CLIENT_DIST, path)
    if not (CLIENT_DIST / "index.html").is_file():
        return jsonify(
            {"error": "Frontend is not built. Run `npm run build` in client/."}
        ), 503
    return send_from_directory(CLIENT_DIST, "index.html")


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG") == "1", host="127.0.0.1", port=5000)
