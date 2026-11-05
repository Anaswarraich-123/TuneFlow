# TuneFlow 🎧

TuneFlow is a local music discovery and playback web app powered by YouTube Data API v3 and YouTube's official embedded player.

## Features
- Search YouTube videos in the Music category
- Play selected videos using the official YouTube embedded player
- Previous / next controls for the current search queue
- Like / unlike tracks (stored locally in this browser)
- Create playlists and add tracks (right-click a result card to add it to the first playlist)
- Recently played history
- Music mood shortcuts and basic result filters
- Responsive desktop and mobile layout
- No TuneFlow account, login, signup or profile system
- API key kept on the local Node server, not exposed in browser JavaScript

## Setup

1. Install Node.js (LTS) if it is not already installed.
2. Open this folder in VS Code.
3. Make a copy of `.env.example` and name the copy `.env`.
4. Open `.env` and add your own YouTube API key after `YOUTUBE_API_KEY=`.
5. In the VS Code terminal, run:

   ```bash
   npm install
   npm start
   ```

6. Open `http://localhost:3000`.

If you change `.env`, stop the server with `Ctrl + C` and run `npm start` again.

## Google Cloud setup
- Enable **YouTube Data API v3** in your Google Cloud project.
- Use an API key restricted to **YouTube Data API v3**.
- Do not paste your API key into `app.js`, `index.html`, screenshots, public repositories or chat.
- The key is read by `server.js` from `.env`.

## Important notes
- YouTube's Music category is a useful filter, but it does not guarantee every search result is music-only.
- Playback uses YouTube's official embedded player. YouTube branding, ads, availability restrictions and player controls remain governed by YouTube.
- This app does not download or extract audio, remove ads, bypass restrictions, or provide background playback.
- Liked tracks, playlists and history are saved in browser localStorage on this device/browser.
- `npm start` runs the app locally on your computer. Making it available to phones or publishing it online requires a separate deployment and security setup.
