# Channel Playlist Maker

Paste any YouTube channel link and get every video as a playlist, ordered **newest to oldest** or **oldest to newest**. Watch it on the site, or save the whole thing to your own YouTube account.

## What it can do

- **Any channel link:** `youtube.com/@handle`, `/channel/UC...`, `/user/name`, `/c/name`, or a bare `@handle`.
- **No video limit:** loads the channel's entire upload history, 50 videos per request (1 API quota unit each).
- **Exact order:** sorted by real publish date, with the date shown on every video.
- **Built-in player:** autoplays the next video, with previous/next, search, click-to-play, and a one-click order reverse that keeps your place.
- **Save to your YouTube account:** creates a real playlist (private, unlisted, or public) in the order you chose. Pausable and resumable.
- **Open in YouTube:** one button per 50 videos, no login needed.
- **No setup for visitors:** the API key stays on your server.

## How it works

```
Browser (index.html)  ->  /api/videos  ->  YouTube Data API (your key)
        |                  /api/config  ->  returns your public OAuth client ID
        +-> Google sign-in -> YouTube API (the visitor's own login) to create the playlist
```

1. `/api/videos` resolves the channel, finds its "uploads" playlist, and returns one page of 50 videos per call. The browser keeps calling until the last page.
2. The browser sorts by publish date and plays through the YouTube IFrame player.
3. "Save" uses Google Identity Services to sign the visitor in, then creates a playlist and adds videos one by one under **their** account.

## Files

```
index.html       the whole front end
api/videos.js    channel lookup and video paging (uses YT_API_KEY)
api/config.js    exposes GOOGLE_CLIENT_ID to the page
README.md
```

## Setup

### 1. Google Cloud project
1. Open [Google Cloud Console](https://console.cloud.google.com/), create a project, then **APIs & Services -> Library -> YouTube Data API v3 -> Enable**.

### 2. API key (for browsing channels)
1. **Credentials -> Create credentials -> API key**.
2. Restrict it to **YouTube Data API v3**.

### 3. OAuth client ID (for "Save to my YouTube")
1. **OAuth consent screen:** choose External, fill in the app name and email, add the scope `.../auth/youtube`.
2. While in **Testing**, add every Google account that will use the save button as a **test user** (max 100).
3. **Credentials -> Create credentials -> OAuth client ID -> Web application.**
4. Under **Authorized JavaScript origins** add your Vercel URL (for example `https://your-app.vercel.app`) and `http://localhost:3000` for local testing. No redirect URI is needed.

### 4. Deploy on Vercel
1. Push this folder to a GitHub repo.
2. Import it in [Vercel](https://vercel.com/) and click **Deploy**.
3. In **Settings -> Environment Variables** add:

| Name | Value |
|---|---|
| `YT_API_KEY` | your API key |
| `GOOGLE_CLIENT_ID` | your OAuth client ID |

4. Redeploy so the variables take effect.

### Local development
```
npm i -g vercel
vercel dev
```
Create a `.env` file with the two variables above.

## Using it
1. Paste a channel link.
2. Click **Newest -> Oldest** or **Oldest -> Newest**. Newest-first starts playing right away. Oldest-first waits until the whole channel is loaded.
3. To save: wait for "complete", choose a privacy level, click **Save whole playlist**, and sign in.

## Quota: read this

YouTube gives each Google Cloud project **10,000 units per day**, shared by all your visitors.

| Action | Cost |
|---|---|
| Load 50 videos | 1 unit |
| Load a 5,000-video channel | about 100 units |
| Create a playlist | 50 units |
| Add one video to a playlist | 50 units |

So browsing and playing is cheap, but **saving is expensive: about 199 videos per day** across everyone using your project. The app handles this by saving progress in the browser. When the quota runs out it stops cleanly, and the visitor can load the same channel and order the next day and click Save to resume.

To raise the limit, apply for a quota extension through the YouTube API Services audit form in Google Cloud.

## Limitations

- **Daily save quota** (above). It is YouTube's limit, not the app's.
- **Playlist cap:** YouTube playlists hold at most 5,000 videos.
- **Unverified app warning:** until Google verifies your OAuth consent screen, users see an "unverified app" warning and only test users can sign in. Public use needs verification because the `youtube` scope is sensitive.
- **Skipped videos:** private, deleted, and (during playback) non-embeddable videos are skipped. Shorts appear if the channel's uploads include them.
- **Resuming a save:** if the channel uploads new videos between sessions, the position can shift slightly.

## Troubleshooting

| Problem | Fix |
|---|---|
| "YT_API_KEY is not set" | Add the variable in Vercel and redeploy. |
| "GOOGLE_CLIENT_ID is not set" | Same as above. |
| Google sign-in blocked or `access_denied` | Add your account as a test user and check the authorized JavaScript origin matches your URL exactly. |
| "Channel not found" | Use the `@handle` or `/channel/UC...` link. |
| `quotaExceeded` while browsing | The daily 10,000 units are used up. It resets at midnight Pacific time. |

## Security

- The API key lives only in Vercel environment variables, never in the page or the repo.
- The OAuth client ID is public by design. The visitor's access token stays in their browser and is used only to create their playlist.
- Do not commit `.env` files.
