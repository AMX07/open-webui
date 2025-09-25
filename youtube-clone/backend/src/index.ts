import express from 'express';
import cors from 'cors';
import { addComment, getCategories, getComments, getRelatedVideos, getTrendingVideos, getVideoById, getVideos } from './database';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/categories', (_req, res) => {
  res.json({ categories: getCategories() });
});

app.get('/api/videos', (req, res) => {
  const { search, category } = req.query;
  const videos = getVideos({
    search: typeof search === 'string' ? search : undefined,
    category: typeof category === 'string' ? category : undefined,
  });
  res.json({ videos });
});

app.get('/api/videos/trending', (_req, res) => {
  const videos = getTrendingVideos();
  res.json({ videos });
});

app.get('/api/videos/:id', (req, res) => {
  const video = getVideoById(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.json({ video });
});

app.get('/api/videos/:id/related', (req, res) => {
  const videos = getRelatedVideos(req.params.id);
  res.json({ videos });
});

app.get('/api/videos/:id/comments', (req, res) => {
  const comments = getComments(req.params.id);
  res.json({ comments });
});

app.post('/api/videos/:id/comments', (req, res) => {
  const { authorName, authorAvatarUrl, text } = req.body ?? {};
  if (!authorName || typeof authorName !== 'string') {
    return res.status(400).json({ error: 'authorName is required' });
  }
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  const video = getVideoById(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const comment = addComment(req.params.id, { authorName, authorAvatarUrl, text });
  res.status(201).json({ comment });
});

app.listen(PORT, () => {
  console.log(`YouTube clone backend listening on http://localhost:${PORT}`);
});
