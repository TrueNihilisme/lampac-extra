/* Lampa plugin: Plex style theme (charcoal and amber).
 *
 * Not affiliated with Plex; the name only describes the style. Charcoal surfaces, crisp small
 * corners and one loud colour: amber. Amber is used only for what the remote is on (focused
 * buttons, menu items, settings rows, the ring around a focused poster) and for progress,
 * so on a TV across the room the eye always lands on the focus.
 * Only colours, corner radii and focus effects are changed: Lampa's layout, navigation
 * and other plugins stay as they are.
 *
 * - ES5 and -webkit- prefixes only, so it runs on old TV engines (Tizen 4, webOS 4, Android 7 WebView).
 * - No external fonts, images or requests; no backdrop-filter, grid or gap (Tizen 4 has none).
 * - Motion: only the focused poster scales (transform), 150 ms.
 * - Every rule is scoped under body.theme--plex, so switching off removes it completely.
 * - Shares the key `lampa_theme_active` with other theme plugins of this repo:
 *   enabling one theme switches the others off.
 *
 * License: AGPL-3.0 (see LICENSE in the repository root).
 */
(function () {
    'use strict';

    if (window.lampa_theme_plex) return;
    window.lampa_theme_plex = true;

    var ID = 'plex';
    var BODY_CLASS = 'theme--plex';
    var STYLE_ID = 'theme-plex-style';
    var KEY_ON = 'theme_plex_on';
    var KEY_ACCENT = 'theme_plex_accent';
    var KEY_FOCUS = 'theme_plex_focus';
    var KEY_ACTIVE = 'lampa_theme_active';

    var C = {
        bg: '#1c1e21',
        panel: '#26292d',
        raised: '#30343a',
        line: '#3a3f46',
        text: '#eceff1',
        muted: '#9aa0a6',
        onAccent: '#1c1e21'
    };

    /* each accent is light enough for dark text on it (contrast >= 7:1 against #1c1e21) */
    var ACCENTS = {
        amber: '#e5a00d',
        orange: '#f39a52',
        lime: '#a3d36b',
        sky: '#6cc4f5',
        rose: '#f28b9b'
    };

    Lampa.Lang.add({
        /* "(Tizen 4)" = the TV engine this build was checked on (see README) */
        theme_plex_title: { uk: 'Plex (Tizen 4)', en: 'Plex (Tizen 4)', ru: 'Plex (Tizen 4)' },
        theme_plex_on: { uk: 'Увімкнути тему', en: 'Enable theme', ru: 'Включить тему' },
        theme_plex_on_descr: {
            uk: 'Інші теми з цього набору вимкнуться',
            en: 'Other themes from this set will be switched off',
            ru: 'Другие темы из этого набора отключатся'
        },
        theme_plex_accent: { uk: 'Акцент', en: 'Accent', ru: 'Акцент' },
        theme_plex_focus: { uk: 'Фокус на постері', en: 'Poster focus', ru: 'Фокус на постере' },
        theme_plex_focus_ring: { uk: 'Кольорова рамка', en: 'Accent ring', ru: 'Цветная рамка' },
        theme_plex_focus_lift: { uk: 'Рамка і підйом', en: 'Ring and lift', ru: 'Рамка и подъём' },
        theme_plex_accent_amber: { uk: 'Бурштиновий', en: 'Amber', ru: 'Янтарный' },
        theme_plex_accent_orange: { uk: 'Помаранчевий', en: 'Orange', ru: 'Оранжевый' },
        theme_plex_accent_lime: { uk: 'Салатовий', en: 'Lime', ru: 'Салатовый' },
        theme_plex_accent_sky: { uk: 'Блакитний', en: 'Sky', ru: 'Голубой' },
        theme_plex_accent_rose: { uk: 'Рожевий', en: 'Rose', ru: 'Розовый' }
    });

    function isOn(value) {
        return value === true || value === 'true';
    }

    function accent() {
        return ACCENTS[Lampa.Storage.get(KEY_ACCENT, 'amber')] || ACCENTS.amber;
    }

    /* Selectors are taken from Lampa 3.x css/app.css and Lampac online.js. */
    function css(a, focus) {
        var b = 'body.' + BODY_CLASS;
        var focusFill = [
            '.head__action.focus', '.head__action.hover',
            '.menu__item.focus', '.menu__item.hover',
            '.navigation-tabs__button.focus', '.items-line__more.focus', '.tag-count.focus',
            '.full-start__button.focus', '.full-descr__tag.focus', '.full-person.focus', '.full-review.focus',
            '.player-panel .button.focus', '.player-skip.focus', '.simple-button.focus', '.modal__button.focus',
            '.console__tab.focus', '.plugins-catalog__line.focus', '.broadcast__device.focus',
            '.lang__selector-item.focus', '.menu-edit-list__move.focus', '.menu-edit-list__toggle.focus',
            '.settings-folder.focus', '.settings-param.focus', '.selectbox-item.focus',
            '.search-source.focus', '.search-history-key.focus'
        ];
        var buttons = [
            '.full-start__button', '.simple-button', '.modal__button', '.navigation-tabs__button',
            '.head__action', '.menu__item', '.settings-folder', '.settings-param', '.selectbox-item',
            '.full-descr__tag', '.tag-count', '.items-line__more', '.online-prestige', '.torrent-item'
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

        var rules = [
            b + ' { background: ' + C.bg + ' !important; color: ' + C.text + '; }',

            /* panels: one step lighter than the page, hairline edge instead of a shadow */
            scope(panels) + ' { background-color: ' + C.panel + ' !important; color: ' + C.text + '; }',
            b + ' .settings__head, ' + b + ' .selectbox__head { border-bottom: 1px solid ' + C.line + '; }',
            b + ' .settings-input__content { background-color: ' + C.raised + ' !important; }',

            /* crisp, small corners everywhere */
            scope(buttons) + ' { -webkit-border-radius: 0.35em; border-radius: 0.35em; }',
            b + ' .modal__content { -webkit-border-radius: 0.5em; border-radius: 0.5em; }',
            b + ' .card__img, ' + b + ' .card__view::after, ' + b + ' .full-start-new__img { ' +
                '-webkit-border-radius: 0.35em !important; border-radius: 0.35em !important; }',
            b + ' .full-start__button, ' + b + ' .simple-button { background-color: ' + C.raised + '; }',

            /* focus: solid accent, dark label */
            scope(focusFill) + ' { background-color: ' + a + ' !important; color: ' + C.onAccent + ' !important; }',
            b + ' .menu__item.focus .menu__ico, ' + b + ' .head__action.focus svg, ' +
                b + ' .full-start__button.focus svg, ' + b + ' .simple-button.focus svg { color: ' + C.onAccent + '; }',
            b + ' .selectbox-item.focus::after { border-color: ' + C.onAccent + ' !important; }',
            b + ' .settings-param.focus .settings-param__value, ' + b + ' .settings-param.focus .settings-param__descr, ' +
                b + ' .selectbox-item.focus .selectbox-item__subtitle { color: ' + C.onAccent + ' !important; opacity: 0.75; }',

            /* side menu: the open section keeps a thin accent bar when the remote is elsewhere */
            b + ' .menu__item.traverse { background-color: ' + C.raised + ' !important; color: ' + C.text + ' !important; ' +
                '-webkit-box-shadow: inset 0.25em 0 0 ' + a + '; box-shadow: inset 0.25em 0 0 ' + a + '; }',

            /* rows and cards */
            b + ' .items-line__title { color: ' + C.text + '; font-weight: 700; }',
            b + ' .items-line__more { color: ' + C.muted + '; }',
            b + ' .card__title { color: ' + C.text + '; }',
            b + ' .card__age, ' + b + ' .settings-param__descr, ' + b + ' .selectbox-item__subtitle { color: ' + C.muted + '; }',
            b + ' .card__vote { background: rgba(28, 30, 33, 0.88); color: ' + C.text + '; -webkit-border-radius: 0.3em; border-radius: 0.3em; }',
            b + ' .settings-param__value { color: ' + a + '; }',

            /* lists on the "Online" and torrent pages */
            b + ' .online-prestige, ' + b + ' .torrent-item, ' + b + ' .torrent-serial { background-color: ' + C.panel + '; }',
            b + ' .online-prestige.focus, ' + b + ' .torrent-item.focus { background-color: ' + C.raised + '; }',
            b + ' .online-prestige__img > img { -webkit-border-radius: 0.3em; border-radius: 0.3em; }',
            b + ' .online.focus { -webkit-box-shadow: 0 0 0 0.2em ' + a + '; box-shadow: 0 0 0 0.2em ' + a + '; }',

            /* progress: watched bars, player timeline */
            b + ' .time-line > div, ' + b + ' .player-panel__position, ' + b + ' .player-panel__position > div:after { background-color: ' + a + '; }',
            b + ' .player-panel__timeline { background-color: rgba(236, 239, 241, 0.2); }',

            /* the focused poster/list frame: a thick accent ring that reads from across the room */
            scope(focusFrame) + ' { border-color: ' + a + ' !important; border-width: 0.25em !important; }'
        ];

        /* The new "Online" screen (plugin online-ui.js, class .oui): flat charcoal cards, crisp corners, the amber
           ring on focus instead of a white fill, and an always-amber play button. */
        var o = b + ' .oui';
        rules.push(
            o + ' .oui-bg > img { -webkit-filter: blur(2.5em) saturate(0.9) brightness(0.32); filter: blur(2.5em) saturate(0.9) brightness(0.32); }',
            o + ' .oui-card { background: rgba(38, 41, 45, 0.9); border: 1px solid rgba(255, 255, 255, 0.06); ' +
                '-webkit-border-radius: 0.4em; border-radius: 0.4em; -webkit-box-shadow: none; box-shadow: none; }',
            o + ' .oui-card__thumb { -webkit-border-radius: 0.3em; border-radius: 0.3em; }',
            o + ' .oui-card.focus { background: ' + C.raised + '; color: ' + C.text + '; border-color: ' + a + '; ' +
                '-webkit-box-shadow: 0 0 0 0.2em ' + a + '; box-shadow: 0 0 0 0.2em ' + a + '; }',
            o + ' .oui-card.focus .oui-tag--quality { background: #fff; color: #000; }',
            o + ' .oui-card.focus .oui-tag--soon, ' + o + ' .oui-card.focus .oui-tag--sub { background: rgba(255, 255, 255, 0.16); }',
            o + ' .oui-chip { -webkit-border-radius: 0.4em; border-radius: 0.4em; background: ' + C.panel + '; border-color: ' + C.line + '; ' +
                '-webkit-box-shadow: none; box-shadow: none; }',
            o + ' .oui-chip.focus { background: ' + a + '; color: ' + C.onAccent + '; border-color: ' + a + '; }',
            o + ' .oui-play { background: ' + a + '; color: ' + C.onAccent + '; -webkit-border-radius: 0.4em; border-radius: 0.4em; }',
            o + ' .oui-play.focus { background: ' + a + '; color: ' + C.onAccent + '; ' +
                '-webkit-box-shadow: 0 0 0 0.2em #fff; box-shadow: 0 0 0 0.2em #fff; }',
            o + ' .oui-progress__bar > div, ' + o + ' .oui-card__bar > div { background: ' + a + '; }',
            o + ' .oui-tag--new { background: ' + a + '; color: ' + C.onAccent + '; }',
            o + ' .oui-tag--left { background: transparent; color: ' + a + '; border: 1px solid ' + a + '; }',
            o + ' .oui-hero__rate { color: ' + a + '; }'
        );

        /* menu, settings, lists, dialogs under the new look: solid charcoal sheets with crisp corners, no glass */
        var p = b + '.oui-on';
        var sheets = [p + ' .settings .settings__content', p + ' .selectbox .selectbox__content', p + ' .modal .modal__content', p + ' .head .head__body'];
        rules.push(
            sheets.join(', ') + ' { background: ' + C.panel + ' !important; border-color: ' + C.line + '; ' +
                '-webkit-backdrop-filter: none; backdrop-filter: none; -webkit-border-radius: 0.6em; border-radius: 0.6em; }',
            p + ' .settings-folder, ' + p + ' .settings-param, ' + p + ' .selectbox-item { -webkit-border-radius: 0.35em; border-radius: 0.35em; }',
            /* side menu items: solid charcoal tiles with crisp corners instead of glass pills */
            p + ' .wrap__left .menu__item { -webkit-border-radius: 0.4em; border-radius: 0.4em; background-color: ' + C.panel + '; ' +
                'border-color: ' + C.line + '; -webkit-box-shadow: none; box-shadow: none; }',
            p + ' .head__action { background-color: ' + C.raised + '; }',
            /* the shelf under the home rows: a flat charcoal plinth */
            p + ' .oui-main .items-line__body::before { background: rgba(38, 41, 45, 0.9); border-color: ' + C.line + '; ' +
                '-webkit-border-radius: 0.5em; border-radius: 0.5em; -webkit-box-shadow: none; box-shadow: none; }'
        );

        if (focus === 'lift') {
            rules.push(
                b + ' .card .card__view { -webkit-transition: -webkit-transform 0.15s ease-out; transition: transform 0.15s ease-out; }',
                b + ' .card.focus .card__view { -webkit-transform: scale(1.05); transform: scale(1.05); }',
                b + ' .card.focus .card__img { -webkit-box-shadow: 0 0.8em 1.6em rgba(0, 0, 0, 0.7); box-shadow: 0 0.8em 1.6em rgba(0, 0, 0, 0.7); }'
            );
        }

        return rules.join('\n');
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
        style.textContent = css(accent(), Lampa.Storage.get(KEY_FOCUS, 'lift'));
        document.body.classList.add(BODY_CLASS);
    }

    function settings() {
        var accents = {};
        for (var name in ACCENTS) accents[name] = Lampa.Lang.translate('theme_plex_accent_' + name);

        Lampa.SettingsApi.addComponent({
            component: 'theme_plex',
            name: Lampa.Lang.translate('theme_plex_title'),
            icon: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M7 3h5.2l6.3 9-6.3 9H7l6.3-9z"/></svg>'
        });
        Lampa.SettingsApi.addParam({
            component: 'theme_plex',
            param: { name: KEY_ON, type: 'trigger', 'default': false },
            field: {
                name: Lampa.Lang.translate('theme_plex_on'),
                description: Lampa.Lang.translate('theme_plex_on_descr')
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'theme_plex',
            param: { name: KEY_ACCENT, type: 'select', values: accents, 'default': 'amber' },
            field: { name: Lampa.Lang.translate('theme_plex_accent') }
        });
        Lampa.SettingsApi.addParam({
            component: 'theme_plex',
            param: {
                name: KEY_FOCUS,
                type: 'select',
                values: {
                    lift: Lampa.Lang.translate('theme_plex_focus_lift'),
                    ring: Lampa.Lang.translate('theme_plex_focus_ring')
                },
                'default': 'lift'
            },
            field: { name: Lampa.Lang.translate('theme_plex_focus') }
        });
    }

    function follow() {
        Lampa.Storage.listener.follow('change', function (event) {
            if (event.name === KEY_ON) {
                /* the user just enabled this theme: tell the other theme plugins */
                if (isOn(event.value)) Lampa.Storage.set(KEY_ACTIVE, ID);
                apply();
            }
            else if (event.name === KEY_ACCENT || event.name === KEY_FOCUS) {
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
