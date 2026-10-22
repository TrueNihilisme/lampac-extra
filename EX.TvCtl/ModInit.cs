using Shared.Models.Module;
using Shared.Models.Module.Interfaces;

namespace EX.TvCtl;

/// <summary>Remote control endpoints for a Lampa client plugin: /tvctl/poll, /tvctl/report, /tvctl/cmd, /tvctl/log, /tvctl/devices.</summary>
public class ModInit : IModuleLoaded
{
    public void Loaded(InitspaceModel baseconf) { }

    public void Dispose() { }
}
