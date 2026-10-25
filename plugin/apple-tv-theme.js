/* Lampa plugin: Apple TV style colour theme (tvOS dark look).
 *
 * Not affiliated with Apple. Colours follow the public dark-mode system palette
 * (backgrounds #000 / #1c1c1e / #2c2c2e, label #f5f5f7, blue #0a84ff).
 * Only colours, corner radii and focus effects are changed: Lampa's layout, navigation
 * and other plugins stay as they are.
 *
 * - ES5 and -webkit- prefixes only, so it runs on old TV engines (Tizen 4, webOS 4, Android 7 WebView).
 * - No external fonts, images or requests; no backdrop-filter (too slow on TV boxes).
 * - Every rule is scoped under body.theme--apple-tv, so switching off removes it completely.
 * - With the plugin online-ui.js (the new look of the cards, home, "Online" page, panels and player)
 *   this theme also colours that look: see ouiCss().
 * - Shares the key `lampa_theme_active` with other theme plugins of this repo:
 *   enabling one theme switches the others off.
 *
 * License: AGPL-3.0 (see LICENSE in the repository root).
 */
(function () {
    'use strict';

    if (window.lampa_theme_apple_tv) return;
    window.lampa_theme_apple_tv = true;

    var ID = 'apple_tv';
    var BODY_CLASS = 'theme--apple-tv';
    var STYLE_ID = 'theme-apple-tv-style';
    var KEY_ON = 'theme_apple_tv_on';
    var KEY_ACCENT = 'theme_apple_tv_accent';
    var KEY_FOCUS = 'theme_apple_tv_focus';
    var KEY_ACTIVE = 'lampa_theme_active';

    var C = {
        bg: '#000000',
        panel: '#1c1c1e',
        row: '#2c2c2e',
        line: '#3a3a3c',
        text: '#f5f5f7',
        muted: '#98989d',
        onFocus: '#1d1d1f'
    };

    var ACCENTS = {
        blue: '#0a84ff',
        purple: '#bf5af2',
        pink: '#ff375f',
        orange: '#ff9f0a',
        green: '#30d158',
        teal: '#40c8e0'
    };

    Lampa.Lang.add({
        /* "(Tizen 4)" = the TV engine this build was checked on (see README) */
        theme_apple_tv_title: { uk: 'Apple TV (Tizen 4)', en: 'Apple TV (Tizen 4)', ru: 'Apple TV (Tizen 4)' },
        theme_apple_tv_on: { uk: 'Увімкнути тему', en: 'Enable theme', ru: 'Включить тему' },
        theme_apple_tv_on_descr: {
            uk: 'Інші теми з цього набору вимкнуться',
            en: 'Other themes from this set will be switched off',
            ru: 'Другие темы из этого набора отключатся'
        },
        theme_apple_tv_accent: { uk: 'Акцент', en: 'Accent', ru: 'Акцент' },
        theme_apple_tv_focus: { uk: 'Фокус на картці', en: 'Card focus', ru: 'Фокус на карточке' },
        theme_apple_tv_focus_lift: { uk: 'Підйом і тінь', en: 'Lift and shadow', ru: 'Подъём и тень' },
        theme_apple_tv_focus_frame: { uk: 'Рамка кольору акценту', en: 'Accent frame', ru: 'Рамка цвета акцента' },
        theme_apple_accent_blue: { uk: 'Синій', en: 'Blue', ru: 'Синий' },
        theme_apple_accent_purple: { uk: 'Фіолетовий', en: 'Purple', ru: 'Фиолетовый' },
        theme_apple_accent_pink: { uk: 'Рожевий', en: 'Pink', ru: 'Розовый' },
        theme_apple_accent_orange: { uk: 'Помаранчевий', en: 'Orange', ru: 'Оранжевый' },
        theme_apple_accent_green: { uk: 'Зелений', en: 'Green', ru: 'Зелёный' },
        theme_apple_accent_teal: { uk: 'Бірюзовий', en: 'Teal', ru: 'Бирюзовый' }
    });

    function isOn(value) {
        return value === true || value === 'true';
    }

    function accent() {
        return ACCENTS[Lampa.Storage.get(KEY_ACCENT, 'blue')] || ACCENTS.blue;
    }

    /* Selectors are taken from Lampa 3.x css/app.css and Lampac online.js. */
    function css(a, focus) {
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
        var buttons = [
            '.full-start__button', '.simple-button', '.modal__button', '.navigation-tabs__button',
            '.head__action', '.menu__item', '.settings-folder', '.settings-param', '.selectbox-item',
            '.full-descr__tag', '.tag-count', '.items-line__more'
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
        var shadow = '0 0.6em 1.6em rgba(0, 0, 0, 0.6)';

        function scope(list) {
            return list.map(function (s) { return b + ' ' + s; }).join(',\n');
        }

        var rules = [
            b + ' { background: ' + C.bg + ' !important; color: ' + C.text + '; }',

            /* panels */
            scope(panels) + ' { background-color: ' + C.panel + ' !important; color: ' + C.text + '; }',
            b + ' .modal__content { -webkit-border-radius: 1.4em; border-radius: 1.4em; }',
            b + ' .settings-input__content { background-color: ' + C.row + ' !important; }',
            b + ' .settings__head, ' + b + ' .selectbox__head { border-bottom: 1px solid ' + C.line + '; }',

            /* rounded, pill-like controls */
            scope(buttons) + ' { -webkit-border-radius: 0.8em; border-radius: 0.8em; }',
            b + ' .full-start__button, ' + b + ' .simple-button { background-color: rgba(44, 44, 46, 0.8); }',

            /* tvOS focus: white surface, dark label, soft shadow */
            scope(focusFill) + ' { background-color: #fff !important; color: ' + C.onFocus + ' !important; ' +
                '-webkit-box-shadow: ' + shadow + '; box-shadow: ' + shadow + '; }',
            b + ' .full-start__button.focus, ' + b + ' .simple-button.focus, ' + b + ' .modal__button.focus { ' +
                '-webkit-transform: scale(1.05); transform: scale(1.05); }',
            b + ' .selectbox-item.focus::after { border-color: ' + C.onFocus + ' !important; }',
            b + ' .settings-param.focus .settings-param__value { color: ' + a + ' !important; }',
            b + ' .settings-param.focus .settings-param__descr, ' +
                b + ' .selectbox-item.focus .selectbox-item__subtitle { color: #6e6e73 !important; }',

            /* unfocused surfaces and text */
            b + ' .online-prestige, ' + b + ' .torrent-item, ' + b + ' .torrent-serial { background-color: rgba(28, 28, 30, 0.85); }',
            b + ' .online-prestige { -webkit-border-radius: 0.8em; border-radius: 0.8em; }',
            b + ' .card__vote { background: rgba(28, 28, 30, 0.8); color: ' + C.text + '; -webkit-border-radius: 0.5em; border-radius: 0.5em; }',
            b + ' .items-line__title { color: ' + C.text + '; font-weight: 600; }',
            b + ' .settings-param__descr, ' + b + ' .card__age, ' + b + ' .selectbox-item__subtitle { color: ' + C.muted + '; }',
            b + ' .settings-param__value { color: ' + a + '; }',
            b + ' .search-source.focus, ' + b + ' .search-history-key.focus { background: ' + C.row + '; color: #fff; }',
            b + ' .online.focus { -webkit-box-shadow: 0 0 0 0.2em ' + a + '; box-shadow: 0 0 0 0.2em ' + a + '; }',

            /* player progress */
            b + ' .player-panel__timeline { background-color: rgba(255, 255, 255, 0.18); }',
            b + ' .player-panel__position, ' + b + ' .player-panel__position > div:after { background-color: ' + a + '; }',
            b + ' .time-line > div { background-color: ' + a + '; }'
        ];

        if (focus === 'frame') {
            rules.push(scope(focusFrame) + ' { border-color: ' + a + ' !important; }');
        }
        else {
            /* lift: the focused poster grows a little and casts a shadow, with a thin light ring */
            rules.push(
                b + ' .card .card__view { -webkit-transition: -webkit-transform 0.15s ease-out; transition: transform 0.15s ease-out; }',
                b + ' .card.focus .card__view { -webkit-transform: scale(1.06); transform: scale(1.06); }',
                b + ' .card.focus .card__img { -webkit-box-shadow: 0 1em 2em rgba(0, 0, 0, 0.75); box-shadow: 0 1em 2em rgba(0, 0, 0, 0.75); }',
                scope(focusFrame) + ' { border-width: 0.15em !important; border-color: rgba(255, 255, 255, 0.85) !important; }'
            );
        }

        rules = rules.concat(ouiCss(a));

        return rules.join('\n');
    }

    /* The new look (plugin online-ui.js: class .oui and body.oui-on): tvOS colours on top of it. The page already lies on a blurred
     * still, so episode cards are glass by translucency alone; real backdrop-filter only on the pills and the
     * play button over the header art, and only where the engine has it (not Tizen 4). */
    function ouiCss(a) {
        var o = 'body.' + BODY_CLASS + ' .oui';
        return [
            /* under the new look the page is not flat black: a faint cool glow from the top left, as on tvOS */
            'body.' + BODY_CLASS + '.oui-on { background: #000 -webkit-radial-gradient(20% 0%, ellipse cover, #1b2130 0%, #07080b 55%, #000 100%) !important; ' +
                'background: radial-gradient(120% 80% at 20% 0%, #1b2130 0%, #07080b 55%, #000 100%) !important; }',
            o + ' .oui-card { -webkit-border-radius: 1.4em; border-radius: 1.4em; ' +
                '-webkit-transition: -webkit-transform 0.15s ease-out; transition: transform 0.15s ease-out; }',
            o + ' .oui-card__thumb { -webkit-border-radius: 1em; border-radius: 1em; }',
            o + ' .oui-card.focus { background: rgba(255, 255, 255, 0.95); -webkit-transform: scale(1.02); transform: scale(1.02); ' +
                '-webkit-box-shadow: 0 1.2em 2.4em rgba(0, 0, 0, 0.45); box-shadow: 0 1.2em 2.4em rgba(0, 0, 0, 0.45); }',
            o + ' .oui-progress__bar > div, ' + o + ' .oui-card__bar > div { background: ' + a + '; }',
            o + ' .oui-tag--left { background: ' + a + '; }',
            o + ' .oui-play, ' + o + ' .oui-chip { -webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.08); ' +
                'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.08); }',
            '@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {\n' +
                o + ' .oui-play:not(.focus), ' + o + ' .oui-chip:not(.focus) { background: rgba(255, 255, 255, 0.12); ' +
                '-webkit-backdrop-filter: blur(1.6em) saturate(1.8); backdrop-filter: blur(1.6em) saturate(1.8); }\n}'
        ];
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
        for (var name in ACCENTS) accents[name] = Lampa.Lang.translate('theme_apple_accent_' + name);

        Lampa.SettingsApi.addComponent({
            component: 'theme_apple_tv',
            name: Lampa.Lang.translate('theme_apple_tv_title'),
            icon: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
                '<rect x="2" y="4" width="20" height="13" rx="2.5"/><rect x="8" y="19" width="8" height="1.8" rx="0.9"/></svg>'
        });
        Lampa.SettingsApi.addParam({
            component: 'theme_apple_tv',
            param: { name: KEY_ON, type: 'trigger', 'default': false },
            field: {
                name: Lampa.Lang.translate('theme_apple_tv_on'),
                description: Lampa.Lang.translate('theme_apple_tv_on_descr')
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'theme_apple_tv',
            param: { name: KEY_ACCENT, type: 'select', values: accents, 'default': 'blue' },
            field: { name: Lampa.Lang.translate('theme_apple_tv_accent') }
        });
        Lampa.SettingsApi.addParam({
            component: 'theme_apple_tv',
            param: {
                name: KEY_FOCUS,
                type: 'select',
                values: {
                    lift: Lampa.Lang.translate('theme_apple_tv_focus_lift'),
                    frame: Lampa.Lang.translate('theme_apple_tv_focus_frame')
                },
                'default': 'lift'
            },
            field: { name: Lampa.Lang.translate('theme_apple_tv_focus') }
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
