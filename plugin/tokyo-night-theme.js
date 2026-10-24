/* Lampa plugin: Tokyo Night colour theme.
 *
 * Palette: Tokyo Night by enkia (https://github.com/tokyo-night/tokyo-night-vscode-theme, MIT).
 * Only colours are changed: Lampa's layout, navigation and other plugins stay as they are.
 *
 * - ES5 and -webkit- prefixes only, so it runs on old TV engines (Tizen 4, webOS 4, Android 7 WebView).
 * - No external fonts, images or requests.
 * - Every rule is scoped under body.theme--tokyo-night, so switching off removes it completely.
 * - Shares the key `lampa_theme_active` with other theme plugins of this repo:
 *   enabling one theme switches the others off.
 *
 * License: AGPL-3.0 (see LICENSE in the repository root).
 */
(function () {
    'use strict';

    if (window.lampa_theme_tokyo_night) return;
    window.lampa_theme_tokyo_night = true;

    var ID = 'tokyo_night';
    var BODY_CLASS = 'theme--tokyo-night';
    var STYLE_ID = 'theme-tokyo-night-style';
    var KEY_ON = 'theme_tokyo_night_on';
    var KEY_ACCENT = 'theme_tokyo_night_accent';
    var KEY_ACTIVE = 'lampa_theme_active';

    var C = {
        bg: '#1a1b26',
        bgDark: '#16161e',
        panel: '#1f2335',
        card: '#24283b',
        line: '#292e42',
        text: '#c0caf5',
        textDim: '#a9b1d6'
    };

    var ACCENTS = {
        blue: '#7aa2f7',
        purple: '#bb9af7',
        cyan: '#7dcfff',
        green: '#9ece6a',
        orange: '#ff9e64',
        red: '#f7768e'
    };

    Lampa.Lang.add({
        /* "(Tizen 4)" = the TV engine this build was checked on (see README) */
        theme_tokyo_night_title: { uk: 'Tokyo Night (Tizen 4)', en: 'Tokyo Night (Tizen 4)', ru: 'Tokyo Night (Tizen 4)' },
        theme_tokyo_night_on: { uk: 'Увімкнути тему', en: 'Enable theme', ru: 'Включить тему' },
        theme_tokyo_night_on_descr: {
            uk: 'Інші теми з цього набору вимкнуться',
            en: 'Other themes from this set will be switched off',
            ru: 'Другие темы из этого набора отключатся'
        },
        theme_tokyo_night_accent: { uk: 'Акцент', en: 'Accent', ru: 'Акцент' },
        theme_accent_blue: { uk: 'Синій', en: 'Blue', ru: 'Синий' },
        theme_accent_purple: { uk: 'Фіолетовий', en: 'Purple', ru: 'Фиолетовый' },
        theme_accent_cyan: { uk: 'Бірюзовий', en: 'Cyan', ru: 'Бирюзовый' },
        theme_accent_green: { uk: 'Зелений', en: 'Green', ru: 'Зелёный' },
        theme_accent_orange: { uk: 'Помаранчевий', en: 'Orange', ru: 'Оранжевый' },
        theme_accent_red: { uk: 'Червоний', en: 'Red', ru: 'Красный' }
    });

    function isOn(value) {
        return value === true || value === 'true';
    }

    function accent() {
        return ACCENTS[Lampa.Storage.get(KEY_ACCENT, 'blue')] || ACCENTS.blue;
    }

    /* Selectors are taken from Lampa 3.x css/app.css and Lampac online.js: every one of them
       is white (#fff) or #353535 there, which is what this theme replaces. */
    function css(a) {
        var b = 'body.' + BODY_CLASS;
        var focusFill = [
            '.head__action.focus', '.head__action.hover',
            '.menu__item.focus', '.menu__item.traverse', '.menu__item.hover',
            '.navigation-tabs__button.focus', '.items-line__more.focus', '.tag-count.focus',
            '.full-start__button.focus', '.full-descr__tag.focus', '.full-person.focus', '.full-review.focus',
            '.player-panel .button.focus', '.player-skip.focus', '.simple-button.focus', '.modal__button.focus',
            '.console__tab.focus', '.plugins-catalog__line.focus', '.broadcast__device.focus',
            '.lang__selector-item.focus', '.menu-edit-list__move.focus', '.menu-edit-list__toggle.focus',
            '.settings-folder.focus', '.settings-param.focus', '.selectbox-item.focus'
        ];
        var focusFrame = [
            '.card.focus .card__view::after', '.card.hover .card__view::after',
            '.card-more.focus .card-more__box::after', '.card-parser.focus::after',
            '.card-episode.focus .full-episode::after', '.torrent-item.focus::after',
            '.explorer-card__head-img.focus::after', '.extensions__item.focus:after',
            '.extensions__block-empty.focus:after', '.extensions__block-add.focus:after',
            '.online-prestige.focus::after'
        ];
        var panels = [
            '.settings__content', '.selectbox__content', '.modal__content',
            '.navigation-bar__body', '.discuss-rules', '.bell__item'
        ];

        function scope(list) {
            return list.map(function (s) { return b + ' ' + s; }).join(',\n');
        }

        return [
            b + ' { background: ' + C.bg + ' !important; color: ' + C.text + '; }',

            /* panels: settings, select lists, dialogs, mobile navigation */
            scope(panels) + ' { background-color: ' + C.panel + ' !important; color: ' + C.text + '; }',
            b + ' .settings__head, ' + b + ' .selectbox__head { border-bottom: 1px solid ' + C.line + '; }',
            b + ' .settings-input__content { background-color: ' + C.bgDark + ' !important; }',

            /* focused buttons, menu items, settings rows */
            scope(focusFill) + ' { background-color: ' + a + ' !important; color: ' + C.bgDark + ' !important; }',
            b + ' .menu__item.focus .menu__ico, ' + b + ' .menu__item.traverse .menu__ico, ' +
                b + ' .head__action.focus svg { color: ' + C.bgDark + '; fill: currentColor; }',
            b + ' .selectbox-item.focus::after { border-color: ' + C.bgDark + ' !important; }',
            b + ' .settings-param.focus .settings-param__descr, ' + b + ' .settings-param.focus .settings-param__value, ' +
                b + ' .selectbox-item.focus .selectbox-item__subtitle { color: ' + C.bg + ' !important; opacity: 0.8; }',

            /* focus frame around cards, episodes, torrents, online sources */
            scope(focusFrame) + ' { border-color: ' + a + ' !important; }',
            b + ' .online.focus { -webkit-box-shadow: 0 0 0 0.2em ' + a + '; box-shadow: 0 0 0 0.2em ' + a + '; }',

            /* unfocused surfaces */
            b + ' .full-start__button, ' + b + ' .simple-button { background-color: rgba(36, 40, 59, 0.75); }',
            b + ' .online-prestige, ' + b + ' .torrent-item, ' + b + ' .torrent-serial { background-color: rgba(36, 40, 59, 0.7); }',
            b + ' .card__vote { background: rgba(22, 22, 30, 0.75); color: ' + C.text + '; }',
            b + ' .search-source.focus, ' + b + ' .search-history-key.focus { background: ' + C.line + '; color: ' + a + '; }',

            /* text */
            b + ' .items-line__title { color: ' + C.text + '; }',
            /* #565f89 (comment colour) was measured too dim on a TV for descriptions */
            b + ' .settings-param__descr, ' + b + ' .card__age, ' + b + ' .selectbox-item__subtitle { color: ' + C.textDim + '; }',
            b + ' .settings-param__value { color: ' + a + '; }',

            /* player progress */
            b + ' .player-panel__timeline { background-color: rgba(86, 95, 137, 0.35); }',
            b + ' .player-panel__position, ' + b + ' .player-panel__position > div:after { background-color: ' + a + '; }',
            b + ' .online-prestige__timeline .time-line > div, ' + b + ' .time-line > div { background-color: ' + a + '; }'
        ].join('\n');
    }

    function apply() {
        var on = isOn(Lampa.Storage.get(KEY_ON, false));
        var style = document.getElementById(STYLE_ID);

        if (!on) {
            if (style) style.parentNode.removeChild(style);
            document.body.classList.remove(BODY_CLASS);
            return;
        }

        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            document.head.appendChild(style);
        }
        style.textContent = css(accent());
        document.body.classList.add(BODY_CLASS);
    }

    function settings() {
        var accents = {};
        for (var name in ACCENTS) accents[name] = Lampa.Lang.translate('theme_accent_' + name);

        Lampa.SettingsApi.addComponent({
            component: 'theme_tokyo_night',
            name: Lampa.Lang.translate('theme_tokyo_night_title'),
            icon: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M14.5 2.5a9.5 9.5 0 1 0 7 15.9A8 8 0 0 1 14.5 2.5z"/></svg>'
        });
        Lampa.SettingsApi.addParam({
            component: 'theme_tokyo_night',
            param: { name: KEY_ON, type: 'trigger', 'default': false },
            field: {
                name: Lampa.Lang.translate('theme_tokyo_night_on'),
                description: Lampa.Lang.translate('theme_tokyo_night_on_descr')
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'theme_tokyo_night',
            param: { name: KEY_ACCENT, type: 'select', values: accents, 'default': 'blue' },
            field: { name: Lampa.Lang.translate('theme_tokyo_night_accent') }
        });
    }

    function follow() {
        Lampa.Storage.listener.follow('change', function (event) {
            if (event.name === KEY_ON) {
                /* the user just enabled this theme: tell the other theme plugins */
                if (isOn(event.value)) Lampa.Storage.set(KEY_ACTIVE, ID);
                apply();
            }
            else if (event.name === KEY_ACCENT) {
                apply();
            }
            else if (event.name === KEY_ACTIVE && event.value !== ID && isOn(Lampa.Storage.get(KEY_ON, false))) {
                /* another theme took over; nolisten = true, so this does not echo back */
                Lampa.Storage.set(KEY_ON, false, true);
                apply();
            }
        });
    }

    function start() {
        /* two themes left enabled together (e.g. by an older version): keep only the active one */
        var active = Lampa.Storage.get(KEY_ACTIVE, '');
        if (active && active !== ID && isOn(Lampa.Storage.get(KEY_ON, false))) Lampa.Storage.set(KEY_ON, false, true);

        settings();
        follow();
        apply();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (event) {
        if (event.type === 'ready') start();
    });
})();
