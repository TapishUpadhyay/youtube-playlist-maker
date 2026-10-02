// Official YouTube Data API v3. Key is read from the Vercel env var YT_API_KEY.
// Returns one page (50 videos) per call; the browser loops until the channel is done.
const API = 'https://www.googleapis.com/youtube/v3';
const KEY = process.env.YT_API_KEY;

async function yt(path, params) {
  const u = new URL(API + path);
  Object.entries({ ...params, key: KEY }).forEach(([k, v]) => v && u.searchParams.set(k, v));
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'YouTube API error');
  return j;
}

async function resolve(input) {
  let s = String(input || '').trim();
  if (/^UC[\w-]{22}$/.test(s)) return { id: s };
  if (s.startsWith('@')) return { handle: s };
  if (!/^https?:\/\//.test(s)) s = 'https://' + s;
  let u; try { u = new URL(s); } catch { return null; }
  if (!/(^|\.)youtube\.com$/.test(u.hostname)) return null;
  const p = u.pathname.split('/').filter(Boolean);
  if (p[0]?.startsWith('@')) return { handle: p[0] };
  if (p[0] === 'channel' && p[1]) return { id: p[1] };
  if (p[0] === 'user' && p[1]) return { user: p[1] };
  if (p[0] === 'c' && p[1]) return { search: p[1] };
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
  try {
    if (!KEY) return res.status(500).json({ error: 'YT_API_KEY is not set in Vercel environment variables.' });
    let { channel, playlist, pageToken } = req.query;
    let title;
    if (!playlist) {
      const q = await resolve(channel);
      if (!q) return res.status(400).json({ error: 'Paste a channel link like youtube.com/@name' });
      if (q.search) {
        const s = await yt('/search', { part: 'snippet', type: 'channel', q: q.search, maxResults: 1 });
        const id = s.items?.[0]?.snippet?.channelId;
        if (!id) return res.status(404).json({ error: 'Channel not found' });
        q.id = id;
      }
      const c = await yt('/channels', { part: 'snippet,contentDetails', id: q.id, forHandle: q.handle, forUsername: q.user });
      const ch = c.items?.[0];
      if (!ch) return res.status(404).json({ error: 'Channel not found' });
      playlist = ch.contentDetails.relatedPlaylists.uploads;
      title = ch.snippet.title;
    }
    const p = await yt('/playlistItems', { part: 'snippet,contentDetails', playlistId: playlist, maxResults: 50, pageToken });
    const videos = p.items
      .filter(i => i.snippet.title !== 'Private video' && i.snippet.title !== 'Deleted video')
      .map(i => ({ id: i.contentDetails.videoId, title: i.snippet.title, date: i.contentDetails.videoPublishedAt || i.snippet.publishedAt }));
    res.json({ title, playlist, videos, next: p.nextPageToken || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
