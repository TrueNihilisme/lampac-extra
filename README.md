# Lampac Extra Modules (`EX.*`)

Додаткові онлайн-модулі для Lampac NextGen.
Усі модулі мають префікс `EX.` і власні адреси `lite/ex_*`, тож не конфліктують із вбудованими модулями Lampac.

## Навігація

- [Українська](#ua)
- [English](#en)

## <a id="ua"></a>Українська

### Доступні модулі

**Аніме**
- `EX.AnimeON` — AnimeON з точним вибором тайтлу за MAL ID
- `EX.Mikai` — Mikai з точним вибором тайтлу за назвою оригіналу
- `EX.MoonAnime` — MoonAnime через акаунт (потрібна підписка), відео без браузера

**Службові**
- `EX.TvCtl` — черга команд і журнал для клієнтського плагіна Lampa (дистанційне керування)

Чим відрізняються від вбудованих: вбудовані AnimeON і Mikai шукають тайтл за назвою і часто показують зайве
(для «Фрірен» — ще й «Початок після кінця»). `EX.*` з сервісом [`animap`](#animap) показують лише сезони цієї картки.

### Автовстановлення через `repository.yaml`

Створіть або оновіть `module/repository.yaml`:

```yaml
- repository: https://github.com/TrueNihilisme/lampac-extra
  branch: main
  modules:
    - EX.AnimeON
    - EX.Mikai
    - EX.MoonAnime
```

Важливо:
- `branch` — необов'язково, за замовчуванням `main`.
- `modules` — перелічіть лише потрібні модулі.
- Після зміни **перезапустіть Lampac двічі**: перший запуск завантажує модулі, другий — компілює.
- Вимкніть вбудовані двійники, щоб у списку джерел не було двох однакових (див. [init.conf](#initconf)).

### Встановлення однією командою

Запускайте на машині з файлами Lampac (для Docker — на хості, у підключеній теці):

```bash
curl -fsSL https://raw.githubusercontent.com/TrueNihilisme/lampac-extra/main/install.sh | sh -s -- /path/to/lampac
```

Скрипт додасть репозиторій у `repository.yaml` і вимкне вбудовані AnimeON / Mikai в `init.conf`
(копії до змін — `*.before-lampac-extra`). Опції:

- `--moonanime-token TOKEN` — підключити `EX.MoonAnime`
- `--animap http://host:port` — увімкнути точний вибір за MAL ID
- `--restart CONTAINER` — двічі перезапустити Docker-контейнер Lampac

Потрібен `python3`.

### Ручне встановлення

1. Клонуйте репозиторій:
```bash
git clone https://github.com/TrueNihilisme/lampac-extra.git
```

2. Скопіюйте потрібні теки модулів у директорію `module` вашого Lampac.

3. Для Docker приклад монтування:
```bash
-v /path/to/lampac-extra/EX.AnimeON:/lampac/module/EX.AnimeON
```

### <a id="initconf"></a>Налаштування в `init.conf`

Вимкнення вбудованих двійників:

```json
"AnimeON":   { "enable": false, "enabled": false },
"Mikai":     { "enable": false, "enabled": false },
"MoonAnime": { "enable": false, "enabled": false }
```

Наші модулі (усі поля необов'язкові, крім `token` для MoonAnime):

```json
"EX.AnimeON": {
  "animap": "http://host:port",
  "displayname": "[UA] AnimeON"
},
"EX.Mikai": {
  "animap": "http://host:port",
  "displayname": "[UA] Mikai"
},
"EX.MoonAnime": {
  "token": "YOUR_TOKEN",
  "displayname": "MoonAnime"
}
```

Решта полів — стандартні для онлайн-модулів Lampac (`displayindex`, `useproxy`, `proxy` тощо).

### Токен MoonAnime

```bash
curl -s https://api.moonanime.vip/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"LOGIN","password":"PASSWORD"}'
```

У відповіді — `"token": "…"` (40 символів). Його й вставте в `EX.MoonAnime.token`.

### <a id="animap"></a>Точний вибір за MAL ID (`animap`)

Необов'язковий сервіс, який ви піднімаєте самі. Без нього `EX.AnimeON` і `EX.Mikai` працюють як звичайні — за назвою.

Запит і відповідь:

```
GET /animap?tmdb=209867&type=tv
```

```json
{ "ok": true, "entries": [
  { "mal_id": 52991, "title_ua": "Проводжальниця Фрірен",           "title_ja": "Sousou no Frieren" },
  { "mal_id": 59978, "title_ua": "Проводжальниця Фрірен - 2 сезон", "title_ja": "Sousou no Frieren 2nd Season" }
] }
```

Дані: TMDB → MAL — [Fribb/anime-lists](https://github.com/Fribb/anime-lists) (`anime-list-full.json`),
назви — [Hikka API](https://api.hikka.io/docs) (`/integrations/mal/anime/{mal_id}`).

### `EX.TvCtl`

Ендпоінти: `/tvctl/poll`, `/tvctl/report` (для плагіна, без пароля); `/tvctl/cmd`, `/tvctl/log`, `/tvctl/devices`
(лише з root-паролем Lampac). Клієнтський плагін у репозиторій не входить.

---

## <a id="en"></a>English

Additional online modules for Lampac NextGen. Prefix `EX.` and routes `lite/ex_*` avoid conflicts with built-in modules.

- `EX.AnimeON`, `EX.Mikai` — anime sources that pick the exact title by MAL id when an [`animap`](#animap) service is configured
- `EX.MoonAnime` — MoonAnime through the account API (`token` in `init.conf`), direct HLS/webm links, no browser
- `EX.TvCtl` — command queue and report log for a Lampa client plugin

Install: add the repository to `module/repository.yaml` (see above) or run

```bash
curl -fsSL https://raw.githubusercontent.com/TrueNihilisme/lampac-extra/main/install.sh | sh -s -- /path/to/lampac
```

then restart Lampac twice and disable the built-in `AnimeON` / `Mikai` / `MoonAnime` in `init.conf`.

`EX.AnimeON`, `EX.Mikai`, `EX.MoonAnime` are based on the modules of the same name in
[Lampac NextGen](https://github.com/lampac-nextgen/lampac).
