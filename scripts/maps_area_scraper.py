#!/usr/bin/env python3
import argparse
import json
import random
import re
import time
from typing import Any
from urllib.parse import quote_plus

import requests

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/145.0.0.0 Safari/537.36"
)


def sg(obj: Any, *keys: Any, default: Any = None) -> Any:
    for key in keys:
        try:
            if obj is None:
                return default
            obj = obj[key]
        except (IndexError, TypeError, KeyError):
            return default
    return obj if obj is not None else default


def strip_prefix(text: str) -> str:
    t = text.strip()
    for pfx in [")]}\'", "/**/"]:
        if t.startswith(pfx):
            t = t[len(pfx) :].strip()
    if t.startswith("/*"):
        idx = t.find("*/")
        if idx >= 0:
            t = t[idx + 2 :].strip()
    return t


def parse_json(text: str) -> Any:
    return json.loads(strip_prefix(text))


def is_phone(value: str) -> bool:
    clean = re.sub(r"[\s\-\(\)\+]", "", value)
    if value.startswith("+") and len(clean) >= 7:
        return True
    return clean.isdigit() and 7 <= len(clean) <= 15


def find_phone(data: Any, depth: int = 0) -> str:
    if depth > 5:
        return ""
    if isinstance(data, str) and is_phone(data):
        return data
    if isinstance(data, list):
        for item in data:
            result = find_phone(item, depth + 1)
            if result:
                return result
    return ""


class PythonMapsAreaScraper:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": UA,
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "*/*",
                "Referer": "https://www.google.com/maps",
            }
        )

    def init_session(self, query: str) -> None:
        url = f"https://www.google.com/maps/search/{quote_plus(query)}"
        self.session.get(url, timeout=20, allow_redirects=True)

    def discover_ids(self, query: str) -> set[str]:
        r = self.session.get(
            "https://www.google.com/search",
            params={"tbm": "map", "q": query, "hl": "en", "gl": "us"},
            timeout=20,
        )
        if r.status_code != 200:
            return set()
        return set(x.lower() for x in re.findall(r"0x[0-9a-f]+:0x[0-9a-f]+", r.text))

    def build_pb(self, data_id: str, query: str) -> str:
        encoded_q = quote_plus(query)
        return (
            f"!1m17!1s{data_id}"
            "!3m12!1m3!1d14227.0!2d55.0!3d25.0"
            "!2m3!1f0!2f0!3f0!3m2!1i1163!2i945!4f13.1"
            "!4m2!3d25.0!4d55.0"
            f"!6s{encoded_q}"
            "!13m50!2m2!1i408!2i240!3m2!2i10!5b1"
            "!7m33!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2"
            "!1m3!1e2!2b0!3e3!1m3!1e8!2b0!3e3"
            "!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2"
            "!1m3!1e10!2b0!3e4!1m3!1e9!2b1!3e2!2b1!9b0"
            "!15m8!1m7!1m2!1m1!1e2!2m2!1i195!2i195!3i20"
            "!15m49!1m10!4e2!18m7!3b0!6b0!14b1!17b1!20b1"
            "!27m1!1b0!20e2"
            "!4b1!10m1!8e3!11m1!3e1!17b1!20m2!1e3!1e6"
            "!24b1!25b1!26b1!29b1!30m1!2b1!36b1!43b1!52b1"
            "!55b1!56m1!1b1"
            "!65m5!3m4!1m3!1m2!1i224!2i298"
            "!98m3!1b1!2b1!3b1!107m2!1m1!1e1"
            "!114m3!1b1!2m1!1b1"
            "!22m1!1e81!29m0"
            "!30m6!3b1!6m1!2b1!7m1!2b1!9b1!32b1!37i769"
        )

    def parse_place(self, d: list[Any]) -> dict[str, Any] | None:
        name = sg(d, 11, default="")
        if not name:
            return None

        category_values = sg(d, 13, default=[])
        if not isinstance(category_values, list):
            category_values = [str(category_values)] if category_values else []

        category = ", ".join(str(c) for c in category_values if c)

        phone = ""
        for path in [(178, 0, 0), (178, 0)]:
            value = sg(d, *path, default="")
            if isinstance(value, str) and is_phone(value):
                phone = value
                break
        if not phone:
            phone = find_phone(sg(d, 178, default=[]))

        return {
            "id": sg(d, 10, default="") or sg(d, 42, default="") or f"{name}-{phone}",
            "name": name,
            "phone_number": phone or None,
            "address": sg(d, 39, default="") or sg(d, 18, default="") or None,
            "category": category or None,
            "maps_url": sg(d, 42, default="") or None,
        }

    def fetch_place_detail(self, data_id: str, query: str) -> dict[str, Any] | None:
        pb = self.build_pb(data_id, query)
        r = self.session.get(
            "https://www.google.com/maps/preview/place",
            params={
                "authuser": "0",
                "hl": "en",
                "gl": "us",
                "pb": pb,
                "q": "*",
                "pf": "t",
            },
            timeout=20,
        )
        if r.status_code != 200:
            return None

        data = parse_json(r.text)
        d = sg(data, 6)
        if not isinstance(d, list) or len(d) < 12:
            return None

        return self.parse_place(d)

    def search(self, country: str, state: str, city: str, query: str, max_results: int) -> list[dict[str, Any]]:
        location = f"{city}, {state}, {country}".strip().strip(",")
        base_query = query.strip() if query else f"restaurants in {location}"

        self.init_session(base_query)

        cuisines = [
            "indian",
            "arabic",
            "chinese",
            "italian",
            "japanese",
            "thai",
            "turkish",
            "pakistani",
            "mexican",
            "french",
            "seafood",
            "burger",
            "pizza",
            "cafe",
            "bakery",
            "vegan",
            "fast food",
        ]

        variants = [
            base_query,
            f"restaurants in {city}",
            f"restaurants in {city} {state}",
            f"cafe in {city}",
            f"food in {city}",
        ]
        variants.extend([f"{cuisine} restaurant in {city}" for cuisine in cuisines])

        all_ids: set[str] = set()
        for variant in variants:
            ids = self.discover_ids(variant)
            all_ids.update(ids)
            if len(all_ids) >= max_results * 3:
                break
            time.sleep(random.uniform(0.4, 0.9))

        results: list[dict[str, Any]] = []
        dedupe: set[str] = set()

        for data_id in all_ids:
            if len(results) >= max_results:
                break

            place = self.fetch_place_detail(data_id, base_query)
            if not place or not place.get("name"):
                continue

            key = f"{str(place['name']).lower()}|{place.get('phone_number') or ''}"
            if key in dedupe:
                continue

            dedupe.add(key)
            results.append(place)
            time.sleep(random.uniform(0.2, 0.6))

        return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Google Maps restaurants by area")
    parser.add_argument("--country", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--city", required=True)
    parser.add_argument("--query", default="")
    parser.add_argument("--max-results", type=int, default=25)
    args = parser.parse_args()

    max_results = max(5, min(args.max_results, 100))

    scraper = PythonMapsAreaScraper()
    try:
        data = scraper.search(args.country, args.state, args.city, args.query, max_results)
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        raise SystemExit(1)

    print(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    main()
