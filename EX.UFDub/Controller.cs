using Microsoft.AspNetCore.Mvc;
using Shared;
using Shared.Attributes;
using Shared.Models.Base;
using Shared.Models.Templates;
using Shared.Services.RxEnumerate;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;

namespace EX.UFDub;

public class ExUfdubController : BaseOnlineController
{
    public ExUfdubController() : base(ModInit.conf) { }

    [HttpGet, Staticache(manually: true)]
    [Route("lite/ex_ufdub")]
    async public Task<ActionResult> Index(string title, string original_title, short year, string href = null, short t = -1, int serial = -1, bool rjson = false, bool similar = false)
    {
        if (await IsRequestBlocked(rch: true))
            return badInitMsg;

        string enc_title = HttpUtility.UrlEncode(title);
        string enc_original_title = HttpUtility.UrlEncode(original_title);

        #region search
        if (string.IsNullOrWhiteSpace(href))
        {
            if (string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(original_title))
                return OnError();

        rhubFallbackSearch:
            var search = await InvokeCacheResult<List<(string title, string href, string poster)>>($"ex_ufdub:search:{title}:{original_title}", TimeSpan.FromHours(4), async e =>
            {
                var found = new List<(string title, string href, string poster)>();

                // The site search is fuzzy: try the localized title first, then the original one.
                foreach (string query in new[] { title, original_title }.Where(q => !string.IsNullOrWhiteSpace(q)).Distinct())
                {
                    string page = null;
                    await httpHydra.PostSpan($"{init.host}/index.php?do=search", $"do=search&subaction=search&story={HttpUtility.UrlEncode(query)}", html =>
                    {
                        page = html.ToString();
                    });

                    foreach (var row in ParseSearch(page, init.host))
                    {
                        if (!found.Any(f => f.href == row.href))
                            found.Add(row);
                    }

                    if (found.Any(f => IsExactMatch(f.title, title, original_title)))
                        break;
                }

                if (found.Count == 0)
                    return e.Fail("search", refresh_proxy: true);

                return e.Success(found);
            });

            if (IsRhubFallback(search))
                goto rhubFallbackSearch;

            if (!search.IsSuccess)
                return OnError(search.ErrorMsg);

            // The balancer must stay grey for titles the site does not have: only an exact name match is
            // opened automatically, near matches are listed only on explicit request (similar=true).
            var exact = search.Value.Where(f => IsExactMatch(f.title, title, original_title)).ToList();
            if (exact.Count > 0 && !similar)
            {
                href = exact[0].href;
            }
            else if (similar)
            {
                var stpl = new SimilarTpl(search.Value.Count);

                foreach (var item in search.Value)
                {
                    stpl.Append(
                        item.title,
                        string.Empty,
                        string.Empty,
                        $"{host}/lite/ex_ufdub?rjson={rjson}&title={enc_title}&original_title={enc_original_title}&year={year}&href={HttpUtility.UrlEncode(item.href)}",
                        item.poster
                    );
                }

                return ContentTpl(stpl);
            }
            else
            {
                return OnError("exact match");
            }
        }
        #endregion

    rhubFallbackVideos:
        var videos = await InvokeCacheResult<List<UfdubEpisode>>($"ex_ufdub:videos:{href}", TimeSpan.FromHours(2), async e =>
        {
            // The title page embeds the video.ufdub.com player; its address differs between sections, so read it from the page.
            string player = null;
            await httpHydra.GetSpan($"{init.host}/{href.TrimStart('/')}", html =>
            {
                player = Rx.Match(html, "<iframe[^>]*src=\"(https?://[^\"]*?VP\\.php\\?ID=[0-9]+)");
            });

            if (string.IsNullOrEmpty(player))
                return e.Fail("player", refresh_proxy: true);

            string list = null;
            await httpHydra.GetSpan(player, html =>
            {
                list = html.ToString();
            });

            var items = ParseVideos(list);
            if (items.Count == 0)
                return e.Fail("videos");

            return e.Success(items);
        });

        if (IsRhubFallback(videos))
            goto rhubFallbackVideos;

        if (!videos.IsSuccess)
            return OnError(videos.ErrorMsg);

        #region movie
        if (serial == 0 || videos.Value.Count == 1)
        {
            var mtpl = new MovieTpl(title, original_title, videos.Value.Count);

            foreach (var item in videos.Value)
                mtpl.Append(item.Name, HostStreamProxy(item.Url), vast: init.vast);

            return ContentTpl(mtpl);
        }
        #endregion

        #region serial
        var tabs = videos.Value.GroupBy(v => v.Tab).ToList();

        if (t < 0 || t >= tabs.Count)
            t = 0;

        var vtpl = new VoiceTpl(tabs.Count);
        for (short i = 0; i < tabs.Count; i++)
        {
            vtpl.Append(
                tabs[i].Key,
                i == t,
                $"{host}/lite/ex_ufdub?rjson={rjson}&title={enc_title}&original_title={enc_original_title}&year={year}&serial={serial}&href={HttpUtility.UrlEncode(href)}&t={i}"
            );
        }

        var episodes = tabs[t].ToList();
        var etpl = new EpisodeTpl(vtpl, episodes.Count);

        for (int i = 0; i < episodes.Count; i++)
        {
            etpl.Append(
                episodes[i].Name,
                title ?? original_title,
                "1",
                EpisodeNumber(episodes[i].Name, i).ToString(),
                HostStreamProxy(episodes[i].Url),
                vast: init.vast
            );
        }

        return ContentTpl(etpl);
        #endregion
    }


