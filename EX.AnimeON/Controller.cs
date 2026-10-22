using Microsoft.AspNetCore.Mvc;
using Shared;
using Shared.Attributes;
using Shared.Models.Base;
using Shared.Models.Templates;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;

namespace EX.AnimeON;

public class ExAnimeONController : BaseOnlineController
{
    public ExAnimeONController() : base(ModInit.conf) { }

    [HttpGet, Staticache(manually: true)]
    [Route("lite/ex_animeon")]
    async public Task<ActionResult> Index(string imdb_id, string title, string original_title, short year, short t = -1, short s = -1, int animeid = 0, bool rjson = false, long id = 0, string source = null, int serial = -1)
    {
        if (await IsRequestBlocked(rch: true))
            return badInitMsg;

        string enc_title = HttpUtility.UrlEncode(title);
        string enc_original_title = HttpUtility.UrlEncode(original_title);

        #region search
        if (animeid == 0)
        {
            // Match the card by MAL id (via the optional "animap" service from init.conf).
            var map = await AniMap.Get(id, source, serial);
            string searchText = map?.TitleUa ?? title;

        rhubFallbackSearch:
            var search = await InvokeCacheResult<List<CatalogItem>>($"animeon:search:{searchText}", TimeSpan.FromHours(4), async e =>
            {
                var root = await httpHydra.Get<SearchResponse>($"{init.host}/api/anime/search?text={HttpUtility.UrlEncode(searchText)}");
                if (root == null)
                    return e.Fail("search", refresh_proxy: true);

                var result = root?.result;
                if (result == null || result.Length == 0)
                    return e.Fail("result");

                var catalog = new List<CatalogItem>(result.Length);

                foreach (var node in result)
                {
                    int id = node?.id ?? 0;
                    if (id == 0)
                        continue;

                    catalog.Add(new CatalogItem
                    {
                        Id = id,
                        Season = node?.season ?? 0,
                        ImdbId = node?.imdbId,
                        MalId = node?.malId,
                        Title = node?.titleUa ?? node?.titleEn,
                        Year = node?.releaseDate,
                        Poster = node?.image?.preview
                    });
                }

                if (catalog.Count == 0)
                    return e.Fail("catalog");

                return e.Success(catalog);
            });

            if (IsRhubFallback(search))
                goto rhubFallbackSearch;

            if (!search.IsSuccess)
                return OnError(search.ErrorMsg);

            var matched = search.Value;
            if (map != null)
            {
                var exact = search.Value.Where(i => i.MalId != null && map.MalIds.Contains(i.MalId))
                                        .OrderBy(i => map.MalIds.IndexOf(i.MalId)).ToList();
                if (exact.Count == 1)
                    return LocalRedirect($"{host}/lite/ex_animeon?rjson={rjson}&s={exact[0].Season}&imdb_id={HttpUtility.UrlEncode(imdb_id)}&title={HttpUtility.UrlEncode(title)}&original_title={HttpUtility.UrlEncode(original_title)}&year={year}&animeid={exact[0].Id}");
                if (exact.Count > 1)
                    matched = exact;
                if (exact.Count == 0)
                    return OnError("animap: no exact match"); // the card is known, but this source has no such title
            }

            if (matched.Count == 1 && !string.IsNullOrWhiteSpace(imdb_id) && string.Equals(matched[0].ImdbId, imdb_id, StringComparison.OrdinalIgnoreCase))
                return LocalRedirect($"{host}/lite/ex_animeon?rjson={rjson}&s={matched[0].Season}&imdb_id={HttpUtility.UrlEncode(imdb_id)}&title={HttpUtility.UrlEncode(title)}&original_title={HttpUtility.UrlEncode(original_title)}&year={year}&animeid={matched[0].Id}");

            var stpl = new SimilarTpl(matched.Count);

            foreach (var item in matched)
            {
                stpl.Append(
                    item.Title,
                    item.Year,
                    string.Empty,
                    $"{host}/lite/ex_animeon?rjson={rjson}&s={item.Season}&imdb_id={HttpUtility.UrlEncode(imdb_id)}&title={enc_title}&original_title={enc_original_title}&year={year}&animeid={item.Id}",
                    PosterApi.Size($"{init.host}/api/uploads/images/{item.Poster}")
                );
            }

            return ContentTpl(stpl);
        }
        #endregion

    rhubFallbackTranslations:
        var translations = await InvokeCacheResult<List<TranslationOption>>($"animeon:translations:{animeid}", TimeSpan.FromHours(2), async e =>
        {
            var root = await httpHydra.Get<TranslationsResponse>($"{init.host}/api/player/{animeid}/translations");
            var items = root?.translations;
            if (items == null || items.Length == 0)
                return e.Fail("translations");

            var list = new List<TranslationOption>();

            foreach (var node in items)
            {
                int translationId = node?.translation?.id ?? 0;
                if (translationId == 0)
                    continue;

                int playerId = node?.player?
                    .FirstOrDefault(p => string.Equals(p?.name, "Ashdi", StringComparison.OrdinalIgnoreCase))?.id ?? 0;

                if (playerId != 0)
                {
                    list.Add(new TranslationOption
                    {
                        TranslationId = translationId,
                        PlayerId = playerId,
                        Title = node?.translation?.name ?? "Ashdi"
                    });
                }
            }

            if (list.Count == 0)
                return e.Fail("ashdi translations");

            return e.Success(list);
        });

        if (IsRhubFallback(translations))
            goto rhubFallbackTranslations;

        if (!translations.IsSuccess)
            return OnError(translations.ErrorMsg);

        if (t == -1)
            t = 0;

        if (t >= translations.Value.Count)
            t = 0;

        var currentTranslation = translations.Value[t];

    rhubFallbackEpisodes:
        var episodes = await InvokeCacheResult<List<EpisodeOption>>($"animeon:episodes:{animeid}:{currentTranslation.PlayerId}:{currentTranslation.TranslationId}", TimeSpan.FromMinutes(40), async e =>
        {
            var root = await httpHydra.Get<EpisodesResponse>($"{init.host}/api/player/{animeid}/episodes?take=100&skip=-1&playerId={currentTranslation.PlayerId}&translationId={currentTranslation.TranslationId}");
            var items = root?.episodes;
            if (items == null || items.Length == 0)
                return e.Fail("episodes");

            var list = new List<EpisodeOption>();

            foreach (var node in items)
            {
                string file = node?.fileUrl;
                if (string.IsNullOrWhiteSpace(file))
                    continue;

                int episode = node?.episode ?? 0;

                list.Add(new EpisodeOption
                {
                    Episode = episode,
                    Title = episode > 0 ? $"{episode} серия" : "Серия",
                    FileUrl = file
                });
            }

            if (list.Count == 0)
                return e.Fail("episode list");

            return e.Success(list);
        });

        if (IsRhubFallback(episodes))
            goto rhubFallbackEpisodes;

        if (!episodes.IsSuccess)
            return OnError(episodes.ErrorMsg);

        var vtpl = new VoiceTpl(translations.Value.Count);
        for (short i = 0; i < translations.Value.Count; i++)
        {
            vtpl.Append(
                translations.Value[i].Title,
                i == t,
                $"{host}/lite/ex_animeon?rjson={rjson}&imdb_id={HttpUtility.UrlEncode(imdb_id)}&title={enc_title}&original_title={enc_original_title}&year={year}&animeid={animeid}&s={s}&t={i}"
            );
        }

        var etpl = new EpisodeTpl(vtpl, episodes.Value.Count);

        foreach (var item in episodes.Value)
        {
            string stream = HostStreamProxy(item.FileUrl);
            string epNum = item.Episode > 0 ? item.Episode.ToString() : Regex.Match(item.Title, "([0-9]+)").Groups[1].Value;
            if (string.IsNullOrEmpty(epNum))
                epNum = (episodes.Value.IndexOf(item) + 1).ToString();

            etpl.Append(
                item.Title,
                title ?? original_title,
                s,
                epNum,
                stream,
                vast: init.vast
            );
        }

        return ContentTpl(etpl);
    }
}


