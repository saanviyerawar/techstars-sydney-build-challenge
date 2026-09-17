"""Scrape public LinkedIn profile data with an authenticated Chrome session."""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from random import uniform
from urllib.parse import quote_plus, urlparse

from dotenv import load_dotenv
from selenium import webdriver
from selenium.common.exceptions import (
    StaleElementReferenceException,
    WebDriverException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "output"
DEFAULT_PROFILE_DIR = SCRIPT_DIR / ".chrome-profile"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Scrape one or more public LinkedIn profile URLs."
    )
    parser.add_argument(
        "urls",
        nargs="*",
        help="LinkedIn profile URLs, for example https://www.linkedin.com/in/example",
    )
    parser.add_argument(
        "--urls-file",
        type=Path,
        help="Text file containing one LinkedIn profile URL per line",
    )
    parser.add_argument(
        "--discover-query",
        help="Discover profile URLs from an authenticated LinkedIn people search",
    )
    parser.add_argument(
        "--max-profiles",
        type=int,
        default=3,
        help="Maximum new profiles to scrape from discovery (default: 3)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"JSON output directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run Chrome without a visible window",
    )
    parser.add_argument(
        "--profile-dir",
        type=Path,
        default=DEFAULT_PROFILE_DIR,
        help="Chrome profile used to retain the authenticated session",
    )
    parser.add_argument(
        "--manual-login",
        action="store_true",
        help="Open LinkedIn and wait for you to log in instead of using environment credentials",
    )
    parser.add_argument(
        "--login-timeout",
        type=int,
        default=300,
        help="Seconds to wait for a manual login (default: 300)",
    )
    parser.add_argument(
        "--min-delay",
        type=float,
        default=10,
        help="Minimum delay between profiles in seconds (default: 10)",
    )
    parser.add_argument(
        "--max-delay",
        type=float,
        default=20,
        help="Maximum delay between profiles in seconds (default: 20)",
    )
    return parser.parse_args()


def load_urls(args):
    urls = list(args.urls)
    if args.urls_file:
        if not args.urls_file.is_file():
            raise ValueError(f"URL file not found: {args.urls_file}")
        urls.extend(
            line.strip()
            for line in args.urls_file.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        )

    valid_urls = []
    seen = set()
    for url in urls:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if host not in {"linkedin.com", "www.linkedin.com"} or not re.fullmatch(
            r"/in/[^/]+/?", parsed.path
        ):
            raise ValueError(f"Not a LinkedIn profile URL: {url}")
        normalized = f"https://www.linkedin.com{parsed.path.rstrip('/')}/"
        if normalized not in seen:
            valid_urls.append(normalized)
            seen.add(normalized)

    if not valid_urls and not args.discover_query:
        raise ValueError("Provide at least one profile URL or use --urls-file.")
    return valid_urls


def create_driver(headless, profile_dir):
    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1200")
    options.add_argument(f"--user-data-dir={profile_dir.resolve()}")
    return webdriver.Chrome(options=options)


def authenticate(driver, manual_login, timeout):
    if manual_login:
        driver.get("https://www.linkedin.com/login")
        print(f"Log in using the Chrome window. Waiting up to {timeout} seconds...")
        WebDriverWait(driver, timeout).until(
            lambda browser: browser.get_cookie("li_at") is not None
        )
        return

    email = os.getenv("LINKEDIN_EMAIL")
    password = os.getenv("LINKEDIN_PASSWORD")
    if not email or not password:
        raise ValueError(
            "Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD in .env, "
            "or run with --manual-login."
        )
    driver.get("https://www.linkedin.com/login")
    username = WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.ID, "username"))
    )
    username.send_keys(email)
    password_input = driver.find_element(By.ID, "password")
    password_input.send_keys(password)
    password_input.submit()
    WebDriverWait(driver, timeout).until(
        lambda browser: browser.get_cookie("li_at") is not None
    )


def profile_slug(url):
    match = re.search(r"/in/([^/]+)", url)
    if match is None:
        raise ValueError(f"Not a LinkedIn profile URL: {url}")
    return match.group(1)


def wait_for_main(driver):
    WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.TAG_NAME, "main"))
    )
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(2)


def discover_profile_urls(driver, query):
    search_url = (
        f"https://www.linkedin.com/search/results/people/?keywords={quote_plus(query)}"
    )
    driver.get(search_url)
    wait_for_main(driver)

    urls = []
    seen = set()
    for anchor in driver.find_elements(By.CSS_SELECTOR, 'main a[href*="/in/"]'):
        href = anchor.get_attribute("href")
        if not href:
            continue
        parsed = urlparse(href)
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) != 2 or parts[0].casefold() != "in":
            continue
        normalized = f"https://www.linkedin.com/in/{parts[1]}/"
        if normalized not in seen:
            urls.append(normalized)
            seen.add(normalized)
    return urls


def scraped_profile_urls(output_dir):
    urls = set()
    for path in output_dir.glob("profile_*.json"):
        try:
            profile = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        url = profile.get("source_url") or profile.get("linkedin_url")
        if url and (profile.get("experiences") or profile.get("educations")):
            urls.add(url)
    return urls


def clean_text(value):
    lines = [
        line.strip()
        for line in value.replace("\r", "").split("\n")
        if line.strip() and line.strip().lower() != "edit"
    ]
    return "\n".join(lines)


def extract_name(driver, url):
    title_name = driver.title.partition("|")[0].strip()
    if title_name and title_name.lower() != "linkedin":
        return title_name
    return profile_slug(url).replace("-", " ").title()


