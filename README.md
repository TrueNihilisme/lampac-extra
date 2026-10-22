# lampac-extra

Additional online modules for [Lampac NextGen](https://github.com/lampac-nextgen/lampac),
loaded through Lampac's module repository (`module/repository.yaml`).

| Module | Route | What it does |
|---|---|---|
| `EX.AnimeON` | `lite/ex_animeon` | AnimeON source. If an `animap` service is configured, picks the title whose MAL id matches the TMDB card instead of guessing by name |
| `EX.Mikai` | `lite/ex_mikai` | Mikai source with the same optional `animap` matching (by native title, Mikai search has no MAL id) |
| `EX.MoonAnime` | `lite/ex_moonanime` | MoonAnime through the account API (`host`, `token` in `init.conf`); episodes from the premium endpoint with direct HLS/webm links, no browser needed |
| `EX.TvCtl` | `/tvctl/*` | Command queue and report log for a Lampa client plugin (remote control / diagnostics). `cmd`, `log`, `devices` require the Lampac root password |

## Install

`module/repository.yaml`:

```yaml
- repository: https://github.com/TrueNihilisme/lampac-extra
  branch: main
  modules:
    - EX.AnimeON
    - EX.Mikai
    - EX.MoonAnime
    - EX.TvCtl
```

`init.conf` (optional):

```json
"EX.AnimeON": { "animap": "http://<animap-host>:<port>" },
"EX.Mikai":   { "animap": "http://<animap-host>:<port>" },
"EX.MoonAnime": { "token": "<account token>" }
```

`animap` is expected to answer `GET /animap?tmdb=<id>&type=tv|movie` with
`{"ok":true,"entries":[{"mal_id":52991,"title_ua":"…","title_ja":"…"}]}`.
