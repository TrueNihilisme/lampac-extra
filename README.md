# lampac-extra

*Additional online modules for [Lampac NextGen](https://github.com/lampac-nextgen/lampac): AnimeON and Mikai
with exact title matching by MAL id, MoonAnime through the account API, and a small command queue for a Lampa
client plugin. Documentation below is in Ukrainian.*

Додаткові модулі для [Lampac NextGen](https://github.com/lampac-nextgen/lampac). Lampac завантажує їх сам —
так само, як модулі `lampac-ukraine`, — через `module/repository.yaml`. Вбудовані модулі Lampac не змінюються:
наші мають власні назви (`EX.*`) і власні адреси (`lite/ex_*`), тож оновлення Lampac їх не зачіпає.

## Навіщо

Вбудовані аніме-джерела шукають тайтл **за назвою** і далі або вгадують, або показують список «схожих».
Через це:

- у список потрапляють чужі тайтли зі схожою назвою. Приклад: для картки «Фрірен: після кінця пригоди»
  вбудований AnimeON пропонує і «Проводжальниця Фрірен», і «Початок після кінця» — зовсім інше аніме;
- сезони не збігаються: у TMDB «Фрірен» — один сезон на 38 серій, а на аніме-сайтах це три окремі тайтли.

Модулі звідси вміють вибирати тайтл **точно — за MAL ID** (ідентифікатор MyAnimeList, на який спираються
Hikka, AnimeON, Mikai та інші українські аніме-сайти):

```
картка TMDB  →  MAL ID кожного сезону  →  правильні назви  →  лише записи джерела з цим MAL ID
```

Для «Фрірен» результат — рівно «Проводжальниця Фрірен», «… — 2 сезон», «… — 3 сезон», по порядку.

## Модулі

| Модуль | Адреса | Що робить |
|---|---|---|
| `EX.AnimeON` | `lite/ex_animeon` | Джерело AnimeON. З сервісом `animap` шукає за українською назвою з Hikka і лишає лише записи, у яких `malId` збігся з карткою. Один збіг — відкриває одразу, кілька (сезони) — показує тільки їх |
| `EX.Mikai` | `lite/ex_mikai` | Джерело Mikai. У пошуку Mikai нема MAL ID, тому з `animap` шукає за оригінальною назвою латиницею і лишає записи з тією самою назвою |
| `EX.MoonAnime` | `lite/ex_moonanime` | MoonAnime через API акаунта (потрібен власний акаунт із підпискою). Серії береться з преміум-API — готові посилання HLS/webm, без браузера Chromium |
| `EX.TvCtl` | `/tvctl/*` | Черга команд і журнал звітів для клієнтського плагіна Lampa (дистанційне керування й діагностика). Сам плагін сюди не входить |

Без `animap` модулі AnimeON і Mikai працюють як звичайні: шукають за назвою.

## Підключення

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

Модулі можна підключати й поодинці. Щоб у списку джерел не було двох однакових, вимкніть вбудовані
відповідники в `init.conf`:

```json
"AnimeON":   { "enable": false, "enabled": false },
"Mikai":     { "enable": false, "enabled": false },
"MoonAnime": { "enable": false, "enabled": false }
```

Налаштування наших модулів (`init.conf`, усе необовʼязкове, крім токена MoonAnime):

```json
"EX.AnimeON":   { "animap": "http://<адреса-animap>" },
"EX.Mikai":     { "animap": "http://<адреса-animap>" },
"EX.MoonAnime": { "token": "<токен вашого акаунта>" }
```

Токен MoonAnime — це `token` з відповіді `POST https://api.moonanime.vip/api/auth/login/`
(`{"username": "…", "password": "…"}`). У коді модуля ключів нема — лише в `init.conf`.

Після змін у репозиторії Lampac завантажує нову версію у фоні **після** старту, тож щоб вона скомпілювалась,
потрібен ще один перезапуск.

## Сервіс `animap`

Це окремий маленький HTTP-сервіс, який ви піднімаєте самі (його код тут не публікується — формат простий).
Модулі звертаються до нього так:

```
GET /animap?tmdb=209867&type=tv        (type: tv | movie)
```

і чекають відповідь:

```json
{
  "ok": true,
  "entries": [
    { "mal_id": 52991, "title_ua": "Проводжальниця Фрірен",           "title_ja": "Sousou no Frieren" },
    { "mal_id": 59978, "title_ua": "Проводжальниця Фрірен - 2 сезон", "title_ja": "Sousou no Frieren 2nd Season" }
  ]
}
```

Звідки брати дані:

- **TMDB → MAL** — відкрита база [Fribb/anime-lists](https://github.com/Fribb/anime-lists)
  (`anime-list-full.json`, поле `themoviedb_id`; для фільмів значення — список). Там же є сезон TMDB
  і зсув серій для кожного запису;
- **назви** — [Hikka](https://hikka.io), відкритий API: `GET https://api.hikka.io/integrations/mal/anime/{mal_id}`
  повертає `title_ua`, `title_en`, `title_ja`.

## TvCtl

Сервер для клієнтського плагіна, який опитує `/tvctl/poll?dev=<пристрій>` і виконує команди (відкрити
картку, джерело, серію тощо), а у `/tvctl/report` шле звіти (запити до джерел, повідомлення Lampa, старт
плеєра). Команди (`POST /tvctl/cmd?dev=…`), журнал (`/tvctl/log`) і список пристроїв (`/tvctl/devices`)
доступні лише з root-паролем Lampac. Без плагіна модуль просто нічого не робить.

## Ліцензія і походження

Модулі `EX.AnimeON`, `EX.Mikai`, `EX.MoonAnime` побудовані на однойменних модулях
[Lampac NextGen](https://github.com/lampac-nextgen/lampac) і змінені.
