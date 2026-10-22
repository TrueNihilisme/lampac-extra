using Microsoft.AspNetCore.Http;
using Newtonsoft.Json.Linq;
using Shared.Models.Base;
using Shared.Models.Events;
using Shared.Models.Module;
using Shared.Models.Module.Interfaces;
using Shared.Models.Online.Settings;
using Shared.Services;
using System.Collections.Generic;

namespace EX.AnimeON;

public class ModInit : IModuleLoaded, IModuleOnline
{
    public static OnlinesSettings conf;

    /// <summary>Base URL of the animap service (TMDB -> MAL). Empty = title search only.</summary>
    public static string animap;

    public List<ModuleOnlineItem> Invoke(HttpContext httpContext, RequestModel requestInfo, string host, OnlineEventsModel args)
    {
        if (!args.isanime)
            return null;

        return new List<ModuleOnlineItem>()
        {
            new(conf, "ex_animeon")
        };
    }

    public void Loaded(InitspaceModel baseconf)
    {
        updateConf();
        EventListener.UpdateInitFile += updateConf;
        EventListener.OnlineApiQuality += onlineApiQuality;
    }

    public void Dispose()
    {
        EventListener.UpdateInitFile -= updateConf;
        EventListener.OnlineApiQuality -= onlineApiQuality;
    }

    void updateConf()
    {
        var defaults = JObject.FromObject(new OnlinesSettings("EX.AnimeON", "https://animeon.club")
        {
            displayname = "[UA] AnimeON",
            displayindex = 145,
            rch_access = "apk,cors",
            stream_access = "apk,cors",
            rchstreamproxy = "web",
            geo_hide = ["RU", "BY"]
        });
        defaults["animap"] = "";

        var raw = ModuleInvoke.Init("EX.AnimeON", defaults) ?? defaults;
        animap = raw.Value<string>("animap");
        raw.Remove("animap");
        conf = raw.ToObject<OnlinesSettings>();
    }

    string onlineApiQuality(EventOnlineApiQuality e)
    {
        return e.balanser == "ex_animeon" ? " ~ 1080p" : null;
    }
}
