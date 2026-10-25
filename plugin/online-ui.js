/* Lampa plugin: a new look for Lampa (TV-first, in the spirit of the Apple TV and Plex apps).
 *
 * - Home: a large header with the still, title, rating and overview of the card the remote is on.
 * - Movie/series card: the still across the width, the TMDB logo instead of the title, meta as pills,
 *   one primary "play / continue S1 E4" pill, glass sections.
 * - "Online" page of Lampac (below): a new screen with a header, filter pills and episode cards.
 * - Menu, settings, select lists, dialogs, search, Lampa's player: floating glass panels and buttons.
 * Colours come from the theme plugins of this repo (Apple TV, Plex); on its own the look is neutral.
 *
 * The "Online" page (Lampac online.js, component `lampac`):
 * online.js stays the engine: it searches the sources, keeps the season/voice/source choice,
 * plays the file and stores the history. This plugin hides its markup and draws its own screen
 * from it; every press on the new screen is passed to the matching original element, so playback,
 * "viewed" marks, history and the context menu behave exactly as before.
 *
 * How it gets the data, without scraping where it can be avoided:
 * - the page's Lampa.Filter instance (seasons, voices, sources) is remembered when online.js
 *   creates it (the constructor is wrapped, nothing else changes);
 * - episodes are read from online.js's own list elements, which it redraws on every choice;
 * - the remote: online.js points Lampa's navigation at its own list; for a page with the new
 *   screen those calls are redirected to the new elements.
 *
 * ES5 and -webkit- prefixes only (Samsung Tizen 4 = Chromium 56: no grid, gap, aspect-ratio,
 * backdrop-filter). No requests of its own: stills, logos and episode data are those Lampa and
 * online.js have already loaded. On by default together with the Apple TV or Plex theme of this repo;
 * Settings → "New Lampa look" can make it always on or off.
 *
 * License: AGPL-3.0 (see LICENSE in the repository root).
 */
