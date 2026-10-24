/* Lampa 3+ plugin: adds the AI-managed carousel through the local Lampac route.
 *
 * The feed (/mcp/collection, module EX.Mcp) only lists TMDB ids. Details for the wide
 * cards (16:9 backdrop, localized title, overview, rating) are fetched with Lampa's
 * own TMDB source, i.e. through the same TMDB proxy Lampa already uses, and cached
 * on the device for a day. ES5 only: Tizen 4 / webOS 4 engines.
 */
(function () {
    'use strict';

    if (window.lampac_mcp_loaded) return;
    window.lampac_mcp_loaded = true;

    /* Tizen can run Lampa from its packaged file:// page; use this plugin's Lampac URL. */
    var BASE = (function () {
        var script = document.currentScript;
        if (!script) {
            var scripts = document.getElementsByTagName('script');
            for (var i = scripts.length - 1; i >= 0; i--) {
                if (scripts[i].src && scripts[i].src.indexOf('/custom/lampac-mcp.js') !== -1) {
                    script = scripts[i];
                    break;
                }
            }
        }
        if (script && script.src && script.src.indexOf('/custom/lampac-mcp.js') !== -1) {
            return script.src.replace(/\/custom\/lampac-mcp\.js.*$/, '');
        }
        if (/^https?:$/.test(window.location.protocol)) return window.location.origin;
        return '';
    })();
    if (!BASE) return;

    var endpoint = BASE + '/mcp/collection';
    var CACHE_KEY = 'lampac_mcp_tmdb_cache';
    var CACHE_TTL = 24 * 60 * 60 * 1000;
    var DETAILS_TIMEOUT = 8000;

    function loadCollection(done) {
        var request = new XMLHttpRequest();
        request.open('GET', endpoint, true);
        request.timeout = 10000;
        request.onload = function () {
            if (request.status < 200 || request.status >= 300) return done({ title: 'AI picks', items: [] });
            try { done(JSON.parse(request.responseText)); }
            catch (error) { done({ title: 'AI picks', items: [] }); }
        };
        request.onerror = request.ontimeout = function () { done({ title: 'AI picks', items: [] }); };
        request.send();
    }

    function readCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; }
        catch (e) { return {}; }
    }

    function writeCache(cache) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
        catch (e) {}
    }

    /* Keep only what the card needs: the full TMDB answer is large and localStorage on TVs is small. */
    function pick(json) {
        return {
            title: json.title || json.name || '',
            original_title: json.original_title || json.original_name || '',
            backdrop_path: json.backdrop_path || '',
            poster_path: json.poster_path || '',
            vote_average: json.vote_average || 0,
            date: json.release_date || json.first_air_date || '',
            overview: json.overview || ''
        };
    }

    function details(item, cache, done) {
        var key = item.media_type + '_' + item.id;
        var hit = cache[key];
        if (hit && Date.now() - hit.t < CACHE_TTL) return done(hit.d);

        var finished = false;
        function finish(data) {
            if (finished) return;
            finished = true;
            if (data) cache[key] = { t: Date.now(), d: data };
            done(data || (hit ? hit.d : null));
        }
        setTimeout(function () { finish(null); }, DETAILS_TIMEOUT);

        try {
            Lampa.Api.sources.tmdb.get(item.media_type + '/' + item.id, {},
                function (json) { finish(json && json.id ? pick(json) : null); },
                function () { finish(null); });
        } catch (e) { finish(null); }
    }

    function card(item, d) {
        var c = { id: item.id, source: 'tmdb', media_type: item.media_type };
        var title = (d && d.title) || item.title;
        if (item.media_type === 'tv') {
            c.name = title;
            c.original_name = d ? d.original_title : '';
            c.first_air_date = d ? d.date : '';
        }
        else {
            c.title = title;
            c.original_title = d ? d.original_title : '';
            c.release_date = d ? d.date : '';
        }
        if (d) {
            c.backdrop_path = d.backdrop_path;
            c.poster_path = d.poster_path;
            c.vote_average = d.vote_average;
            c.overview = d.overview;
        }

        /* Lampa 3 wide card (same as its own "In top" rows): 16:9 backdrop w780,
           title and overview drawn over it; falls back to the poster without a backdrop */
        c.params = { style: { name: 'wide' } };
        return c;
    }

    function build(collection, complete) {
        var items = Array.isArray(collection.items) ? collection.items : [];
        var cache = readCache();
        var left = items.length;
        var found = [];

        function emit() {
            writeCache(cache);
            var results = [];
            for (var i = 0; i < items.length; i++) results.push(card(items[i], found[i]));
            complete({
                title: collection.title || 'AI picks',
                results: results,
                params: { items: { view: 3 } },
                page: 1,
                total_pages: 1,
                total_results: results.length
            });
        }

        if (!left) return emit();
        items.forEach(function (item, index) {
            details(item, cache, function (d) {
                found[index] = d;
                if (--left === 0) emit();
            });
        });
    }

    function addRow() {
        if (!window.Lampa || !Lampa.ContentRows || !Lampa.ContentRows.add) return;
        if (Lampa.Manifest && Number(Lampa.Manifest.app_digital) < 300) return;

        Lampa.ContentRows.add({
            name: 'lampac_mcp_ai_picks',
            title: 'Топ аніме Hikka',
            index: 1,
            screen: ['main', 'category'],
            call: function () {
                called = true;
                return function (complete) {
                    loadCollection(function (collection) { build(collection, complete); });
                };
            }
        });

        /* Plugins arrive after Lampa is ready; on some devices (Android TV) the start screen is
           already built by then and ContentRows is asked only while building a screen. If our
           row was not requested, rebuild the visible main/category screen once. */
        setTimeout(function () {
            if (called) return;
            var active = Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
            if (active && (active.component === 'main' || active.component === 'category')) Lampa.Activity.refresh();
        }, 1500);
    }
    var called = false;

    if (window.appready) addRow();
    else if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app', function (event) {
        if (event && event.type === 'ready') addRow();
    });
})();
