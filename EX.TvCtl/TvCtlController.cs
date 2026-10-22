using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared;
using Shared.Attributes;
using System;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace EX.TvCtl;

/* Command queue per device and a shared report log, in memory.
   poll/report are anonymous (called by the TV plugin); cmd/log/devices need the Lampac root password. */
[Authorization(redirectUri: "/adminpanel/auth")]
public class TvCtlController : BaseController
{
    static readonly ConcurrentDictionary<string, ConcurrentQueue<string>> cmds = new();
    static readonly ConcurrentDictionary<string, SemaphoreSlim> signals = new();
    static readonly ConcurrentDictionary<string, DateTime> seen = new();
    static readonly ConcurrentQueue<string> log = new();

    static SemaphoreSlim Signal(string dev) => signals.GetOrAdd(dev, _ => new SemaphoreSlim(0));

    async Task<string> ReadBody()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        return await reader.ReadToEndAsync();
    }

    [HttpGet, AllowAnonymous, Route("/tvctl/poll")]
    public async Task<ActionResult> Poll(string dev)
    {
        if (string.IsNullOrWhiteSpace(dev))
            return BadRequest();

        seen[dev] = DateTime.Now;
        var queue = cmds.GetOrAdd(dev, _ => new ConcurrentQueue<string>());

        if (!queue.TryDequeue(out string cmd))
        {
            try { await Signal(dev).WaitAsync(TimeSpan.FromSeconds(25), HttpContext.RequestAborted); } catch { }
            queue.TryDequeue(out cmd);
        }

        Response.Headers["Cache-Control"] = "no-store";
        Response.Headers["Access-Control-Allow-Origin"] = "*";
        return cmd == null ? NoContent() : Content(cmd, "application/json; charset=utf-8");
    }

    [HttpPost, AllowAnonymous, Route("/tvctl/report")]
    public async Task<ActionResult> Report(string dev)
    {
        string body = await ReadBody();
        if (body.Length > 4000)
            body = body.Substring(0, 4000) + "…";

        Response.Headers["Access-Control-Allow-Origin"] = "*";
        log.Enqueue($"{DateTime.Now:HH:mm:ss} [{dev}] {body}");
        while (log.Count > 500 && log.TryDequeue(out _)) { }
        return Ok();
    }

    [HttpPost, Route("/tvctl/cmd")]
    public async Task<ActionResult> Cmd(string dev)
    {
        if (string.IsNullOrWhiteSpace(dev))
            return BadRequest();

        cmds.GetOrAdd(dev, _ => new ConcurrentQueue<string>()).Enqueue(await ReadBody());
        Signal(dev).Release();
        return Ok();
    }

    [HttpGet, Route("/tvctl/log")]
    public ActionResult Log(int last = 50)
    {
        var lines = log.ToArray();
        return Content(string.Join("\n", lines.Skip(Math.Max(0, lines.Length - last))), "text/plain; charset=utf-8");
    }

    [HttpGet, Route("/tvctl/devices")]
    public ActionResult Devices()
    {
        return Content(string.Join("\n", seen.Select(kv => $"{kv.Key} {kv.Value:HH:mm:ss}")), "text/plain; charset=utf-8");
    }
}