def extract_profile_summary(driver):
    summaries = []
    for section in driver.find_elements(By.CSS_SELECTOR, "main section"):
        try:
            text = clean_text(section.text)
        except StaleElementReferenceException:
            continue
        if text and text not in summaries:
            summaries.append(text)
    return summaries[0] if summaries else None


def extract_about(driver):
    blocks = []
    for element in driver.find_elements(
        By.CSS_SELECTOR, 'main [data-testid="expandable-text-box"]'
    ):
        try:
            blocks.append(clean_text(element.text))
        except StaleElementReferenceException:
            continue
    blocks = [block for block in blocks if block]
    return max(blocks, key=len) if blocks else None


def extract_detail_items(driver, url, section):
    driver.get(f"{url.rstrip('/')}/details/{section}/")
    wait_for_main(driver)

    items = []
    for element in driver.find_elements(By.CSS_SELECTOR, "main ul > li"):
        try:
            if not element.is_displayed():
                continue
            text = clean_text(element.text)
        except StaleElementReferenceException:
            continue
        if len(text) >= 20 and text not in items:
            items.append(text)

    if not items and section == "experience":
        candidates = []
        for element in driver.find_elements(By.CSS_SELECTOR, "main section"):
            try:
                company_links = len(
                    element.find_elements(By.CSS_SELECTOR, 'a[href*="/company/"]')
                )
                text = clean_text(element.text)
            except StaleElementReferenceException:
                continue
            if company_links and len(text) >= 20:
                candidates.append((company_links, len(text), text))
        if candidates:
            items.append(max(candidates)[2])

    if not items and section == "education":
        for element in driver.find_elements(
            By.CSS_SELECTOR, 'main [data-testid*="EducationDetailsSection"]'
        ):
            try:
                text = clean_text(element.text)
            except StaleElementReferenceException:
                continue
            if len(text) >= 20 and text not in items:
                items.append(text)
    return [{"raw_text": text} for text in items]


def scrape_profile(driver, url, output_dir):
    driver.get(url)
    wait_for_main(driver)
    payload = {
        "name": extract_name(driver, url),
        "linkedin_url": url,
        "profile_summary": extract_profile_summary(driver),
        "about": extract_about(driver),
        "experiences": extract_detail_items(driver, url, "experience"),
        "educations": extract_detail_items(driver, url, "education"),
    }
    if not payload["experiences"] and not payload["educations"]:
        raise ValueError(
            "LinkedIn returned an empty profile. Confirm the session is signed in "
            "and that the profile is visible to your account."
        )
    payload["source_url"] = url
    payload["scraped_at"] = datetime.now(timezone.utc).isoformat()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = output_dir / f"profile_{profile_slug(url)}_{timestamp}.json"
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return output_path


def main():
    args = parse_args()
    if args.min_delay < 0 or args.max_delay < args.min_delay:
        print(
            "Error: delays must satisfy 0 <= min-delay <= max-delay.", file=sys.stderr
        )
        return 2
    if args.max_profiles < 1 or args.max_profiles > 10:
        print("Error: max-profiles must be between 1 and 10.", file=sys.stderr)
        return 2

    load_dotenv(SCRIPT_DIR.parent / ".env")
    load_dotenv(SCRIPT_DIR / ".env", override=True)

    try:
        urls = load_urls(args)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    if not args.manual_login and (
        not os.getenv("LINKEDIN_EMAIL") or not os.getenv("LINKEDIN_PASSWORD")
    ):
        print(
            "Error: set LINKEDIN_EMAIL and LINKEDIN_PASSWORD in .env, "
            "or run with --manual-login.",
            file=sys.stderr,
        )
        return 2

    args.output_dir.mkdir(parents=True, exist_ok=True)
    driver = None
    failures = 0
    succeeded = 0
    discovery_candidates = []
    discovery_successes = 0
    try:
        driver = create_driver(args.headless, args.profile_dir)
        authenticate(driver, args.manual_login, args.login_timeout)

        if args.discover_query:
            discovered = discover_profile_urls(driver, args.discover_query)
            existing = scraped_profile_urls(args.output_dir)
            new_urls = [url for url in discovered if url not in existing]
            discovery_candidates = new_urls[: args.max_profiles * 5]
            urls.extend(discovery_candidates)
            urls = list(dict.fromkeys(urls))
            print(
                f"Discovered {len(discovered)} candidates; "
                f"seeking {min(len(new_urls), args.max_profiles)} valid new profiles."
            )

        for index, url in enumerate(urls):
            if url in discovery_candidates and discovery_successes >= args.max_profiles:
                break
            try:
                output_path = scrape_profile(driver, url, args.output_dir)
                succeeded += 1
                if url in discovery_candidates:
                    discovery_successes += 1
                print(f"Saved {url} to {output_path}")
            except (OSError, TypeError, ValueError, WebDriverException) as error:
                failures += 1
                print(f"Failed to scrape {url}: {error}", file=sys.stderr)

            if index < len(urls) - 1 and (
                not args.discover_query or discovery_successes < args.max_profiles
            ):
                time.sleep(uniform(args.min_delay, args.max_delay))
    except (OSError, TypeError, ValueError, WebDriverException) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    finally:
        if driver is not None:
            driver.quit()

    print(f"Finished: {succeeded} succeeded, {failures} failed.")
    if args.discover_query:
        return 0 if discovery_successes or not discovery_candidates else 1
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
