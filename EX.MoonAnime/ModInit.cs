using Microsoft.AspNetCore.Http;
using Newtonsoft.Json.Linq;
using Shared.Models.Base;
using Shared.Models.Events;
using Shared.Models.Module;
using Shared.Models.Module.Interfaces;
using Shared.Models.Online.Settings;
using Shared.Services;
using System.Collections.Generic;

namespace EX.MoonAnime;

public class ModInit : IModuleLoaded, IModuleOnline
{
    public static OnlinesSettings conf;


    public List<ModuleOnlineItem> Invoke(HttpContext httpContext, RequestModel requestInfo, string host, OnlineEventsModel args)
    {
        if (!args.isanime)
            return null;

        return new List<ModuleOnlineItem>()
        {
            new(conf, "ex_moonanime")
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
        var defaults = JObject.FromObject(new OnlinesSettings("EX.MoonAnime", "https://api.moonanime.vip")
        {
            displayname = "MoonAnime",
            displayindex = 140,
            stream_access = "apk",
            rchstreamproxy = "web,cors",
            geo_hide = ["RU", "BY"]
        });

        conf = (ModuleInvoke.Init("EX.MoonAnime", defaults) ?? defaults).ToObject<OnlinesSettings>();
    }

    string onlineApiQuality(EventOnlineApiQuality e)
    {
        return e.balanser == "ex_moonanime" ? " ~ 1080p" : null;
    }
}