(function () {
    'use strict';

    if (window.lampa_online_ui) return;
    window.lampa_online_ui = true;

    var KEY_MODE = 'online_ui_mode';
    /* the theme plugins of this repo whose colours this look is made for */
    var THEME_KEYS = ['theme_apple_tv_on', 'theme_plex_on'];
    var COMPONENTS = ['lampac'];
    var STYLE_ID = 'online-ui-style';

    Lampa.Lang.add({
        online_ui_title: { uk: 'Новий вигляд Lampa', en: 'New Lampa look', ru: 'Новый вид Lampa' },
        online_ui_mode: { uk: 'Увімкнено', en: 'Enabled', ru: 'Включено' },
        online_ui_mode_descr: {
            uk: 'Сторінки, що вже відкриті, оновляться після повторного відкриття',
            en: 'Pages that are already open change when opened again',
            ru: 'Уже открытые страницы обновятся после повторного открытия'
        },
        online_ui_mode_theme: { uk: 'Разом з темою Apple TV або Plex', en: 'With the Apple TV or Plex theme', ru: 'Вместе с темой Apple TV или Plex' },
        online_ui_mode_always: { uk: 'Завжди', en: 'Always', ru: 'Всегда' },
        online_ui_mode_off: { uk: 'Вимкнено', en: 'Off', ru: 'Выключено' },
        online_ui_searching: { uk: 'Шукаємо, де подивитися', en: 'Looking for a source', ru: 'Ищем, где посмотреть' },
        online_ui_searching_sub: { uk: 'Опитуємо джерела', en: 'Checking the sources', ru: 'Опрашиваем источники' },
        online_ui_watch: { uk: 'Дивитися', en: 'Watch', ru: 'Смотреть' },
        online_ui_continue: { uk: 'Продовжити', en: 'Continue', ru: 'Продолжить' },
        online_ui_next: { uk: 'Наступна', en: 'Next', ru: 'Следующая' },
        online_ui_again: { uk: 'Дивитися з початку', en: 'Watch from the start', ru: 'Смотреть с начала' },
        online_ui_seen: { uk: 'Переглянуто', en: 'Watched', ru: 'Просмотрено' },
        online_ui_of: { uk: 'з', en: 'of', ru: 'из' },
        online_ui_left: { uk: 'залишилось', en: 'left', ru: 'осталось' },
        online_ui_source: { uk: 'Джерело', en: 'Source', ru: 'Источник' },
        online_ui_season: { uk: 'Сезон', en: 'Season', ru: 'Сезон' },
        online_ui_voice: { uk: 'Переклад', en: 'Audio', ru: 'Перевод' },
        online_ui_episodes: { uk: 'Серії', en: 'Episodes', ru: 'Серии' },
        online_ui_view: { uk: 'Вигляд', en: 'View', ru: 'Вид' },
        online_ui_view_list: { uk: 'Список', en: 'List', ru: 'Список' },
        online_ui_view_grid: { uk: 'Плитка', en: 'Grid', ru: 'Плитка' },
        online_ui_refine: { uk: 'Уточнити пошук', en: 'Refine search', ru: 'Уточнить поиск' },
        online_ui_new: { uk: 'Нова', en: 'New', ru: 'Новая' },
        online_ui_soon: { uk: 'Вийде', en: 'Out on', ru: 'Выйдет' },
        online_ui_min: { uk: 'хв', en: 'min', ru: 'мин' },
        online_ui_viewed: { uk: 'Переглянуто', en: 'Watched', ru: 'Просмотрено' },
        online_ui_order: { uk: 'Порядок', en: 'Order', ru: 'Порядок' },
        online_ui_order_up: { uk: 'Від першої', en: 'First to last', ru: 'С первой' },
        online_ui_order_down: { uk: 'Від останньої', en: 'Last to first', ru: 'С последней' },
        online_ui_find: { uk: 'Знайти серію', en: 'Find episode', ru: 'Найти серию' }
    });

    var KEY_VIEW = 'online_ui_view';

    function viewMode() {
        return Lampa.Storage.get(KEY_VIEW, 'list') === 'grid' ? 'grid' : 'list';
    }

    function T(key) {
        return Lampa.Lang.translate(key);
    }

    function digits(value) {
        var m = String(value || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
    }

    function pickLogo(movie) {
        var logos = movie && movie.images && movie.images.logos;
        if (!logos || !logos.length) return '';
        var lang = String(Lampa.Storage.get('tmdb_lang', '') || Lampa.Storage.get('language', 'uk')).split(/[-_]/)[0];
        var order = [lang, 'en', null];
        for (var i = 0; i < order.length; i++) {
            for (var j = 0; j < logos.length; j++) {
                if ((logos[j].iso_639_1 || null) === order[i] && logos[j].file_path) return logos[j].file_path;
            }
        }
        return logos[0].file_path || '';
    }

    function isTrue(v) {
        return v === true || v === 'true';
    }

    function isOn() {
        var mode = Lampa.Storage.get(KEY_MODE, 'theme');
        if (mode === 'always') return true;
        if (mode !== 'theme') return false;
        for (var i = 0; i < THEME_KEYS.length; i++) if (isTrue(Lampa.Storage.get(THEME_KEYS[i], false))) return true;
        return false;
    }

    /* ---- the page's filter: remember the instance online.js creates (online.js: new Lampa.Filter(object)) ---- */
    (function () {
        var Original = Lampa.Filter;
        if (!Original || Original.__online_ui) return;
        var Tracked = function (params) {
            var instance = new Original(params);
            if (params && typeof params === 'object') params.__online_ui_filter = instance;
            return instance;
        };
        Tracked.prototype = Original.prototype;
        Tracked.__online_ui = true;
        Lampa.Filter = Tracked;
    })();

    /* ---- pages with the new screen ---- */
    var pages = [];

    function activePage() {
        var a = Lampa.Activity.active();
        for (var i = 0; i < pages.length; i++) if (pages[i].object === a) return pages[i];
        return null;
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }

    function nodeOf(x) {
        return x && x.jquery ? x[0] : x;
    }

    function inside(node, container) {
        node = nodeOf(node);
        return !!(node && container && (node === container || container.contains(node)));
    }

    /* fire a Lampa "hover:*" event on an original element, the way Lampa itself does (jQuery handlers get it too) */
    function fire(target, name) {
        var ev = document.createEvent('Event');
        ev.initEvent(name, false, true);
        target.dispatchEvent(ev);
    }

    function text(node) {
        return node ? (node.textContent || '').replace(/\s+/g, ' ').trim() : '';
    }

    /* ---- reading one original list element ---- */
    function readItem(orig) {
        var img = orig.querySelector('.online-prestige__img img');
        var line = orig.querySelector('.online-prestige__timeline .time-line > div');
        var info = [];
        var spans = orig.querySelectorAll('.online-prestige__info > span:not(.online-prestige-split)');
        for (var i = 0; i < spans.length; i++) if (text(spans[i])) info.push(text(spans[i]));
        var number = text(orig.querySelector('.online-prestige__episode-number'));
        return {
            kind: orig.classList.contains('online-prestige-watched') ? 'continue'
                : orig.classList.contains('online-prestige--folder') ? 'folder' : 'file',
            /* episodes that are not out yet: online.js draws them at half opacity and without an action */
            future: orig.style.opacity === '0.5',
            episode: digits(number),
            title: text(orig.querySelector('.online-prestige__title')) || text(orig.querySelector('.online-prestige-watched__body')),
            time: text(orig.querySelector('.online-prestige__time')),
            number: number,
            quality: text(orig.querySelector('.online-prestige__quality')),
            info: info,
            image: img && img.getAttribute('src') && img.naturalWidth !== 0 ? img.src : '',
            viewed: !!orig.querySelector('.online-prestige__viewed'),
            percent: line ? parseFloat(line.style.width) || 0 : 0
        };
    }

    /* "01:02" -> 62 */
    function minutes(time) {
        var m = String(time || '').match(/(\d+):(\d+)/);
        return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
    }

    function episodeData(page, number) {
        var list = page.episodes || [];
        for (var i = 0; i < list.length; i++) if (list[i].episode_number === number) return list[i];
        return null;
    }

    /* small labels on an episode: quality, new, out on <date>, time left, UA / SUB */
    function tagsFor(page, d) {
        var tags = [];
        if (d.kind !== 'file') return tags;
        var ep = d.episode ? episodeData(page, d.episode) : null;

        if (d.future) {
            /* online.js puts "days left: N" into the quality field of such episodes; prefer the real date */
            tags.push(['soon', ep && ep.air_date ? T('online_ui_soon') + ' ' + Lampa.Utils.parseTime(ep.air_date).full : d.quality]);
            return tags;
        }
        if (d.quality) tags.push(['quality', d.quality]);
        if (ep && ep.air_date) {
            var age = (Date.now() - new Date(ep.air_date.replace(/-/g, '/')).getTime()) / 86400000;
            if (age >= 0 && age <= 7) tags.push(['new', T('online_ui_new')]);
        }
        if (d.percent > 0 && d.percent < 90) {
            var total = ep && ep.runtime ? ep.runtime : minutes(d.time);
            if (total) tags.push(['left', T('online_ui_left') + ' ' + Math.max(1, Math.round(total * (1 - d.percent / 100))) + ' ' + T('online_ui_min')]);
        }
        /* language from the voice name and the source title ("[UA] ...") */
        var voice = d.info.join(' ') + ' ' + (page.sourceTitle || '');
        if (/\[ua\]|укр|україн/i.test(voice)) tags.push(['ua', 'UA']);
        if (/субт|subt|\bsub\b/i.test(voice)) tags.push(['sub', 'SUB']);
        return tags;
    }

    function buildCard(page, orig) {
        var d = readItem(orig);
        var card = el('div', 'oui-card selector oui-card--' + d.kind + (d.future ? ' oui-card--future' : ''));

        if (d.kind === 'file') {
            var thumb = el('div', 'oui-card__thumb');
            if (d.image) {
                var img = el('img');
                img.alt = '';
                img.src = d.image;
                thumb.appendChild(img);
            }
            if (d.number) thumb.appendChild(el('div', 'oui-card__num', d.number));
            if (d.viewed) thumb.appendChild(el('div', 'oui-card__viewed', '✓ ' + T('online_ui_viewed')));
            if (d.percent) {
                var bar = el('div', 'oui-card__bar');
                var fill = el('div');
                fill.style.width = Math.min(100, d.percent) + '%';
                bar.appendChild(fill);
                thumb.appendChild(bar);
            }
            card.appendChild(thumb);
        }

        var body = el('div', 'oui-card__body');
        var head = el('div', 'oui-card__head');
        head.appendChild(el('div', 'oui-card__title', d.title));
        if (d.time) head.appendChild(el('div', 'oui-card__time', d.time));
        body.appendChild(head);
        if (d.info.length) body.appendChild(el('div', 'oui-card__meta', d.info.join(' · ')));

        var tags = tagsFor(page, d);
        if (tags.length) {
            var row = el('div', 'oui-tags');
            for (var t = 0; t < tags.length; t++) row.appendChild(el('span', 'oui-tag oui-tag--' + tags[t][0], tags[t][1]));
            body.appendChild(row);
        }
        card.appendChild(body);

        $(card).on('hover:enter', function () { fire(orig, 'hover:enter'); })
            .on('hover:long', function () { fire(orig, 'hover:long'); })
            .on('hover:focus', function () {
                page.last = card;
                page.scroll.update($(card), true);
            });
        card.__oui_orig = orig;
        return card;
    }

    /* no episodes yet: online.js shows either its loading placeholders (no title) or a message with
       "cancel" / "change source" buttons and a countdown to the next source; mirror it, buttons go to the originals */
    function renderState(page) {
        var body = page.origBody;
        var title = body.querySelector('.online-empty__title');
        var loading = !title;
        var box = el('div', 'oui-state');
        box.appendChild(el('div', 'oui-state__title', loading ? T('online_ui_searching') : text(title)));
        var sub = loading ? T('online_ui_searching_sub') : text(body.querySelector('.online-empty__time'));
        if (sub) box.appendChild(el('div', 'oui-state__text', sub));
        if (loading) box.appendChild(el('div', 'oui-state__pulse'));

        var buttons = body.querySelectorAll('.selector:not(.online-empty-template)');
        if (buttons.length) {
            var row = el('div', 'oui-state__buttons');
            for (var i = 0; i < buttons.length; i++) {
                (function (orig) {
                    var b = el('div', 'oui-chip selector', text(orig));
                    b.__oui_orig = orig;
                    $(b).on('hover:enter', function () { fire(orig, 'hover:enter'); })
                        .on('hover:focus', function () { page.last = b; page.scroll.update($(b), true); });
                    row.appendChild(b);
                    page.cards.push(b);
                })(buttons[i]);
            }
            box.appendChild(row);
        }
        page.list.appendChild(box);
    }

    /* online.js redrew its list (new season, voice, source, or results arrived): redraw ours */
    function rebuild(page) {
        page.pending = false;
        var originals = page.origBody.querySelectorAll('.online-prestige');
        var list = page.list;
        var lastOrig = page.last && page.last.__oui_orig;

        var keepPlay = page.last === page.play;

        while (list.firstChild) list.removeChild(list.firstChild);
        page.cards = [];
        var files = [];

        if (!originals.length) renderState(page);
        page.sourceTitle = choice(page).source;
        var order = [];
        for (var i = 0; i < originals.length; i++) {
            /* online.js's "continue / no history" row: the big button in the header replaces it */
            if (!originals[i].classList.contains('online-prestige-watched')) order.push(originals[i]);
        }
        if (page.object.__oui_reverse) order.reverse();

        for (var o = 0; o < order.length; o++) {
            var card = buildCard(page, order[o]);
            page.cards.push(card);
            list.appendChild(card);
            var data = readItem(order[o]);
            if (data.kind === 'file' && !data.future) files.push({ orig: order[o], data: data });
        }
        /* the header logic (continue / next / progress) always works in episode order */
        if (page.object.__oui_reverse) files.reverse();
        updateHero(page, files);

        var lastChip = page.last && page.last.__oui_key ? page.last : null;
        page.last = keepPlay ? page.play : lastChip;
        updateChips(page, files);
        if (lastOrig) for (var j = 0; j < page.cards.length; j++) if (page.cards[j].__oui_orig === lastOrig) page.last = page.cards[j];

        /* the remote is on this page: point it at the new elements */
        if (Lampa.Controller.enabled().name === 'content' && activePage() === page) focusPage(page);
    }

    /* where the remote lands on a fresh page: the big button, else the first episode */
    function firstFocus(page) {
        return page.play && page.play.style.display !== 'none' ? page.play : page.cards[0] || false;
    }

    function focusPage(page, target) {
        redirecting = true;
        try {
            Lampa.Controller.collectionSet(page.root);
            Lampa.Controller.collectionFocus(target || page.last || firstFocus(page), page.root);
        } finally {
            redirecting = false;
        }
    }

    var PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

    /* the static part of the header: backdrop, logo (or title), meta, overview */
    function buildHero(page) {
        var movie = page.object.movie || {};
        var card = page.explorer;
        var hero = el('div', 'oui-hero');

        if (movie.backdrop_path) {
            var art = el('div', 'oui-hero__art');
            var still = el('img');
            still.alt = '';
            still.onload = function () { art.classList.add('oui-hero__art--loaded'); };
            still.src = Lampa.TMDB.image('t/p/w1280' + movie.backdrop_path);
            art.appendChild(still);
            hero.appendChild(art);
        }

        var body = el('div', 'oui-hero__body');
        var title = el('div', 'oui-hero__title', movie.title || movie.name || '');
        var logoPath = pickLogo(movie);
        if (logoPath) {
            var logo = el('img', 'oui-hero__logo');
            logo.alt = '';
            logo.onload = function () { title.textContent = ''; title.appendChild(logo); title.classList.add('oui-hero__title--logo'); };
            logo.src = Lampa.TMDB.image('t/p/w500' + logoPath);
        }
        body.appendChild(title);

        /* Lampa already filled its (hidden) card with year-country, age and genres: reuse them */
        var meta = el('div', 'oui-hero__meta');
        page.metaQuality = el('span', 'oui-badge oui-badge--quality');
        meta.appendChild(page.metaQuality);
        if (movie.vote_average) meta.appendChild(el('span', 'oui-hero__rate', '★ ' + parseFloat(movie.vote_average).toFixed(1)));
        var created = text(card.querySelector('.explorer-card__head-create'));
        if (created) meta.appendChild(el('span', 'oui-hero__fact', created));
        page.metaTime = el('span', 'oui-hero__fact');
        meta.appendChild(page.metaTime);
        var age = text(card.querySelector('.explorer-card__head-age'));
        if (age) meta.appendChild(el('span', 'oui-badge', age));
        body.appendChild(meta);

        var genres = text(card.querySelector('.explorer-card__genres'));
        if (genres) body.appendChild(el('div', 'oui-hero__genres', genres));
        var overview = movie.overview || text(card.querySelector('.explorer-card__descr'));
        if (overview) body.appendChild(el('div', 'oui-hero__descr', overview));

        var actions = el('div', 'oui-hero__actions');
        page.play = el('div', 'oui-play selector');
        page.play.innerHTML = PLAY_ICON;
        page.playText = el('span', 'oui-play__text', T('online_ui_watch'));
        page.play.appendChild(page.playText);
        $(page.play).on('hover:enter', function () { if (page.playTarget) fire(page.playTarget, 'hover:enter'); })
            .on('hover:focus', function () { page.last = page.play; page.scroll.update($(page.play), true); });
        actions.appendChild(page.play);
        body.appendChild(actions);

        page.heroLine = el('div', 'oui-hero__line');
        body.appendChild(page.heroLine);

        page.progress = el('div', 'oui-progress');
        page.progressText = el('div', 'oui-progress__text');
        page.progressFill = el('div');
        var bar = el('div', 'oui-progress__bar');
        bar.appendChild(page.progressFill);
        page.progress.appendChild(page.progressText);
        page.progress.appendChild(bar);
        body.appendChild(page.progress);

        hero.appendChild(body);
        return hero;
    }

    /* the season/voice/source the page shows now, from online.js's filter */
    function choice(page) {
        var f = page.object.__online_ui_filter;
        var out = { source: '', voice: '', season: 0 };
        if (!f || !f.get) return out;
        var sort = f.get('sort') || [];
        for (var i = 0; i < sort.length; i++) if (sort[i].selected) out.source = sort[i].title;
        var rows = f.get('filter') || [];
        for (var j = 0; j < rows.length; j++) {
            if (rows[j].stype === 'voice') out.voice = rows[j].subtitle || '';
            if (rows[j].stype === 'season') out.season = digits(rows[j].subtitle);
        }
        return out;
    }

    /* the dynamic part: which episode the big button starts, the source line and the season progress */
    function updateHero(page, files) {
        var serial = !!(page.object.movie && page.object.movie.name);
        var now = choice(page);
        var qualities = {};
        var best = '';

        for (var i = 0; i < files.length; i++) {
            var q = files[i].data.quality;
            if (q) qualities[q] = (qualities[q] || 0) + 1;
            if (q && (!best || qualities[q] > qualities[best])) best = q;
        }
        page.metaQuality.textContent = best;
        page.metaQuality.style.display = best ? '' : 'none';
        page.metaTime.textContent = files.length ? files[0].data.time : '';
        page.heroLine.textContent = [now.source, now.voice].filter(Boolean).join(' · ');

        /* in progress -> Continue; after the last watched -> Next; none watched -> Watch; all watched -> from the start */
        var target = null, label = 'online_ui_watch', lastSeen = -1, seen = 0;
        for (var k = 0; k < files.length; k++) {
            var d = files[k].data;
            if (d.viewed) { seen++; lastSeen = k; }
            if (!target && d.percent > 0 && d.percent < 90) { target = files[k]; label = 'online_ui_continue'; }
        }
        if (!target && files.length) {
            if (lastSeen === -1) target = files[0];
            else if (lastSeen + 1 < files.length) { target = files[lastSeen + 1]; label = 'online_ui_next'; }
            else { target = files[0]; label = 'online_ui_again'; }
        }

        page.playTarget = target ? target.orig : null;
        page.play.style.display = target ? '' : 'none';
        var where = '';
        if (target && serial) {
            var ep = digits(target.data.number) || files.indexOf(target) + 1;
            where = ' · ' + (now.season ? 'S' + now.season + ' ' : '') + 'E' + ep;
        }
        page.playText.textContent = T(label) + where;

        page.progress.style.display = serial && files.length ? '' : 'none';
        if (serial && files.length) {
            page.progressText.textContent = T('online_ui_seen') + ' ' + seen + ' ' + T('online_ui_of') + ' ' + files.length +
                ' · ' + T('online_ui_left') + ' ' + (files.length - seen);
            page.progressFill.style.width = Math.round(seen / files.length * 100) + '%';
        }
    }

    /* ---- the filter row: one pill per choice, each opening its own list ---- */
    var GRID_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1.6"/><rect x="13" y="3" width="8" height="8" rx="1.6"/>' +
        '<rect x="3" y="13" width="8" height="8" rx="1.6"/><rect x="13" y="13" width="8" height="8" rx="1.6"/></svg>';
    var LIST_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="4" rx="1.4"/><rect x="3" y="10" width="18" height="4" rx="1.4"/>' +
        '<rect x="3" y="16" width="18" height="4" rx="1.4"/></svg>';
    var SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4" stroke-linecap="round"/></svg>';

    function chip(page, key, label, value, icon, onEnter) {
        var c = el('div', 'oui-chip selector');
        if (icon) c.innerHTML = icon;
        if (label) c.appendChild(el('span', 'oui-chip__label', label));
        if (value) c.appendChild(el('span', 'oui-chip__value', value));
        c.__oui_key = key;
        $(c).on('hover:enter', onEnter).on('hover:focus', function () {
            page.last = c;
            page.scroll.update($(c), true);
        });
        page.chips.appendChild(c);
        return c;
    }

    function openSelect(title, items, onSelect) {
        Lampa.Select.show({
            title: title,
            items: items,
            onSelect: onSelect,
            onBack: function () { Lampa.Controller.toggle('content'); }
        });
    }

    function updateChips(page, files) {
        var f = page.object.__online_ui_filter;
        var serial = !!(page.object.movie && page.object.movie.name);
        var row = page.chips;
        var lastKey = page.last && page.last.__oui_key;

        while (row.firstChild) row.removeChild(row.firstChild);

        if (f && f.get) {
            var sort = f.get('sort') || [];
            var current = '';
            for (var i = 0; i < sort.length; i++) if (sort[i].selected) current = sort[i].title;
            if (sort.length) chip(page, 'source', T('online_ui_source'), current, '', function () {
                openSelect(T('online_ui_source'), sort, function (a) {
                    for (var k = 0; k < sort.length; k++) sort[k].selected = sort[k] === a;
                    f.onSelect('sort', a);   /* online.js closes the list and switches the source */
                });
            });

            var rows = f.get('filter') || [];
            ['season', 'voice'].forEach(function (stype) {
                for (var j = 0; j < rows.length; j++) {
                    if (rows[j].stype !== stype || !rows[j].items || !rows[j].items.length) continue;
                    (function (r) {
                        chip(page, stype, T(stype === 'season' ? 'online_ui_season' : 'online_ui_voice'), r.subtitle || '', '', function () {
                            openSelect(r.title, r.items, function (b) {
                                for (var k = 0; k < r.items.length; k++) r.items[k].selected = r.items[k] === b;
                                f.onSelect('filter', r, b);   /* online.js reloads the list and closes */
                            });
                        });
                    })(rows[j]);
                }
            });
        }

        /* long seasons: jump to a block of ten */
        if (serial && files.length > 12) {
            chip(page, 'episodes', T('online_ui_episodes'), '1–' + files.length, '', function () {
                var blocks = [];
                for (var s = 0; s < files.length; s += 10) {
                    blocks.push({ title: (s + 1) + '–' + Math.min(s + 10, files.length), start: s });
                }
                openSelect(T('online_ui_episodes'), blocks, function (b) {
                    var card = null;
                    for (var c = 0; c < page.cards.length; c++) if (page.cards[c].__oui_orig === files[b.start].orig) card = page.cards[c];
                    page.last = card;
                    Lampa.Select.close();
                });
            });
        }

        if (serial && files.length > 1) {
            var reversed = !!page.object.__oui_reverse;
            chip(page, 'order', T('online_ui_order'), T(reversed ? 'online_ui_order_down' : 'online_ui_order_up'), '', function () {
                page.object.__oui_reverse = !reversed;
                rebuild(page);
            });
            /* type an episode number, the remote lands on it */
            chip(page, 'find', '', T('online_ui_find'), SEARCH_ICON, function () {
                Lampa.Input.edit({ free: true, title: T('online_ui_find'), nosave: true, value: '', layout: 'nums', keyboard: 'lampa' }, function (value) {
                    var wanted = digits(value);
                    for (var c = 0; c < page.cards.length; c++) {
                        if (page.cards[c].__oui_orig && readItem(page.cards[c].__oui_orig).episode === wanted) page.last = page.cards[c];
                    }
                    Lampa.Controller.toggle('content');
                });
            });
        }

        var grid = viewMode() === 'grid';
        chip(page, 'view', '', T(grid ? 'online_ui_view_grid' : 'online_ui_view_list'), grid ? GRID_ICON : LIST_ICON, function () {
            Lampa.Storage.set(KEY_VIEW, grid ? 'list' : 'grid');
            page.root.classList.toggle('oui--grid', !grid);
            rebuild(page);
        });

        var search = page.explorer.querySelector('.filter--search');
        if (search) chip(page, 'refine', '', T('online_ui_refine'), SEARCH_ICON, function () { fire(search, 'hover:enter'); });

        if (lastKey) for (var n = 0; n < row.childNodes.length; n++) if (row.childNodes[n].__oui_key === lastKey) page.last = row.childNodes[n];
    }

    function mount(object) {
        var root = object.activity && object.activity.render && nodeOf(object.activity.render());
        var explorer = root && root.querySelector('.explorer');
        var origBody = explorer && explorer.querySelector('.explorer__files-body .scroll__body');
        if (!origBody || root.querySelector('.oui')) return;

        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var ui = el('div', 'oui');
        var content = el('div', 'oui-content');
        var list = el('div', 'oui-list');
        scroll.append(content);

        /* glass needs something behind it: the same still, small, blurred and darkened, under the whole page.
           A blurred image (filter) works on Tizen 4, which has no backdrop-filter; a 300px still is cheap to decode. */
        var movie = object.movie || {};
        if (movie.backdrop_path) {
            var bg = el('div', 'oui-bg');
            var bgImg = el('img');
            bgImg.alt = '';
            bgImg.onload = function () { bg.classList.add('oui-bg--loaded'); };
            bgImg.src = Lampa.TMDB.image('t/p/w300' + movie.backdrop_path);
            bg.appendChild(bgImg);
            ui.appendChild(bg);
        }
        ui.appendChild(scroll.render()[0]);

        explorer.classList.add('oui-host');
        explorer.parentNode.insertBefore(ui, explorer.nextSibling);
        /* height = the rest of the screen below the scroll's top (Lampa's Layer does the measuring) */
        scroll.minus();
        if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update(ui);

        var page = {
            object: object, root: ui, explorer: explorer, origBody: origBody,
            scroll: scroll, list: list, cards: [], last: null, pending: false, observer: null
        };
        /* online.js loads the season's episodes from TMDB (getEpisodes) before drawing the list: keep a copy
           for the dates and runtimes on the labels, so no request of our own is needed */
        var comp = object.activity && object.activity.component;
        if (comp && typeof comp.getEpisodes === 'function' && !comp.__online_ui) {
            var getEpisodes = comp.getEpisodes;
            comp.getEpisodes = function (season, call) {
                return getEpisodes.call(this, season, function (episodes) {
                    page.episodes = episodes || [];
                    call(episodes);
                });
            };
            comp.__online_ui = true;
        }

        content.appendChild(buildHero(page));
        page.chips = el('div', 'oui-chips');
        content.appendChild(page.chips);
        content.appendChild(list);
        if (viewMode() === 'grid') ui.classList.add('oui--grid');
        pages.push(page);

        page.observer = new MutationObserver(function () {
            if (page.pending) return;
            page.pending = true;
            setTimeout(function () { if (pages.indexOf(page) !== -1) rebuild(page); }, 120);
        });
        page.observer.observe(origBody, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'src', 'style'] });
        rebuild(page);
    }

    function unmount(object) {
        for (var i = pages.length - 1; i >= 0; i--) {
            if (pages[i].object !== object) continue;
            pages[i].observer.disconnect();
            pages[i].scroll.destroy();
            pages.splice(i, 1);
        }
    }

    /* ---- the movie/series card (component `full`): Lampa's own markup and navigation, a new layout ----
     * Lampa sends `full: complite` with the loaded movie (incl. images.logos) once the card is built; it already
     * puts a 1280px still (.full-start__background) behind the page. Here: no side poster, the still across the
     * width, the logo instead of the title, meta as pills, a short overview and one primary "play" pill. */
    function decorateFull(event) {
        var root = nodeOf(event.body);
        var fs = root && root.querySelector('.full-start-new');
        var movie = event.data && event.data.movie;
        if (!fs || !movie || fs.classList.contains('oui-fs')) return;

        root.classList.add('oui-fullpage');
        fs.classList.add('oui-fs');

        var title = fs.querySelector('.full-start-new__title');
        var logoPath = pickLogo(movie);
        if (title && logoPath) {
            var logo = el('img', 'oui-fs__logo');
            logo.alt = '';
            logo.onload = function () { title.classList.add('oui-fs__title--logo'); };
            logo.onerror = function () { if (logo.parentNode) logo.parentNode.removeChild(logo); };
            logo.src = Lampa.TMDB.image('t/p/w500' + logoPath);
            title.appendChild(logo);
        }

        var details = fs.querySelector('.full-start-new__details');
        if (details && movie.overview) details.parentNode.insertBefore(el('div', 'oui-fs__descr', movie.overview), details.nextSibling);

        /* the play pill says where it continues, from online.js's history (online_watched_last) */
        var play = fs.querySelector('.button--play span');
        var history = Lampa.Storage.cache('online_watched_last', 5000, {});
        var last = history[Lampa.Utils.hash(movie.number_of_seasons ? movie.original_name : movie.original_title)];
        if (play && last && last.episode) {
            play.textContent = T('online_ui_continue') + ' · ' + (last.season ? 'S' + last.season + ' ' : '') + 'E' + last.episode;
        }
    }

    /* ---- home screen (component `main`): a large header showing the card the remote is on ----
     * Lampa keeps a card's data on its element (card.card_data: title, dates, backdrop, rating, overview).
     * Its "hover:focus" events do not bubble, but a capturing listener still sees them, so no hook into
     * Lampa's cards is needed. The rows keep their own scroll; Lampa's Layer subtracts the header height
     * from it (the scroll's `mheight`). */
    var spots = [];

    function mountMain(object) {
        var root = object.activity && object.activity.render && nodeOf(object.activity.render());
        var host = root && root.querySelector('.activity__body > div');
        var scrollEl = host && host.querySelector('.scroll');
        if (!scrollEl || host.querySelector('.oui-spot')) return;

        var spot = el('div', 'oui-spot');
        var art = el('div', 'oui-spot__art');
        var imgs = [el('img'), el('img')];
        imgs[0].alt = imgs[1].alt = '';
        art.appendChild(imgs[0]);
        art.appendChild(imgs[1]);
        var body = el('div', 'oui-spot__body');
        var title = el('div', 'oui-spot__title');
        var meta = el('div', 'oui-spot__meta');
        var descr = el('div', 'oui-spot__descr');
        body.appendChild(title);
        body.appendChild(meta);
        body.appendChild(descr);
        spot.appendChild(art);
        spot.appendChild(body);
        host.classList.add('oui-main');
        host.insertBefore(spot, scrollEl);

        scrollEl.mheight = spot;
        if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update(host);

        spots.push({ object: object, host: host, title: title, meta: meta, descr: descr, imgs: imgs, front: 0, data: null, timer: 0 });
    }

    function showSpot(s, data) {
        if (s.data === data) return;
        s.data = data;
        s.title.textContent = data.title || data.name || '';
        var date = String(data.release_date || data.first_air_date || '');
        var bits = [];
        if (data.vote_average) bits.push('★ ' + parseFloat(data.vote_average).toFixed(1));
        if (date.length >= 4) bits.push(date.slice(0, 4));
        s.meta.textContent = bits.join('   ');
        s.descr.textContent = data.overview || '';

        /* cross-fade between two images; wait for the new one so a half-loaded picture never shows */
        if (!data.backdrop_path) return;
        var next = s.imgs[1 - s.front];
        next.onload = function () {
            if (s.data !== data) return;
            next.classList.add('oui-spot__img--on');
            s.imgs[s.front].classList.remove('oui-spot__img--on');
            s.front = 1 - s.front;
        };
        next.src = Lampa.TMDB.image('t/p/w1280' + data.backdrop_path);
    }

    document.addEventListener('hover:focus', function (event) {
        var target = event.target;
        if (!target || !target.card_data) return;
        for (var i = 0; i < spots.length; i++) {
            var s = spots[i];
            if (!s.host.contains(target)) continue;
            /* moving fast along a row: only the card the remote stops on loads its still */
            clearTimeout(s.timer);
            s.timer = setTimeout(function (spot, data) { return function () { showSpot(spot, data); }; }(s, target.card_data), 220);
        }
    }, true);

    /* ---- the remote: online.js calls collectionSet/collectionFocus with its own list; redirect them ---- */
    var redirecting = false;
    (function () {
        var C = Lampa.Controller;
        var set = C.collectionSet;
        var focus = C.collectionFocus;

        C.collectionSet = function (html) {
            var page = !redirecting && activePage();
            if (page && inside(html, page.explorer)) return set.call(this, page.root);
            return set.apply(this, arguments);
        };
        C.collectionFocus = function (target, html) {
            var page = !redirecting && activePage();
            if (page && (inside(html, page.explorer) || inside(target, page.explorer))) {
                var mapped = null;
                var t = nodeOf(target);
                for (var i = 0; i < page.cards.length; i++) if (page.cards[i].__oui_orig === t) mapped = page.cards[i];
                return focus.call(this, mapped || page.last || firstFocus(page), page.root);
            }
            return focus.apply(this, arguments);
        };
    })();

    /* Lampa's side menu, settings, select lists and dialogs become floating glass sheets: inset from the screen
     * edge, rounded, translucent with a light rim, blurred where the engine has backdrop-filter (not Tizen 4).
     * Selectors are one level more specific than the themes' panel colours, so the glass wins over them; a theme
     * that wants solid panels (Plex) overrides with body.theme--x.oui-on. */
    function panelsCss() {
        var g = 'body.oui-on';
        var sheets = [g + ' .settings .settings__content', g + ' .selectbox .selectbox__content'];
        var panels = sheets.concat([g + ' .wrap__left .menu', g + ' .modal .modal__content']);
        var lift = '0 1.6em 3.2em rgba(0, 0, 0, 0.55)';
        return [
            panels.join(', ') + ' { background: rgba(30, 30, 34, 0.84) !important; border: 1px solid rgba(255, 255, 255, 0.12); ' +
                '-webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16); }',
            '@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {\n' + panels.join(', ') +
                ' { background: rgba(30, 30, 34, 0.55) !important; -webkit-backdrop-filter: blur(2.2em) saturate(1.7); backdrop-filter: blur(2.2em) saturate(1.7); }\n}',
            /* sheets: inset from the right edge only while open, so a closed one stays fully off screen */
            sheets.join(', ') + ' { top: 0.8em !important; bottom: 0.8em !important; height: auto !important; -webkit-border-radius: 1.6em; border-radius: 1.6em; overflow: hidden; }',
            g + '.settings--open .settings .settings__content, ' + g + '.selectbox--open .selectbox .selectbox__content { ' +
                '-webkit-transform: translate3d(-100%, 0, 0) translateX(-0.8em); transform: translate3d(-100%, 0, 0) translateX(-0.8em); ' +
                '-webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), ' + lift + '; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), ' + lift + '; }',
            g + ' .settings__head, ' + g + ' .selectbox__head { border-bottom-color: rgba(255, 255, 255, 0.1) !important; }',
            g + ' .settings-folder, ' + g + ' .settings-param, ' + g + ' .selectbox-item { margin: 0 0.6em; -webkit-border-radius: 1em; border-radius: 1em; }',
            /* side menu: a floating column instead of a full-height strip */
            g + ' .wrap__left .menu { margin: 0.6em 0 0.6em 0.6em; padding: 0.6em 0.6em 0.6em 0; -webkit-border-radius: 1.6em; border-radius: 1.6em; }',
            g + ' .menu__item { -webkit-border-radius: 1em; border-radius: 1em; }',
            g + ' .modal .modal__content { -webkit-border-radius: 1.6em; border-radius: 1.6em; }',
            /* header buttons as round glass buttons */
            g + ' .head__action { -webkit-border-radius: 50%; border-radius: 50%; background-color: rgba(255, 255, 255, 0.08); margin-left: 0.4em; }',
            /* search: glass keys, white focus, sources and history as pills */
            g + ' .simple-keyboard .hg-button { -webkit-border-radius: 1em; border-radius: 1em; background: rgba(255, 255, 255, 0.08); ' +
                'border: 1px solid rgba(255, 255, 255, 0.08); -webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14); }',
            g + ' .simple-keyboard .hg-button.focus, ' + g + ' .simple-keyboard .hg-button.hg-activeButton { background: #fff; color: #000; }',
            g + ' .search-source, ' + g + ' .search-history-key { -webkit-border-radius: 2em; border-radius: 2em; padding: 0.35em 1em; ' +
                'background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.1); }',
            /* the chosen source stays solid white with a dark label (Lampa's own .active), focus too */
            g + ' .search-source.active, ' + g + ' .search-source.focus { background: #fff; color: #000; opacity: 1; }'
        ].join('\n');
    }

    /* Lampa's own player (Samsung/webOS; Android boxes usually hand the file to an external player):
     * a soft dark fade at the bottom and top for legibility, the control bar as a floating glass bar,
     * round glass buttons with a bigger play button, meta as pills, the "next episode" card as glass. */
    function playerCss() {
        var g = 'body.oui-on';
        var glass = 'background: rgba(20, 20, 24, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); ' +
            '-webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 1em 2.4em rgba(0, 0, 0, 0.45); ' +
            'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 1em 2.4em rgba(0, 0, 0, 0.45);';
        var bars = [g + ' .player-panel__body', g + ' .player-next', g + ' .player-footer-card'];
        return [
            g + ' .player-panel::before { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 22em; pointer-events: none; ' +
                'background: -webkit-linear-gradient(bottom, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%); ' +
                'background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%); }',
            g + ' .player-info::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 14em; pointer-events: none; ' +
                'background: -webkit-linear-gradient(top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%); ' +
                'background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%); }',
            g + ' .player-info__body { position: relative; }',
            g + ' .player-panel__body { margin: 0 1.5em 1.5em; padding: 1.2em 1.6em; -webkit-border-radius: 1.8em; border-radius: 1.8em; ' + glass + ' }',
            g + ' .player-next, ' + g + ' .player-footer-card { -webkit-border-radius: 1.4em; border-radius: 1.4em; padding: 0.7em; ' + glass + ' }',
            g + ' .player-next__thumbnail, ' + g + ' .player-next__thumbnail-img, ' + g + ' .player-footer-card__poster, ' + g + ' .player-footer-card__poster-img { ' +
                '-webkit-border-radius: 0.9em; border-radius: 0.9em; overflow: hidden; }',
            '@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {\n' + bars.join(', ') +
                ' { background: rgba(20, 20, 24, 0.4); -webkit-backdrop-filter: blur(1.8em) saturate(1.6); backdrop-filter: blur(1.8em) saturate(1.6); }\n}',
            g + ' .player-panel__timeline { height: 0.35em; background-color: rgba(255, 255, 255, 0.22); }',
            g + ' .player-panel .button { background-color: rgba(255, 255, 255, 0.1); margin: 0 0.25em; }',
            g + ' .player-panel__playpause { background-color: rgba(255, 255, 255, 0.2); font-size: 1.6em; }',
            /* pills on the inner span: Lampa keeps empty values (speed, peers…) as a div with an empty span */
            g + ' .player-info__values > div > span { display: inline-block; padding: 0.05em 0.8em; -webkit-border-radius: 2em; border-radius: 2em; ' +
                'background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.12); }',
            g + ' .player-info__values > div > span:empty { display: none; }',
            g + ' .player-info__name { font-size: 1.4em; font-weight: 700; }'
        ].join('\n');
    }

    /* ---- a neutral look; the themes restyle .oui ---- */
    function css() {
        return [
            '.explorer.oui-host { display: none !important; }',

            /* ---- menu, settings, lists, dialogs: floating glass panels (body.oui-on = this plugin is on) ---- */
            panelsCss(),
            playerCss(),

            /* ---- home screen header ---- */
            '.oui-spot { position: relative; height: 42vh; overflow: hidden; }',
            /* the rows share the screen with the header: cards are sized in em, so a smaller font scales them */
            '.oui-main > .scroll .items-line__body { font-size: 0.72em; }',
            '.oui-spot__art { position: absolute; top: 0; left: 0; right: 0; bottom: 0; ' +
                '-webkit-mask-image: -webkit-linear-gradient(top, #000 60%, rgba(0, 0, 0, 0) 100%); ' +
                'mask-image: linear-gradient(to bottom, #000 60%, rgba(0, 0, 0, 0) 100%); }',
            '.oui-spot__art > img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 25%; ' +
                'opacity: 0; -webkit-transition: opacity 0.6s; transition: opacity 0.6s; }',
            '.oui-spot__art > img.oui-spot__img--on { opacity: 1; }',
            '.oui-spot__art::after { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; ' +
                'background: -webkit-linear-gradient(left, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 80%); ' +
                'background: linear-gradient(to right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 80%); }',
            '.oui-spot__body { position: absolute; left: 1.5em; bottom: 1.4em; width: 55%; }',
            '.oui-spot__title { font-size: 2.8em; font-weight: 700; line-height: 1.1; ' +
                'display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; ' +
                'text-shadow: 0 0.05em 0.3em rgba(0, 0, 0, 0.5); }',
            '.oui-spot__meta { margin-top: 0.5em; font-size: 1.15em; font-weight: 600; white-space: pre; }',
            '.oui-spot__descr { margin-top: 0.6em; max-width: 40em; font-size: 1.05em; line-height: 1.45; opacity: 0.82; ' +
                'display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }',

            /* ---- movie/series card ---- */
            '.oui-fullpage .full-start__background { left: 0; width: 100%; height: 100%; top: 0; ' +
                '-webkit-mask-image: -webkit-linear-gradient(top, #000 50%, rgba(0, 0, 0, 0) 100%); ' +
                'mask-image: linear-gradient(to bottom, #000 50%, rgba(0, 0, 0, 0) 100%); ' +
                '-webkit-mask-size: auto; mask-size: auto; }',
            '.oui-fullpage .full-start__background.loaded { opacity: 0.8; }',
            '.oui-fullpage .full-start__background.dim { opacity: 0.25; }',
            '.oui-fs { position: relative; }',
            /* darker towards the text on the left, so the logo and the overview stay readable on any still */
            '.oui-fs::before { content: ""; position: absolute; left: -1.5em; top: -12em; bottom: 0; width: 75%; pointer-events: none; ' +
                'background: -webkit-linear-gradient(left, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.35) 60%, rgba(0, 0, 0, 0) 100%); ' +
                'background: linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.35) 60%, rgba(0, 0, 0, 0) 100%); }',
            '.oui-fs .full-start-new__left { display: none; }',
            '.oui-fs .full-start-new__body { position: relative; min-height: 26em; }',
            '.oui-fs .full-start-new__right { max-width: 60%; }',
            '.oui-fs .full-start-new__title.oui-fs__title--logo { font-size: 1em; color: transparent; line-height: 0; overflow: visible; ' +
                'display: block; -webkit-line-clamp: unset; margin-bottom: 1em; }',
            '.oui-fs__logo { display: none; max-width: 70%; max-height: 7.5em; ' +
                '-webkit-filter: drop-shadow(0 0.1em 0.4em rgba(0, 0, 0, 0.6)); filter: drop-shadow(0 0.1em 0.4em rgba(0, 0, 0, 0.6)); }',
            '.oui-fs__title--logo .oui-fs__logo { display: block; }',
            '.oui-fs .full-start-new__rate-line { margin-bottom: 1em; -webkit-flex-wrap: wrap; flex-wrap: wrap; }',
            '.oui-fs .full-start__rate, .oui-fs .full-start__pg, .oui-fs .full-start__status { ' +
                'background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.14); ' +
                '-webkit-border-radius: 2em; border-radius: 2em; padding: 0.15em 0.75em; font-size: 1.05em; }',
            '.oui-fs .full-start__rate > div + div { margin-left: 0.4em; opacity: 0.7; }',
            '.oui-fs__descr { max-width: 42em; margin: 0.2em 0 1.5em; font-size: 1.1em; line-height: 1.45; opacity: 0.85; ' +
                'display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }',
            '.oui-fs .full-start-new__buttons .full-start__button { height: auto; padding: 0.75em; margin-right: 0.8em; ' +
                '-webkit-border-radius: 2em; border-radius: 2em; background: rgba(255, 255, 255, 0.14); ' +
                '-webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28); ' +
                '-webkit-transition: -webkit-transform 0.15s; transition: transform 0.15s; }',
            '.oui-fs .full-start-new__buttons .full-start__button.button--play { padding: 0.75em 1.7em 0.75em 1.3em; }',
            '.oui-fs .full-start-new__buttons .full-start__button.button--play:not(.focus) span { display: inline; }',
            '.oui-fs .full-start-new__buttons .full-start__button.focus { background: #fff; color: #000; ' +
                '-webkit-transform: scale(1.05); transform: scale(1.05); }',
            /* sections under the header: the same glass language as the "Online" screen */
            '.oui-fullpage .full-descr__tag { -webkit-border-radius: 2em; border-radius: 2em; background: rgba(255, 255, 255, 0.12); ' +
                'border: 1px solid rgba(255, 255, 255, 0.14); -webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25); }',
            '.oui-fullpage .full-person { -webkit-border-radius: 1.2em; border-radius: 1.2em; ' +
                'background: -webkit-linear-gradient(top, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)); ' +
                'background: linear-gradient(to bottom, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)); ' +
                'border: 1px solid rgba(255, 255, 255, 0.12); -webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25); }',
            '.oui-fullpage .full-person__photo { -webkit-border-radius: 0.9em; border-radius: 0.9em; }',
            '.oui-fullpage .full-episode, .oui-fullpage .full-episode__img, .oui-fullpage .card-more__box { -webkit-border-radius: 1em; border-radius: 1em; }',
            '.oui { position: relative; }',
            '.oui-list { padding: 1em 1.5em 2em; }',

            /* header: the still fills the width, darkened towards the text on the left and into the page below */
            '.oui-hero { position: relative; min-height: 28em; padding: 2.5em 1.5em 1.5em; overflow: hidden; }',
            /* the still melts into the blurred page below it (mask), instead of ending in a hard edge */
            '.oui-hero__art { position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0; ' +
                '-webkit-mask-image: -webkit-linear-gradient(top, #000 55%, rgba(0, 0, 0, 0) 100%); ' +
                'mask-image: linear-gradient(to bottom, #000 55%, rgba(0, 0, 0, 0) 100%); ' +
                '-webkit-transition: opacity 0.5s; transition: opacity 0.5s; }',
            '.oui-hero__art--loaded { opacity: 1; }',
            '.oui-hero__art > img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 25%; }',
            '.oui-hero__art::after { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; ' +
                'background: -webkit-linear-gradient(left, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 80%); ' +
                'background: linear-gradient(to right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 80%); }',
            '.oui-hero__body { position: relative; width: 56%; }',
            '.oui-hero__title { font-size: 3em; font-weight: 700; line-height: 1.1; }',
            '.oui-hero__logo { display: block; max-width: 80%; max-height: 2.2em; ' +
                '-webkit-filter: drop-shadow(0 0.1em 0.4em rgba(0, 0, 0, 0.6)); filter: drop-shadow(0 0.1em 0.4em rgba(0, 0, 0, 0.6)); }',
            '.oui-hero__meta { display: -webkit-box; display: -webkit-flex; display: flex; -webkit-flex-wrap: wrap; flex-wrap: wrap; ' +
                '-webkit-box-align: center; -webkit-align-items: center; align-items: center; margin-top: 1em; font-size: 1.1em; }',
            '.oui-hero__meta > * { margin-right: 0.9em; }',
            '.oui-hero__rate { color: #ffd60a; font-weight: 600; }',
            '.oui-hero__genres { margin-top: 0.5em; opacity: 0.7; }',
            '.oui-hero__descr { margin-top: 0.9em; max-width: 42em; font-size: 1.1em; line-height: 1.45; opacity: 0.85; ' +
                'display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }',
            '.oui-hero__actions { margin-top: 1.5em; }',
            '.oui-play { display: -webkit-inline-box; display: -webkit-inline-flex; display: inline-flex; ' +
                '-webkit-box-align: center; -webkit-align-items: center; align-items: center; ' +
                'padding: 0.7em 1.7em 0.7em 1.3em; -webkit-border-radius: 2em; border-radius: 2em; ' +
                'background: rgba(255, 255, 255, 0.16); font-size: 1.25em; font-weight: 600; ' +
                '-webkit-transition: -webkit-transform 0.15s; transition: transform 0.15s; }',
            '.oui-play > svg { width: 1.4em; height: 1.4em; margin-right: 0.5em; }',
            '.oui-play.focus { background: #fff; color: #000; -webkit-transform: scale(1.04); transform: scale(1.04); }',
            '.oui-hero__line { margin-top: 0.8em; opacity: 0.75; }',
            '.oui-hero__line:empty { display: none; }',
            '.oui-progress { margin-top: 1em; width: 24em; }',
            '.oui-progress__text { font-size: 0.95em; margin-bottom: 0.45em; }',
            '.oui-progress__bar { height: 0.25em; -webkit-border-radius: 0.2em; border-radius: 0.2em; background: rgba(255, 255, 255, 0.2); overflow: hidden; }',
            '.oui-progress__bar > div { height: 100%; background: #fff; }',

            /* filter pills */
            '.oui-chips { display: -webkit-box; display: -webkit-flex; display: flex; -webkit-flex-wrap: wrap; flex-wrap: wrap; padding: 0.4em 1.5em 0; }',
            '.oui-chip { display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-align: center; -webkit-align-items: center; align-items: center; ' +
                'margin: 0 0.7em 0.7em 0; padding: 0.55em 1.15em; -webkit-border-radius: 2em; border-radius: 2em; ' +
                'background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.16); ' +
                '-webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25); }',
            '.oui-chip > svg { width: 1.2em; height: 1.2em; margin-right: 0.5em; }',
            '.oui-chip__label { font-size: 0.75em; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.65; margin-right: 0.6em; }',
            '.oui-chip__value { font-weight: 600; max-width: 16em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.oui-chip.focus { background: #fff; color: #000; border-color: #fff; }',

            /* grid: four stills per row; inline boxes because Tizen 4 has no grid and no flex gap */
            '.oui--grid .oui-list > .oui-card--file { display: -webkit-inline-box; display: -webkit-inline-flex; display: inline-flex; ' +
                'vertical-align: top; width: calc(25% - 1.05em); margin: 0 1em 1em 0; padding: 0.5em; ' +
                '-webkit-box-orient: vertical; -webkit-flex-direction: column; flex-direction: column; ' +
                '-webkit-box-align: stretch; -webkit-align-items: stretch; align-items: stretch; }',
            '.oui--grid .oui-card__thumb { width: 100%; height: 0; padding-bottom: 56.25%; margin: 0 0 0.6em; }',
            '.oui--grid .oui-card__body { padding: 0 0.3em 0.2em; }',
            '.oui--grid .oui-card__title { font-size: 1.1em; }',
            '.oui--grid .oui-card__meta { font-size: 0.85em; margin-top: 0.3em; }',
            '.oui-state { padding: 2em 0 3em; }',
            '.oui-state__title { font-size: 1.6em; font-weight: 700; }',
            '.oui-state__text { margin-top: 0.4em; font-size: 1.1em; opacity: 0.7; }',
            '.oui-state__buttons { display: -webkit-box; display: -webkit-flex; display: flex; margin-top: 1.2em; }',
            /* a thin light sweeping along a track while online.js is searching (transform only: cheap on TVs) */
            '.oui-state__pulse { position: relative; width: 18em; height: 0.25em; margin-top: 1.2em; overflow: hidden; ' +
                '-webkit-border-radius: 0.2em; border-radius: 0.2em; background: rgba(255, 255, 255, 0.15); }',
            '.oui-state__pulse::after { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 35%; background: #fff; ' +
                '-webkit-animation: oui-sweep 1.4s ease-in-out infinite; animation: oui-sweep 1.4s ease-in-out infinite; }',
            '@-webkit-keyframes oui-sweep { 0% { -webkit-transform: translateX(-100%); } 100% { -webkit-transform: translateX(290%); } }',
            '@keyframes oui-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(290%); } }',
            /* blurred still under the page; the scroll sits above it */
            '.oui-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; opacity: 0; ' +
                '-webkit-transition: opacity 0.6s; transition: opacity 0.6s; }',
            '.oui-bg--loaded { opacity: 1; }',
            '.oui-bg > img { position: absolute; top: -10%; left: -10%; width: 120%; height: 120%; object-fit: cover; ' +
                '-webkit-filter: blur(2.5em) saturate(1.4) brightness(0.45); filter: blur(2.5em) saturate(1.4) brightness(0.45); }',
            '.oui > .scroll { position: relative; }',

            /* episode cards as glass: translucent fill, a light top edge (the "specular" line) and a hairline border */
            '.oui-card { position: relative; display: -webkit-box; display: -webkit-flex; display: flex; ' +
                '-webkit-box-align: center; -webkit-align-items: center; align-items: center; ' +
                'margin-bottom: 1em; padding: 0.6em; -webkit-border-radius: 1.1em; border-radius: 1.1em; ' +
                'background: -webkit-linear-gradient(top, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05)); ' +
                'background: linear-gradient(to bottom, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05)); ' +
                'border: 1px solid rgba(255, 255, 255, 0.14); ' +
                '-webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 0.6em 1.6em rgba(0, 0, 0, 0.25); ' +
                'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 0.6em 1.6em rgba(0, 0, 0, 0.25); }',
            '.oui-card.focus { background: rgba(255, 255, 255, 0.92); color: #111; border-color: #fff; }',
            '.oui-card__thumb { position: relative; width: 16em; height: 9em; -webkit-flex-shrink: 0; flex-shrink: 0; ' +
                'margin-right: 1.4em; overflow: hidden; -webkit-border-radius: 0.7em; border-radius: 0.7em; background: rgba(255, 255, 255, 0.08); }',
            '.oui-card__thumb > img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }',
            '.oui-card__num { position: absolute; left: 0.5em; bottom: 0.3em; font-size: 2em; font-weight: 700; color: #fff; ' +
                'text-shadow: 0 0.1em 0.4em rgba(0, 0, 0, 0.8); }',
            '.oui-card__viewed { position: absolute; top: 0.5em; right: 0.5em; padding: 0.15em 0.55em; font-size: 0.75em; font-weight: 700; ' +
                'color: #fff; background: rgba(0, 0, 0, 0.62); -webkit-border-radius: 1em; border-radius: 1em; }',
            '.oui-card--future { opacity: 0.55; }',

            /* labels on an episode */
            '.oui-tags { display: -webkit-box; display: -webkit-flex; display: flex; -webkit-flex-wrap: wrap; flex-wrap: wrap; margin-top: 0.55em; }',
            '.oui-tag { margin: 0 0.5em 0.3em 0; padding: 0.12em 0.55em; font-size: 0.8em; font-weight: 700; ' +
                '-webkit-border-radius: 0.4em; border-radius: 0.4em; background: rgba(255, 255, 255, 0.16); }',
            '.oui-tag--quality { background: #fff; color: #000; }',
            '.oui-tag--new { background: #30d158; color: #00290e; }',
            '.oui-tag--left { background: #0a84ff; color: #fff; }',
            '.oui-tag--ua { background: #0057b7; color: #ffd700; }',
            '.oui-tag--sub { background: transparent; border: 1px solid currentColor; }',
            '.oui-card.focus .oui-tag--soon, .oui-card.focus .oui-tag--sub { background: rgba(0, 0, 0, 0.08); }',
            '.oui-card.focus .oui-tag--quality { background: #111; color: #fff; }',
            '.oui-card__bar { position: absolute; left: 0; right: 0; bottom: 0; height: 0.3em; background: rgba(0, 0, 0, 0.5); }',
            '.oui-card__bar > div { height: 100%; background: #fff; }',
            '.oui-card__body { -webkit-box-flex: 1; -webkit-flex-grow: 1; flex-grow: 1; min-width: 0; }',
            '.oui-card__head { display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-align: baseline; -webkit-align-items: baseline; align-items: baseline; }',
            '.oui-card__title { -webkit-box-flex: 1; -webkit-flex-grow: 1; flex-grow: 1; font-size: 1.4em; font-weight: 600; ' +
                'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.oui-card__time { margin-left: 1em; opacity: 0.7; }',
            '.oui-card__meta { margin-top: 0.5em; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.oui-badge { display: inline-block; margin-right: 0.7em; padding: 0.1em 0.5em; font-size: 0.85em; font-weight: 700; ' +
                '-webkit-border-radius: 0.35em; border-radius: 0.35em; border: 1px solid currentColor; }',
            '.oui-card--continue, .oui-card--folder { padding: 1em 1.4em; }'
        ].join('\n');
    }

    function settings() {
        Lampa.SettingsApi.addComponent({
            component: 'online_ui',
            name: Lampa.Lang.translate('online_ui_title'),
            icon: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
                '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="9" height="8" rx="2"/><rect x="13" y="13" width="9" height="8" rx="2"/></svg>'
        });
        Lampa.SettingsApi.addParam({
            component: 'online_ui',
            param: {
                name: KEY_MODE,
                type: 'select',
                values: {
                    theme: Lampa.Lang.translate('online_ui_mode_theme'),
                    always: Lampa.Lang.translate('online_ui_mode_always'),
                    off: Lampa.Lang.translate('online_ui_mode_off')
                },
                'default': 'theme'
            },
            field: { name: Lampa.Lang.translate('online_ui_mode'), description: Lampa.Lang.translate('online_ui_mode_descr') }
        });
    }

    function start() {
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css();
        document.head.appendChild(style);

        settings();

        /* body.oui-on scopes the panel styles; follows the switch without a reload */
        document.body.classList.toggle('oui-on', isOn());
        Lampa.Storage.listener.follow('change', function (event) {
            /* the mode itself, or a theme switched on/off */
            if (event.name === KEY_MODE || THEME_KEYS.indexOf(event.name) !== -1) document.body.classList.toggle('oui-on', isOn());
        });

        Lampa.Listener.follow('activity', function (event) {
            if (COMPONENTS.indexOf(event.component) === -1 || !event.object) return;
            if (event.type === 'start' && isOn()) mount(event.object);
            else if (event.type === 'destroy') unmount(event.object);
        });

        Lampa.Listener.follow('activity', function (event) {
            if (event.component !== 'main' || !event.object) return;
            if (event.type === 'start' && isOn()) mountMain(event.object);
            else if (event.type === 'destroy') {
                for (var i = spots.length - 1; i >= 0; i--) if (spots[i].object === event.object) spots.splice(i, 1);
            }
        });

        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite' && isOn()) decorateFull(event);
        });
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (event) {
        if (event.type === 'ready') start();
    });
})();
