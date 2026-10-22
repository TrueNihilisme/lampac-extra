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
| `EX.MoonAnime` | `lite/ex_moonanime` | MoonAnime через API акаунта (потрібен власний акаунт із підпискою). Серії беруться з преміум-API — готові посилання HLS/webm, без браузера Chromium |
| `EX.TvCtl` | `/tvctl/*` | Черга команд і журнал звітів для клієнтського плагіна Lampa (дистанційне керування й діагностика). Сам плагін сюди не входить |

Без `animap` модулі AnimeON і Mikai працюють як звичайні: шукають за назвою.

## Встановлення однією командою

На машині, де лежать файли Lampac (для Docker — на хості, у папці, підключеній у контейнер):

```sh
curl -fsSL https://raw.githubusercontent.com/TrueNihilisme/lampac-extra/main/install.sh | sh -s -- /шлях/до/lampac
```

Скрипт допише репозиторій у `module/repository.yaml`, вимкне вбудовані AnimeON і Mikai в `init.conf`
(перед цим зробить копії `*.before-lampac-extra`) і підкаже, що далі. Додаткові опції:

| Опція | Що робить |
|---|---|
| `--moonanime-token ТОКЕН` | підключити й MoonAnime (як отримати токен — крок 3 нижче) |
| `--animap http://АДРЕСА` | увімкнути точний вибір аніме за MAL ID (розділ про `animap`) |
| `--restart КОНТЕЙНЕР` | самому двічі перезапустити Docker-контейнер Lampac і показати, які модулі завантажились |

Приклад для Docker з усім одразу:

```sh
curl -fsSL https://raw.githubusercontent.com/TrueNihilisme/lampac-extra/main/install.sh \
  | sh -s -- /opt/lampac --moonanime-token ВАШ_ТОКЕН --restart lampac
```

Потрібен `python3`. Якщо `init.conf` не читається як JSON (наприклад, у ньому коментарі), скрипт нічого
не змінить — тоді за кроками нижче вручну.

⚠️ Для Docker: якщо з хоста підключений лише `init.conf`, а папка `module` — ні, то `repository.yaml`
лежить усередині контейнера й зникне при його перестворенні. Тоді підключіть `module/repository.yaml`
з хоста окремим томом.

## Швидкий старт (вручну)

Нижче `<Lampac>` — папка, де лежить ваш Lampac (там є `init.conf` і папка `module`).
У Docker-образі Lampac NextGen це `/lampac` усередині контейнера — правте файли там, де вони у вас
підключені з хоста (volume).

**1. Додайте репозиторій.** Відкрийте (або створіть) файл `<Lampac>/module/repository.yaml` і допишіть у кінець:

```yaml
- repository: https://github.com/TrueNihilisme/lampac-extra
  branch: main
  modules:
    - EX.AnimeON
    - EX.Mikai
```

Зайві рядки з `modules` можна прибрати — підключаються лише перелічені модулі. MoonAnime додавайте,
тільки якщо у вас є акаунт (крок 3).

**2. Вимкніть вбудовані двійники**, щоб у списку джерел не було двох AnimeON / Mikai.
У `<Lampac>/init.conf` (це JSON, кома між секціями обовʼязкова) додайте:

```json
"AnimeON": { "enable": false, "enabled": false },
"Mikai":   { "enable": false, "enabled": false },
```

**3. (Необовʼязково) MoonAnime.** Якщо маєте акаунт MoonAnime з підпискою:

- отримайте токен (у терміналі, підставте свої логін і пароль):

  ```sh
  curl -s https://api.moonanime.vip/api/auth/login/ \
       -H 'Content-Type: application/json' \
       -d '{"username":"ЛОГІН","password":"ПАРОЛЬ"}'
  ```

  у відповіді буде `"token": "…"` — 40 символів;
- допишіть `- EX.MoonAnime` у `repository.yaml`, а в `init.conf`:

  ```json
  "MoonAnime":    { "enable": false, "enabled": false },
  "EX.MoonAnime": { "token": "ВАШ_ТОКЕН" },
  ```

**4. Перезапустіть Lampac двічі.** Перший запуск лише завантажує модулі з GitHub (у фоні, вже після старту),
другий — компілює їх. Для Docker: `docker restart <назва-контейнера>`, зачекати хвилину, і ще раз.

**5. Перевірте.** У лозі Lampac мають зʼявитися рядки `loaded module: EX.AnimeON` (і інші, що ви підключили).
У Lampa відкрийте будь-яке аніме → «Дивитись» → «Онлайн» → у списку «Джерело» буде «[UA] AnimeON» / «[UA] Mikai».

Так модулі вже працюють — шукають за назвою, як вбудовані. Щоб увімкнути **точний вибір за MAL ID**,
потрібен сервіс `animap` (наступний розділ) і в `init.conf`:

```json
"EX.AnimeON": { "animap": "http://АДРЕСА-ANIMAP" },
"EX.Mikai":   { "animap": "http://АДРЕСА-ANIMAP" },
```

**Оновлення.** Коли в цьому репозиторії зʼявляються зміни, Lampac сам підтягне їх при наступному
запуску — знову потрібен другий перезапуск, щоб вони скомпілювались.

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