/* Optional animap client: returns null when not configured or nothing matched. */
static class AniMap
{
    static readonly System.Net.Http.HttpClient http = new() { Timeout = TimeSpan.FromSeconds(8) };

    public class Result
    {
        public List<string> MalIds = new();
        public string TitleUa;
    }

    public static async Task<Result> Get(long tmdb, string source, int serial)
    {
        if (string.IsNullOrWhiteSpace(ModInit.animap) || tmdb <= 0 || (!string.IsNullOrEmpty(source) && !source.Equals("tmdb", StringComparison.OrdinalIgnoreCase)))
            return null;
        try
        {
            string type = serial == 0 ? "movie" : "tv";
            var j = Newtonsoft.Json.Linq.JObject.Parse(await http.GetStringAsync($"{ModInit.animap.TrimEnd('/')}/animap?tmdb={tmdb}&type={type}"));
            if (j.Value<bool?>("ok") != true)
                return null;
            var r = new Result();
            foreach (var e in j["entries"])
            {
                string mal = e.Value<string>("mal_id");
                if (!string.IsNullOrEmpty(mal))
                    r.MalIds.Add(mal);
                r.TitleUa ??= e.Value<string>("title_ua");
            }
            return r.MalIds.Count > 0 ? r : null;
        }
        catch
        {
            return null;
        }
    }
}
