using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using Shared;
using Shared.Attributes;
using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace EX.Mcp;

[Authorization(redirectUri: "/adminpanel/auth")]
public class McpController : BaseController
{
    static readonly HttpClient client = new() { Timeout = TimeSpan.FromSeconds(8) };

    [HttpGet, AllowAnonymous, Route("/mcp/collection")]
    public async Task<ActionResult> Collection()
    {
        string url = ModInit.conf?.collectionUrl;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || (uri.Scheme != "http" && uri.Scheme != "https"))
            return StatusCode(503);

        try
        {
            using var response = await client.GetAsync(uri, HttpContext.RequestAborted);
            if (!response.IsSuccessStatusCode)
                return StatusCode(502);

            string payload = await response.Content.ReadAsStringAsync(HttpContext.RequestAborted);
            try
            {
                if (JObject.Parse(payload)["items"] is not JArray)
                    return StatusCode(502);
            }
            catch
            {
                return StatusCode(502);
            }

            Response.Headers["Cache-Control"] = "no-store";
            return Content(payload, "application/json; charset=utf-8");
        }
        catch (OperationCanceledException)
        {
            return StatusCode(504);
        }
        catch
        {
            return StatusCode(502);
        }
    }
}
