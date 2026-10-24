using Newtonsoft.Json.Linq;
using Shared;
using Shared.Models.Events;
using Shared.Models.Module;
using Shared.Models.Module.Interfaces;
using Shared.Services;

namespace EX.Mcp;

public class ModInit : IModuleLoaded
{
    public static McpSettings conf;

    public void Loaded(InitspaceModel baseconf)
    {
        updateConf();
        EventListener.UpdateInitFile += updateConf;
    }

    public void Dispose()
    {
        EventListener.UpdateInitFile -= updateConf;
    }

    void updateConf()
    {
        var defaults = JObject.FromObject(new McpSettings { collectionUrl = "" });
        conf = (ModuleInvoke.Init("EX.Mcp", defaults) ?? defaults).ToObject<McpSettings>();
    }
}
