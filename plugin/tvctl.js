/**
 * tvctl — remote control and diagnostics for Lampa, paired with the Lampac module EX.TvCtl.
 *
 * The plugin long-polls `<Lampac>/tvctl/poll?dev=<device>`, runs the command and posts reports to
 * `<Lampac>/tvctl/report`. Commands are queued with `POST /tvctl/cmd?dev=<device>` (Lampac root password).
 *
 * Install: copy this file to `<Lampac>/wwwroot/custom/tvctl.js` and add the plugin
 * `http(s)://<your-lampac>/custom/tvctl.js` in Lampa (Settings → Extensions).
 *
 * Device name: Android model from the User-Agent (e.g. "MIBOX4"), "TIZEN" on Samsung, otherwise a random
 * id saved in Lampa storage (`tvctl_dev`). Optional whitelist before the plugin loads:
 *   window.tvctl_devices = ['MIBOX4', 'TIZEN'];
 *
 * Commands (JSON): {"cmd":"state"} · {"cmd":"items"} · {"cmd":"click","index":N}
 *   {"cmd":"key","keys":["up","down","left","right","enter","back"]} · {"cmd":"open","id":<tmdb>,"type":"tv|movie"}
 *   {"cmd":"online","balanser":"<name>"} · {"cmd":"reload"}
 * Reports: hello, result, req (Lampa requests to /lite/, incl. native Android ones), xhr, noty,
 *   player_start / player_destroy, activity, error.
 *
 * ES5 — works on Tizen 4.0 and old WebViews.
 */
