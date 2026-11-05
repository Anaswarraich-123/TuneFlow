import express from "express";
import dotenv from "dotenv";
import path from "path";
import {fileURLToPath} from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

app.use(express.static(__dirname));
app.get("/api/status", (_req, res) => {
  res.json({configured: Boolean(API_KEY && API_KEY.trim())});
});

app.get("/api/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) return res.status(400).json({error: "Search query is required."});
  if (!API_KEY || !API_KEY.trim()) {
    return res.status(503).json({error: "YouTube API key missing. Add YOUTUBE_API_KEY to your .env file and restart the server."});
  }
  if (query.length > 120) return res.status(400).json({error: "Search query is too long."});

  try {
    const params = new URLSearchParams({
      key: API_KEY,
      part: "snippet",
      q: query,
      type: "video",
      videoCategoryId: "10",
      maxResults: "20",
      safeSearch: "moderate",
      relevanceLanguage: "en"
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await response.json();
    if (!response.ok) {
      const reason = data?.error?.errors?.[0]?.reason;
      if (reason === "keyInvalid") return res.status(502).json({error: "API key invalid. Check the key in .env."});
      if (reason === "quotaExceeded") return res.status(429).json({error: "YouTube API daily quota reached. Try again tomorrow."});
      return res.status(response.status).json({error: data?.error?.message || "YouTube API request failed."});
    }
    const items = (data.items || []).map(item => ({
      id: item.id?.videoId,
      title: item.snippet?.title || "Untitled",
      channelTitle: item.snippet?.channelTitle || "YouTube",
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ""
    })).filter(item => item.id && item.thumbnail);
    res.json({items});
  } catch (error) {
    console.error("YouTube search error:", error);
    res.status(500).json({error: "Could not reach YouTube. Check your internet connection."});
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.listen(PORT, () => {
  console.log(`\n🎧 TuneFlow running at http://localhost:${PORT}`);
  console.log(API_KEY ? "YouTube API key detected.\n" : "API key missing. Add it to .env, then restart.\n");
});
