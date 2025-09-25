export interface Channel {
  id: string;
  name: string;
  avatarUrl: string;
  subscribers: number;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  channelId: string;
  views: number;
  likes: number;
  duration: string;
  publishedAt: string;
  category: string;
  thumbnailUrl: string;
  videoUrl: string;
  tags: string[];
  channel: Channel;
}

export interface Comment {
  id: string;
  videoId: string;
  authorName: string;
  authorAvatarUrl: string;
  text: string;
  createdAt: string;
  likes: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? 'Request failed');
  }
  return response.json() as Promise<T>;
}

export function fetchCategories(): Promise<{ categories: string[] }> {
  return fetch(`${API_BASE}/api/categories`).then((response) => handle<{ categories: string[] }>(response));
}

export function fetchVideos(params?: { search?: string; category?: string }): Promise<{ videos: Video[] }> {
  const url = new URL(`${API_BASE}/api/videos`, window.location.origin);
  if (params?.search) {
    url.searchParams.set('search', params.search);
  }
  if (params?.category) {
    url.searchParams.set('category', params.category);
  }
  return fetch(url.toString().replace(window.location.origin, API_BASE || window.location.origin)).then((response) =>
    handle<{ videos: Video[] }>(response)
  );
}

export function fetchTrendingVideos(): Promise<{ videos: Video[] }> {
  return fetch(`${API_BASE}/api/videos/trending`).then((response) => handle<{ videos: Video[] }>(response));
}

export function fetchVideo(id: string): Promise<{ video: Video }> {
  return fetch(`${API_BASE}/api/videos/${id}`).then((response) => handle<{ video: Video }>(response));
}

export function fetchRelatedVideos(id: string): Promise<{ videos: Video[] }> {
  return fetch(`${API_BASE}/api/videos/${id}/related`).then((response) => handle<{ videos: Video[] }>(response));
}

export function fetchComments(id: string): Promise<{ comments: Comment[] }> {
  return fetch(`${API_BASE}/api/videos/${id}/comments`).then((response) => handle<{ comments: Comment[] }>(response));
}

export function postComment(
  id: string,
  payload: { authorName: string; authorAvatarUrl?: string; text: string }
): Promise<{ comment: Comment }> {
  return fetch(`${API_BASE}/api/videos/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((response) => handle<{ comment: Comment }>(response));
}
