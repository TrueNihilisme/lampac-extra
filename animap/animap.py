#!/usr/bin/env python3
"""
animap — TMDB card -> MAL entries for anime, for the EX.AnimeON / EX.Mikai modules of lampac-extra.

    GET /animap?tmdb=209867&type=tv      (type: tv | movie)
    GET /health

Data:
  * TMDB -> MAL: Fribb/anime-lists (anime-list-full.json), downloaded on first use and refreshed daily.
    For every MAL entry it also knows the TMDB season and the episode offset inside the TMDB card.
  * Titles (ua / en / ja romaji): Hikka API, /integrations/mal/anime/{mal_id}, cached in memory.

No dependencies besides the Python 3 standard library.
Environment: PORT (default 8100), FRIBB_URL, HIKKA_URL, REFRESH_HOURS (default 24).
"""
import json
import os
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8100"))
FRIBB_URL = os.environ.get("FRIBB_URL", "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json")
HIKKA_URL = os.environ.get("HIKKA_URL", "https://api.hikka.io").rstrip("/")
REFRESH = float(os.environ.get("REFRESH_HOURS", "24")) * 3600
UA = {"User-Agent": "animap/1", "Accept": "application/json"}

_lock = threading.Lock()
_fribb = {"at": 0.0, "index": {}}
_hikka = {}


def get_json(url, timeout=30):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def fribb_index():
    """{"tv209867": [rows...], "movie372058": [...]} — rebuilt once per REFRESH."""
    with _lock:
        if _fribb["index"] and time.time() - _fribb["at"] < REFRESH:
            return _fribb["index"]
        try:
            rows = get_json(FRIBB_URL, timeout=120)
        except Exception as e:  # keep the old index if the download fails
            print("fribb: %s" % e, flush=True)
            return _fribb["index"]
        index = {}
        for r in rows:
            ids = r.get("themoviedb_id") or {}
            for kind in ("tv", "movie"):
                v = ids.get(kind)
                for one in (v if isinstance(v, list) else [v] if v else []):  # movies are lists in Fribb
                    index.setdefault("%s%s" % (kind, one), []).append(r)
        _fribb.update(at=time.time(), index=index)
        print("fribb: %d rows, %d TMDB cards" % (len(rows), len(index)), flush=True)
        return index


def hikka(mal):
    if mal in _hikka:
        return _hikka[mal]
    try:
        d = get_json("%s/integrations/mal/anime/%d" % (HIKKA_URL, mal), timeout=15)
        h = {k: d.get(k) for k in ("slug", "title_ua", "title_en", "title_ja", "year", "episodes_total")}
    except Exception:
        h = None
    _hikka[mal] = h
    return h


def animap(tmdb, kind):
    entries = []
    for r in fribb_index().get(kind + tmdb, []):
        mal = r.get("mal_id")
        if not mal:
            continue
        e = {
            "mal_id": mal,
            "type": r.get("type"),
            "tmdb_season": (r.get("season") or {}).get("tmdb"),
            "episode_offset": (r.get("episode_offset") or {}).get("tmdb", 0),
            "anilist_id": r.get("anilist_id"),
            "imdb_id": (r.get("imdb_id") or [None])[0],
        }
        h = hikka(mal)
        if h:
            e.update(hikka_slug=h["slug"], title_ua=h["title_ua"], title_en=h["title_en"],
                     title_ja=h["title_ja"], year=h["year"], episodes=h["episodes_total"])
        entries.append(e)
    entries.sort(key=lambda e: (e["tmdb_season"] if e["tmdb_season"] is not None else 99, e["episode_offset"] or 0))
    return {"ok": bool(entries), "tmdb": int(tmdb), "type": kind, "entries": entries}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("%s %s" % (self.address_string(), fmt % args), flush=True)

    def reply(self, code, body, ctype="application/json; charset=utf-8"):
        data = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path == "/health":
            return self.reply(200, "OK", "text/plain")
        if url.path.rstrip("/") != "/animap":
            return self.reply(404, json.dumps({"ok": False, "error": "unknown route"}))
        q = urllib.parse.parse_qs(url.query)
        tmdb = (q.get("tmdb") or [""])[0].strip()
        kind = "movie" if (q.get("type") or ["tv"])[0] == "movie" else "tv"
        if not tmdb.isdigit():
            return self.reply(400, json.dumps({"ok": False, "error": "tmdb must be a number"}))
        self.reply(200, json.dumps(animap(tmdb, kind), ensure_ascii=False))


if __name__ == "__main__":
    print("animap listening on :%d" % PORT, flush=True)
    threading.Thread(target=fribb_index, daemon=True).start()  # warm up the index in the background
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