    #region helpers
    static string Norm(string s)
    {
        return string.IsNullOrWhiteSpace(s) ? null : new string(s.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
    }

    /// <summary>The site titles look like "Українська назва / Original name"; compare each part with the card titles.</summary>
    static bool IsExactMatch(string siteTitle, string title, string original_title)
    {
        string nt = Norm(title), no = Norm(original_title);

        foreach (string part in siteTitle.Split('/'))
        {
            string p = Norm(part);
            if (p != null && (p == nt || p == no))
                return true;
        }

        return false;
    }

    static List<(string title, string href, string poster)> ParseSearch(string html, string host)
    {
        var list = new List<(string title, string href, string poster)>();
        if (string.IsNullOrEmpty(html))
            return list;

        var anchors = Regex.Matches(html,
            "<a[^>]*class=\"short-t\"[^>]*href=\"([^\"]+\\.html)\"[^>]*>([^<]+)</a>|<a[^>]*href=\"([^\"]+\\.html)\"[^>]*class=\"short-t\"[^>]*>([^<]+)</a>");

        int prevEnd = 0;
        foreach (Match m in anchors)
        {
            string url = m.Groups[1].Success ? m.Groups[1].Value : m.Groups[3].Value;
            string name = WebUtility.HtmlDecode(m.Groups[1].Success ? m.Groups[2].Value : m.Groups[4].Value).Trim();

            // The poster of a card is the last <img> before its title link.
            string region = html.Substring(prevEnd, m.Index - prevEnd);
            prevEnd = m.Index + m.Length;
            var imgs = Regex.Matches(region, "<img[^>]+src=\"([^\"]+)\"");
            string poster = imgs.Count > 0 ? imgs[imgs.Count - 1].Groups[1].Value : null;
            if (!string.IsNullOrEmpty(poster) && poster.StartsWith("/"))
                poster = host.TrimEnd('/') + poster;

            string rel = url.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? new Uri(url).AbsolutePath.TrimStart('/') : url.TrimStart('/');
            if (!string.IsNullOrWhiteSpace(name) && !string.IsNullOrWhiteSpace(rel))
                list.Add((name, rel, poster));
        }

        return list;
    }

    /// <summary>The player page holds rows like ['[01] Title','mp4','https://…/VIDEOS.php?ID=1&amp;TAB=…&amp;Seriya=…&amp;POS=1'].</summary>
    static List<UfdubEpisode> ParseVideos(string html)
    {
        var list = new List<UfdubEpisode>();
        if (string.IsNullOrEmpty(html))
            return list;

        foreach (Match m in Regex.Matches(html, @"\['((?:[^'\\]|\\.)*)','mp4','((?:[^'\\]|\\.)*)'\]"))
        {
            string name = WebUtility.HtmlDecode(Unescape(m.Groups[1].Value)).Trim();
            string url = Unescape(m.Groups[2].Value);

            // Trailers/teasers share the list with the episodes and would take the number of the first episode.
            if (string.IsNullOrWhiteSpace(url) || Regex.IsMatch(name, @"^\s*[\[(]?\s*(трейлер|тизер|teaser|trailer|промо|анонс)", RegexOptions.IgnoreCase))
                continue;

            var tab = Regex.Match(url, @"[?&]TAB=([^&]*)");
            string tabName = tab.Success && tab.Groups[1].Value.Length > 0 ? HttpUtility.UrlDecode(tab.Groups[1].Value) : "Основа";

            list.Add(new UfdubEpisode { Name = name, Url = EncodeUrl(url), Tab = tabName });
        }

        return list;
    }

    static string Unescape(string s) => s.Replace("\\'", "'").Replace("\\\\", "\\");

    /// <summary>The site returns unencoded Cyrillic/space/bracket values; percent-encode every value of the query.</summary>
    static string EncodeUrl(string url)
    {
        int q = url.IndexOf('?');
        if (q < 0)
            return url;

        var parts = Regex.Split(url.Substring(q + 1), "&(?=(?:ID|TAB|Seriya|POS)=)");
        var encoded = parts.Select(p =>
        {
            int eq = p.IndexOf('=');
            return eq < 0 ? p : p.Substring(0, eq + 1) + Uri.EscapeDataString(p.Substring(eq + 1));
        });

        return url.Substring(0, q + 1) + string.Join("&", encoded);
    }

    static int EpisodeNumber(string name, int index)
    {
        var m = Regex.Match(name, @"^\s*\[?\s*(\d{1,4})\s*\]?");
        if (!m.Success)
            m = Regex.Match(name, @"(?:епізод|серія|серия|episode|ep)\s*(\d{1,4})", RegexOptions.IgnoreCase);

        return m.Success ? int.Parse(m.Groups[1].Value) : index + 1;
    }
    #endregion
}
