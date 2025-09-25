# Minimal YouTube Clone

A minimalistic yet polished YouTube-inspired experience built with a TypeScript Express backend and a Vite + React frontend. The project includes sample data, comment persistence, category filtering, search, and a responsive watch page layout.

## Features

- 🎬 **Video catalog** seeded with design, travel, technology, and lifestyle content.
- 🔍 **Search & filtering** across titles, descriptions, and tags with curated category chips.
- 📈 **Trending section** that surfaces the most viewed videos.
- 💬 **Interactive comments** with persistent storage using SQLite.
- 📺 **Watch page** featuring an inline HTML5 player, channel details, tags, and related videos.
- 🖥️ **Minimalist UI** crafted with plain CSS for easy customization.

## Prerequisites

- Node.js 18+
- npm 9+

Both backend and frontend are cross-platform and have been tested on macOS-compatible environments.

## Project structure

```
youtube-clone/
├── backend/   # Express + SQLite API
└── frontend/  # Vite + React client
```

## Backend setup

1. Install dependencies:

   ```bash
   cd youtube-clone/backend
   npm install
   ```

2. Start the development server (defaults to port `4000`):

   ```bash
   npm run dev
   ```

   The first start seeds a local SQLite database at `youtube-clone/backend/data/youtube.db` with sample channels, videos, and comments.

3. Build for production:

   ```bash
   npm run build
   npm start
   ```

## Frontend setup

1. Install dependencies:

   ```bash
   cd youtube-clone/frontend
   npm install
   ```

2. Start the Vite dev server (port `5173`):

   ```bash
   npm run dev
   ```

   The Vite dev server proxies API requests to `http://localhost:4000`. Ensure the backend is running in another terminal.

3. Build and preview production assets:

   ```bash
   npm run build
   npm run preview
   ```

## Configuration

The frontend reads `VITE_API_BASE_URL` if you prefer to point to a remote API rather than rely on Vite's proxy. Create a `.env` file inside `youtube-clone/frontend/` and set:

```
VITE_API_BASE_URL=http://localhost:4000
```

## Available API routes

- `GET /api/categories` — list of available categories (includes `All`).
- `GET /api/videos` — filtered catalog with optional `search` and `category` query params.
- `GET /api/videos/trending` — highest view count videos.
- `GET /api/videos/:id` — single video with channel metadata.
- `GET /api/videos/:id/related` — videos from the same category.
- `GET /api/videos/:id/comments` — comments ordered by newest first.
- `POST /api/videos/:id/comments` — add a new comment (`authorName`, optional `authorAvatarUrl`, and `text`).

## Development tips

- The SQLite database is small and can be reset by deleting `backend/data/youtube.db`.
- Update `backend/src/database.ts` to tweak sample data or categories.
- Styling lives in lightweight CSS modules per component for quick iteration.

Enjoy exploring and extending the clone! 🚀