(function () {
    'use strict';

    if (window.tvctl_loaded) return;
    window.tvctl_loaded = true;

    var ua = navigator.userAgent || '';
    var model = (ua.match(/;\s*([^;()]+?)\s+Build\//) || [])[1] || '';
    var dev = model.replace(/\s+/g, '_');
    /* Samsung (Tizen): the UA has no "… Build/" model, only "Tizen x.y" */
    if (!dev && /Tizen/i.test(ua)) dev = 'TIZEN';
    if (!dev) {
        try {
            dev = localStorage.getItem('tvctl_dev') || ('dev' + Math.random().toString(36).slice(2, 8));
            localStorage.setItem('tvctl_dev', dev);
        } catch (e) { dev = 'device'; }
    }
    var DEVICES = window.tvctl_devices;
    if (DEVICES && DEVICES.indexOf(dev) === -1) return;

    /* Lampac address: the tag's own src when served from <Lampac>/custom/, otherwise the page origin */
    var BASE = (function () {
        var s = document.currentScript;
        if (!s) {
            var all = document.getElementsByTagName('script');
            for (var i = all.length - 1; i >= 0; i--) {
                if (all[i].src && all[i].src.indexOf('/custom/tvctl.js') !== -1) { s = all[i]; break; }
            }
        }
        if (s && s.src && s.src.indexOf('/custom/tvctl.js') !== -1) return s.src.replace(/\/custom\/tvctl\.js.*$/, '');
        if (/^https?:$/.test(location.protocol)) return location.origin;
        return '';
    })();
    if (!BASE) return;

    var RealXHR = window.XMLHttpRequest;

    function send(method, path, body, cb) {
        var x = new RealXHR();
        x.__tvctl = true;
        x.open(method, BASE + path, true);
        x.timeout = 35000;
        x.onload = function () { if (cb) cb(x.status, x.responseText); };
        x.onerror = x.ontimeout = function () { if (cb) cb(0, ''); };
        x.send(body || null);
    }

    function report(obj) {
        try { send('POST', '/tvctl/report?dev=' + encodeURIComponent(dev), JSON.stringify(obj)); } catch (e) { }
    }

    function text(el) {
        return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    }

    function activity() {
        var a = window.Lampa && Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
        return a || {};
    }

    function root() {
        /* select boxes (source, filter, player choice) are rendered outside the activity */
        if (document.body.classList.contains('selectbox--open')) {
            var sb = document.querySelector('.selectbox');
            if (sb) return sb;
        }
        var a = activity();
        var r = a.activity && a.activity.render ? a.activity.render() : null;
        r = r && r[0] ? r[0] : r;
        return r || document.body;
    }

    function items() {
        var list = [];
        var all = root().querySelectorAll('.selector');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (!el.offsetParent && el.offsetWidth === 0) continue;
            list.push(el);
        }
        return list;
    }

    function state() {
        var a = activity();
        var focus = document.querySelector('.focus');
        var card = a.card || a.movie || {};
        return {
            component: a.component || '',
            title: a.title || '',
            card: card.id ? { id: card.id, title: card.title || card.name, original: card.original_title || card.original_name } : null,
            focus: text(focus),
            items: items().length
        };
    }

    var MOVES = { up: 'up', down: 'down', left: 'left', right: 'right' };

    function run(c) {
        var res = { ok: true };
        try {
            if (c.cmd === 'state') {
                res.state = state();
            } else if (c.cmd === 'items') {
                res.items = items().slice(0, 80).map(function (el, i) { return i + ': ' + text(el); });
            } else if (c.cmd === 'click') {
                var el = items()[c.index];
                if (!el) throw new Error('no item ' + c.index);
                /* same as Lampa itself: a native event, jQuery handlers receive it too */
                ['hover:focus', 'hover:enter'].forEach(function (name) {
                    var ev = document.createEvent('Event');
                    ev.initEvent(name, false, true);
                    el.dispatchEvent(ev);
                });
                res.clicked = text(el);
            } else if (c.cmd === 'key') {
                (c.keys || []).forEach(function (k) {
                    if (MOVES[k]) Lampa.Controller.move(MOVES[k]);
                    else if (k === 'enter') Lampa.Controller.enter();
                    else if (k === 'back') Lampa.Activity.backward();
                });
                res.state = state();
            } else if (c.cmd === 'open') {
                var type = c.type === 'movie' ? 'movie' : 'tv';
                var source = c.source || 'tmdb';
                Lampa.Activity.push({ url: '', component: 'full', id: c.id, method: type, card: { id: c.id, source: source }, source: source });
            } else if (c.cmd === 'online') {
                var a = activity();
                var movie = a.card || a.movie;
                if (!movie || !movie.id) throw new Error('open a card first (open)');
                var o = { url: '', title: 'Онлайн', component: 'lampac', search: movie.title || movie.name, search_one: movie.title || movie.name,
                          search_two: movie.original_title || movie.original_name, movie: movie, page: 1 };
                /* store the choice the same way online.js does (updateBalanser/changeBalanser) */
                if (c.balanser) {
                    var bal = String(c.balanser).toLowerCase();
                    var last = Lampa.Storage.cache('online_last_balanser', 3000, {});
                    last[movie.id] = bal;
                    Lampa.Storage.set('online_last_balanser', last);
                    Lampa.Storage.set('online_balanser', bal);
                }
                Lampa.Activity.push(o);
            } else if (c.cmd === 'reload') {
                location.reload();
            } else {
                throw new Error('unknown command ' + c.cmd);
            }
        } catch (e) {
            res.ok = false;
            res.error = String(e && e.message || e);
        }
        res.cmd = c.cmd;
        report({ ev: 'result', res: res });
    }

    function poll() {
        send('GET', '/tvctl/poll?dev=' + encodeURIComponent(dev), null, function (status, body) {
            if (status === 200 && body) {
                try { run(JSON.parse(body)); } catch (e) { report({ ev: 'error', where: 'parse', error: String(e) }); }
            }
            setTimeout(poll, status === 0 ? 5000 : 50);
        });
    }

    /* --- observers ------------------------------------------------------------ */

    /* Balancer requests: URL, status, time, size (/lite/ only, secrets masked) */
    var origOpen = RealXHR.prototype.open;
    var origSend = RealXHR.prototype.send;
    RealXHR.prototype.open = function (m, u) {
        this.__tv_url = String(u || '');
        return origOpen.apply(this, arguments);
    };
    RealXHR.prototype.send = function () {
        var x = this;
        if (!x.__tvctl && x.__tv_url.indexOf('/lite/') !== -1) {
            var t0 = Date.now();
            x.addEventListener('loadend', function () {
                report({ ev: 'xhr', url: x.__tv_url.replace(/(passwd|token|key)=[^&]*/gi, '$1=***').slice(0, 300),
                         status: x.status, ms: Date.now() - t0, len: (x.responseText || '').length,
                         head: (x.status >= 300 || x.status === 0) ? (x.responseText || '').slice(0, 200) : undefined });
            });
        }
        return origSend.apply(this, arguments);
    };

    function hook() {
        if (Lampa.Noty && Lampa.Noty.show && !Lampa.Noty.__tvctl) {
            var origShow = Lampa.Noty.show;
            Lampa.Noty.show = function (msg) {
                report({ ev: 'noty', text: String(msg).slice(0, 300), state: state() });
                return origShow.apply(this, arguments);
            };
            Lampa.Noty.__tvctl = true;
        }

        if (Lampa.Player && Lampa.Player.listener) {
            Lampa.Player.listener.follow('start', function (d) {
                report({ ev: 'player_start', title: d && d.title, url: d && String(d.url || '').slice(0, 200) });
            });
            Lampa.Player.listener.follow('destroy', function () { report({ ev: 'player_destroy' }); });
        }

        if (Lampa.Listener) {
            /* On Android Lampa uses native requests (android_go), bypassing XMLHttpRequest,
               so listen to its own request_before / request_secuses / request_error events */
            var started = {};
            var lite = function (p) { return p && p.url && String(p.url).indexOf('/lite/') !== -1; };
            var clean = function (u) { return String(u).replace(/(passwd|token|key)=[^&]*/gi, '$1=***').slice(0, 1200); };
            Lampa.Listener.follow('request_before', function (e) {
                if (lite(e.params)) started[e.params.url] = Date.now();
            });
            Lampa.Listener.follow('request_secuses', function (e) {
                if (!lite(e.params)) return;
                var d = e.data, len = typeof d === 'string' ? d.length : (d ? JSON.stringify(d).length : 0);
                report({ ev: 'req', ok: true, url: clean(e.params.url), ms: Date.now() - (started[e.params.url] || Date.now()), len: len });
            });
            Lampa.Listener.follow('request_error', function (e) {
                if (!lite(e.params)) return;
                var x = e.error || {};
                report({ ev: 'req', ok: false, url: clean(e.params.url), ms: Date.now() - (started[e.params.url] || Date.now()),
                         status: x.status, exception: String(e.exception || ''), head: String(x.responseText || '').slice(0, 200) });
            });

            Lampa.Listener.follow('activity', function (e) {
                if (e && e.type === 'start') report({ ev: 'activity', component: e.component, state: state() });
            });
        }

        window.addEventListener('error', function (e) {
            report({ ev: 'error', where: 'window', error: String(e.message), src: String(e.filename || '').slice(-80), line: e.lineno });
        });

        report({ ev: 'hello', dev: dev, base: BASE, ua: ua.slice(0, 160) });
        poll();
    }

    if (window.appready) hook();
    else if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') hook(); });
})();
