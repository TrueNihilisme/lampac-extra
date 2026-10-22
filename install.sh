#!/bin/sh
# lampac-extra — встановлення однією командою.
#
#   curl -fsSL https://raw.githubusercontent.com/TrueNihilisme/lampac-extra/main/install.sh | sh -s -- /шлях/до/lampac [опції]
#
#   /шлях/до/lampac          папка, де лежать init.conf і module/ (для Docker — папка на хості, підключена в контейнер)
#   --moonanime-token ТОКЕН  підключити й EX.MoonAnime (токен акаунта, див. README)
#   --animap URL             увімкнути точний вибір аніме за MAL ID (адреса сервісу animap)
#   --restart КОНТЕЙНЕР      після змін двічі перезапустити Docker-контейнер Lampac
#
# Що робить: дописує цей репозиторій у module/repository.yaml (якщо його там ще нема),
# вимикає в init.conf вбудовані AnimeON / Mikai (/ MoonAnime) і додає налаштування EX.*.
# Перед зміною робить копії: init.conf.before-lampac-extra, repository.yaml.before-lampac-extra.
# Потрібен python3 (для правки JSON).
set -eu

REPO="https://github.com/TrueNihilisme/lampac-extra"

dir=""; token=""; animap=""; container=""
while [ $# -gt 0 ]; do
  case "$1" in
    --moonanime-token) token="$2"; shift 2 ;;
    --animap) animap="$2"; shift 2 ;;
    --restart) container="$2"; shift 2 ;;
    -h|--help) sed -n 2,16p "$0" 2>/dev/null || true; exit 0 ;;
    *) dir="$1"; shift ;;
  esac
done

[ -n "$dir" ] || { echo "Вкажіть папку Lampac: sh install.sh /шлях/до/lampac"; exit 1; }
[ -f "$dir/init.conf" ] || { echo "У $dir нема init.conf — це точно папка Lampac?"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Потрібен python3."; exit 1; }
# перевіряємо init.conf ДО будь-яких змін, щоб не лишити півзмінений стан
python3 -c 'import json,sys; json.load(open(sys.argv[1], encoding="utf-8-sig"))' "$dir/init.conf" 2>/dev/null || {
  echo "init.conf не читається як JSON (можливо, там коментарі). Нічого не змінено — додайте налаштування вручну, див. README."; exit 1; }
mkdir -p "$dir/module"

yaml="$dir/module/repository.yaml"
# копії робимо один раз — повторний запуск не затирає оригінал
[ -f "$yaml" ] && [ ! -f "$yaml.before-lampac-extra" ] && cp -p "$yaml" "$yaml.before-lampac-extra"
[ -f "$dir/init.conf.before-lampac-extra" ] || cp -p "$dir/init.conf" "$dir/init.conf.before-lampac-extra"

modules="EX.AnimeON EX.Mikai"
[ -n "$token" ] && modules="$modules EX.MoonAnime"

if [ -f "$yaml" ] && grep -q "lampac-extra" "$yaml"; then
  echo "• repository.yaml: lampac-extra вже є — не чіпаю (перевірте список modules вручну)"
else
  {
    printf '\n- repository: %s\n  branch: main\n  modules:\n' "$REPO"
    for m in $modules; do printf '    - %s\n' "$m"; done
  } >> "$yaml"
  echo "• repository.yaml: додано $modules"
fi

INIT="$dir/init.conf" TOKEN="$token" ANIMAP="$animap" python3 - <<'PY'
import json, os
p = os.environ["INIT"]
try:
    with open(p, encoding="utf-8-sig") as f:
        c = json.load(f)
except ValueError as e:
    raise SystemExit("init.conf не читається як JSON (%s). Можливо, там коментарі — додайте налаштування вручну, див. README." % e)
token, animap = os.environ["TOKEN"], os.environ["ANIMAP"]

off = ["AnimeON", "Mikai"] + (["MoonAnime"] if token else [])
for k in off:
    c.setdefault(k, {}).update({"enable": False, "enabled": False})

for k in ("EX.AnimeON", "EX.Mikai"):
    if animap:
        c.setdefault(k, {})["animap"] = animap
if token:
    c.setdefault("EX.MoonAnime", {})["token"] = token

with open(p, "w", encoding="utf-8") as f:
    json.dump(c, f, ensure_ascii=False, indent=2)
    f.write("\n")
print("• init.conf: вимкнено вбудовані %s%s%s" % (", ".join(off),
      "; animap увімкнено" if animap else "", "; токен MoonAnime додано" if token else ""))
PY

if [ -n "$container" ]; then
  echo "• перезапуск $container (1/2): Lampac завантажує модулі з GitHub…"
  docker restart "$container" >/dev/null
  sleep 60
  echo "• перезапуск $container (2/2): компіляція модулів…"
  docker restart "$container" >/dev/null
  sleep 30
  docker logs --since 2m "$container" 2>&1 | grep -E "loaded module: EX\." || echo "  (рядків loaded module: EX.* поки нема — подивіться лог трохи пізніше)"
else
  echo
  echo "Далі: перезапустіть Lampac ДВІЧІ (перший раз він лише завантажує модулі, другий — компілює)."
  echo "Перевірка: у лозі мають бути рядки 'loaded module: EX.AnimeON' тощо;"
  echo "у Lampa: аніме → Дивитись → Онлайн → Джерело → [UA] AnimeON / [UA] Mikai."
fi
echo "Копії до змін: $dir/init.conf.before-lampac-extra (і repository.yaml.before-lampac-extra, якщо був)."
