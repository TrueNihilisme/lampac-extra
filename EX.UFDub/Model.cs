namespace EX.UFDub;

/// <summary>One video of a UFDub title: a "[NN] name" row from the video.ufdub.com player.</summary>
public class UfdubEpisode
{
    public string Name { get; set; }

    /// <summary>Direct link (VIDEOS.php), already percent-encoded. Redirects to the mp4 file.</summary>
    public string Url { get; set; }

    /// <summary>Voice/tab name from the TAB parameter ("Основа" for the main dub).</summary>
    public string Tab { get; set; }
}
