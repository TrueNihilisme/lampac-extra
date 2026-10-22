# lampac-extra

Additional online modules for [Lampac NextGen](https://github.com/lampac-nextgen/lampac),
loaded through Lampac's module repository (`module/repository.yaml`).

| Module | Route | What it does |
|---|---|---|
| `EX.AnimeON` | `lite/ex_animeon` | AnimeON source. If an `animap` service is configured, picks the title whose MAL id matches the TMDB card instead of guessing by name |

## Install

`module/repository.yaml`:

```yaml
- repository: https://github.com/TrueNihilisme/lampac-extra
  branch: main
  modules:
    - EX.AnimeON
```

`init.conf` (optional):

```json
"EX.AnimeON": {
  "animap": "http://<animap-host>:<port>"
}
```

`animap` is expected to answer `GET /animap?tmdb=<id>&type=tv|movie` with
`{"ok":true,"entries":[{"mal_id":52991,"title_ua":"…","title_ja":"…"}]}`.
