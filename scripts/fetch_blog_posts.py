#!/usr/bin/env python3
"""Fetch external RSS feeds and write the same-origin JSON used by the site."""

from __future__ import annotations

import html
import json
import re
import sys
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.request import Request, urlopen
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "blog-posts.json"
MAX_POSTS_PER_FEED = 20
FEEDS = {
    "velog": {
        "name": "Velog",
        "url": "https://v2.velog.io/rss/@hamzzi_lover",
        "home_url": "https://velog.io/@hamzzi_lover",
    },
    "naver": {
        "name": "Naver Blog",
        "url": "https://rss.blog.naver.com/wowgiroong_715.xml",
        "home_url": "https://blog.naver.com/wowgiroong_715",
    },
}


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def child_text(element: ElementTree.Element, *names: str) -> str:
    wanted = {name.lower() for name in names}
    for child in element:
        if local_name(child.tag) in wanted:
            return "".join(child.itertext()).strip()
    return ""


def clean_description(value: str, limit: int = 132) -> str:
    value = re.sub(r"<[^>]+>", " ", html.unescape(value or ""))
    value = re.sub(r"\s+", " ", value).strip()
    return value if len(value) <= limit else value[:limit].rstrip() + "..."


def parse_date(value: str) -> tuple[str, int]:
    if not value:
        return "", 0
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value, 0
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.isoformat(), int(parsed.timestamp() * 1000)


def fetch_feed(feed: dict[str, str]) -> list[dict[str, object]]:
    request = Request(feed["url"], headers={"User-Agent": "zioni715.github.io RSS updater/1.0"})
    with urlopen(request, timeout=30) as response:
        root = ElementTree.fromstring(response.read())

    entries = [node for node in root.iter() if local_name(node.tag) in {"item", "entry"}]
    posts = []
    for entry in entries[:MAX_POSTS_PER_FEED]:
        link = child_text(entry, "link")
        if not link:
            link_node = next((node for node in entry if local_name(node.tag) == "link"), None)
            link = link_node.get("href", "") if link_node is not None else ""
        date, timestamp = parse_date(child_text(entry, "pubDate", "published", "updated"))
        posts.append({
            "title": child_text(entry, "title") or "Untitled",
            "link": link or feed["home_url"],
            "date": date,
            "timestamp": timestamp,
            "description": clean_description(child_text(entry, "description", "summary", "content", "encoded")),
            "source": feed["name"],
        })
    return posts


def load_existing() -> dict[str, object]:
    try:
        return json.loads(OUTPUT.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def main() -> int:
    existing = load_existing()
    result: dict[str, object] = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    failures = []

    for key, feed in FEEDS.items():
        try:
            posts = fetch_feed(feed)
            if not posts:
                raise ValueError("feed contained no posts")
            result[key] = posts
            print(f"Fetched {len(posts)} {feed['name']} posts")
        except Exception as error:  # Keep the last good data when one provider is down.
            failures.append(f"{feed['name']}: {error}")
            result[key] = existing.get(key, [])
            print(f"Warning: {failures[-1]}", file=sys.stderr)

    if failures and not any(result.get(key) for key in FEEDS):
        print("No feed could be fetched and no previous data exists", file=sys.stderr)
        return 1

    if existing and all(existing.get(key) == result.get(key) for key in FEEDS):
        print("Blog posts are already up to date")
        return 0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
