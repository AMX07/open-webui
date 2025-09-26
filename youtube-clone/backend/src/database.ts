import DatabaseConstructor from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { Channel, Comment, CreateCommentInput, Video, VideoFilters, VideoWithChannel } from './models';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'youtube.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseConstructor(dbPath);
db.pragma('journal_mode = WAL');

function runMigrations() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      subscribers INTEGER NOT NULL
    );
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      views INTEGER NOT NULL,
      likes INTEGER NOT NULL,
      duration TEXT NOT NULL,
      published_at TEXT NOT NULL,
      category TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      video_url TEXT NOT NULL,
      tags TEXT NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    );
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar_url TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (video_id) REFERENCES videos(id)
    );
  `).run();
}

function seedIfEmpty() {
  const videoCount = db.prepare('SELECT COUNT(*) as count FROM videos').get() as { count: number };
  if (videoCount.count > 0) {
    return;
  }

  const channels: Channel[] = [
    {
      id: 'channel-1',
      name: 'PixelCraft Studios',
      avatarUrl: 'https://i.pravatar.cc/100?img=12',
      subscribers: 1280000,
    },
    {
      id: 'channel-2',
      name: 'Urban Kitchen',
      avatarUrl: 'https://i.pravatar.cc/100?img=32',
      subscribers: 842000,
    },
    {
      id: 'channel-3',
      name: 'Mindful Motion',
      avatarUrl: 'https://i.pravatar.cc/100?img=45',
      subscribers: 560000,
    },
    {
      id: 'channel-4',
      name: 'Code Frontier',
      avatarUrl: 'https://i.pravatar.cc/100?img=22',
      subscribers: 2230000,
    },
    {
      id: 'channel-5',
      name: 'Wanderlust Weekly',
      avatarUrl: 'https://i.pravatar.cc/100?img=14',
      subscribers: 1490000,
    }
  ];

  const insertChannel = db.prepare(`
    INSERT INTO channels (id, name, avatar_url, subscribers)
    VALUES (@id, @name, @avatarUrl, @subscribers)
  `);
  const insertVideo = db.prepare(`
    INSERT INTO videos (
      id, title, description, channel_id, views, likes, duration, published_at,
      category, thumbnail_url, video_url, tags
    ) VALUES (@id, @title, @description, @channelId, @views, @likes, @duration,
      @publishedAt, @category, @thumbnailUrl, @videoUrl, @tags)
  `);
  const insertComment = db.prepare(`
    INSERT INTO comments (
      id, video_id, author_name, author_avatar_url, text, created_at, likes
    ) VALUES (@id, @videoId, @authorName, @authorAvatarUrl, @text, @createdAt, @likes)
  `);

  const videos: Video[] = [
    {
      id: 'video-1',
      title: 'Designing Minimalist Interfaces with Figma',
      description: 'Learn how to design clean and accessible layouts in Figma with a focus on typography, spacing, and color systems.',
      channelId: 'channel-1',
      views: 1254000,
      likes: 58000,
      duration: '12:48',
      publishedAt: '2024-03-12T09:00:00.000Z',
      category: 'Design',
      thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
      tags: ['design', 'figma', 'ui'],
    },
    {
      id: 'video-2',
      title: 'Weeknight Dinners Under 30 Minutes',
      description: 'Five healthy and delicious meals you can cook any weeknight without spending hours in the kitchen.',
      channelId: 'channel-2',
      views: 842000,
      likes: 42000,
      duration: '9:32',
      publishedAt: '2024-04-01T16:30:00.000Z',
      category: 'Food',
      thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
      tags: ['cooking', 'recipes', 'quick meals'],
    },
    {
      id: 'video-3',
      title: 'Morning Mobility Routine for Desk Workers',
      description: 'Relieve tension and boost focus with this 15-minute mobility session designed for anyone who spends long hours sitting.',
      channelId: 'channel-3',
      views: 564000,
      likes: 35100,
      duration: '15:05',
      publishedAt: '2024-02-18T07:15:00.000Z',
      category: 'Wellness',
      thumbnailUrl: 'https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?w=800',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
      tags: ['wellness', 'mobility', 'stretching'],
    },
    {
      id: 'video-4',
      title: 'Building a Full Stack App with SvelteKit',
      description: 'A step-by-step tutorial on creating and deploying a production-ready SvelteKit application with authentication and database integration.',
      channelId: 'channel-4',
      views: 2234000,
      likes: 98000,
      duration: '24:21',
      publishedAt: '2024-03-08T12:00:00.000Z',
      category: 'Technology',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-20s.mp4',
      tags: ['coding', 'svelte', 'tutorial'],
    },
    {
      id: 'video-5',
      title: 'Exploring Kyoto: A 48 Hour Travel Guide',
      description: 'The perfect two-day itinerary through Kyoto highlighting temples, food, and hidden neighborhoods.',
      channelId: 'channel-5',
      views: 1498000,
      likes: 67000,
      duration: '18:47',
      publishedAt: '2024-01-28T18:20:00.000Z',
      category: 'Travel',
      thumbnailUrl: 'https://images.unsplash.com/photo-1470165473874-215e11f0b497?w=800',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-30s.mp4',
      tags: ['travel', 'japan', 'guide'],
    },
    {
      id: 'video-6',
      title: 'Productivity Systems That Actually Work',
      description: 'Discover sustainable productivity frameworks that help you stay organized and avoid burnout.',
      channelId: 'channel-1',
      views: 910000,
      likes: 52000,
      duration: '14:03',
      publishedAt: '2024-04-15T10:45:00.000Z',
      category: 'Productivity',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-12s.mp4',
      tags: ['productivity', 'systems', 'habits'],
    }
  ];

  const comments: Omit<Comment, 'id'>[] = [
    {
      videoId: 'video-1',
      authorName: 'Alex Johnson',
      authorAvatarUrl: 'https://i.pravatar.cc/100?img=7',
      text: 'The typography tips in this video completely transformed my current project. Thank you!',
      createdAt: new Date('2024-03-13T09:12:00.000Z').toISOString(),
      likes: 123,
    },
    {
      videoId: 'video-2',
      authorName: 'Priya Patel',
      authorAvatarUrl: 'https://i.pravatar.cc/100?img=21',
      text: 'Made the lemon garlic pasta tonight and it was a hit with the whole family!',
      createdAt: new Date('2024-04-02T20:41:00.000Z').toISOString(),
      likes: 87,
    },
    {
      videoId: 'video-4',
      authorName: 'Diego Martinez',
      authorAvatarUrl: 'https://i.pravatar.cc/100?img=28',
      text: 'This walkthrough is exactly what I needed to understand routing in SvelteKit.',
      createdAt: new Date('2024-03-10T14:05:00.000Z').toISOString(),
      likes: 201,
    }
  ];

  const insertChannelTxn = db.transaction((data: Channel[]) => {
    for (const channel of data) {
      insertChannel.run(channel);
    }
  });

  const insertVideoTxn = db.transaction((data: Video[]) => {
    for (const video of data) {
      insertVideo.run({ ...video, tags: JSON.stringify(video.tags) });
    }
  });

  const insertCommentTxn = db.transaction((data: typeof comments) => {
    for (const comment of data) {
      insertComment.run({ id: uuid(), ...comment });
    }
  });

  insertChannelTxn(channels);
  insertVideoTxn(videos);
  insertCommentTxn(comments);
}

runMigrations();
seedIfEmpty();

type VideoRow = Omit<Video, 'tags'> & {
  tags: string;
  channel_name: string;
  avatar_url: string;
  subscribers: number;
};

export function getVideos(filters: VideoFilters = {}): VideoWithChannel[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.search) {
    conditions.push('(videos.title LIKE :search OR videos.description LIKE :search OR videos.tags LIKE :search)');
    params.search = `%${filters.search}%`;
  }

  if (filters.category && filters.category !== 'All') {
    conditions.push('videos.category = :category');
    params.category = filters.category;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const stmt = db.prepare(`
    SELECT videos.*, channels.name as channel_name, channels.avatar_url, channels.subscribers
    FROM videos
    JOIN channels ON channels.id = videos.channel_id
    ${whereClause}
    ORDER BY datetime(videos.published_at) DESC
  `);

  const rows = stmt.all(params) as VideoRow[];

  return rows.map((row) => mapVideoRow(row));
}

export function getVideoById(id: string): VideoWithChannel | null {
  const stmt = db.prepare(`
    SELECT videos.*, channels.name as channel_name, channels.avatar_url, channels.subscribers
    FROM videos
    JOIN channels ON channels.id = videos.channel_id
    WHERE videos.id = ?
  `);

  const row = stmt.get(id) as VideoRow | undefined;
  return row ? mapVideoRow(row) : null;
}

export function getTrendingVideos(limit = 5): VideoWithChannel[] {
  const stmt = db.prepare(`
    SELECT videos.*, channels.name as channel_name, channels.avatar_url, channels.subscribers
    FROM videos
    JOIN channels ON channels.id = videos.channel_id
    ORDER BY videos.views DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as VideoRow[];
  return rows.map(mapVideoRow);
}

export function getRelatedVideos(videoId: string, limit = 6): VideoWithChannel[] {
  const video = getVideoById(videoId);
  if (!video) {
    return [];
  }

  const stmt = db.prepare(`
    SELECT videos.*, channels.name as channel_name, channels.avatar_url, channels.subscribers
    FROM videos
    JOIN channels ON channels.id = videos.channel_id
    WHERE videos.id != :videoId AND videos.category = :category
    ORDER BY videos.views DESC
    LIMIT :limit
  `);

  const rows = stmt.all({ videoId, category: video.category, limit }) as VideoRow[];
  return rows.map(mapVideoRow);
}

export function getComments(videoId: string): Comment[] {
  const stmt = db.prepare(`
    SELECT * FROM comments
    WHERE video_id = ?
    ORDER BY datetime(created_at) DESC
  `);
  return stmt.all(videoId) as Comment[];
}

export function addComment(videoId: string, input: CreateCommentInput): Comment {
  const comment: Comment = {
    id: uuid(),
    videoId,
    authorName: input.authorName,
    authorAvatarUrl: input.authorAvatarUrl || 'https://i.pravatar.cc/100',
    text: input.text,
    createdAt: new Date().toISOString(),
    likes: 0,
  };

  const stmt = db.prepare(`
    INSERT INTO comments (id, video_id, author_name, author_avatar_url, text, created_at, likes)
    VALUES (@id, @videoId, @authorName, @authorAvatarUrl, @text, @createdAt, @likes)
  `);
  stmt.run(comment);
  return comment;
}

export function getCategories(): string[] {
  const stmt = db.prepare('SELECT DISTINCT category FROM videos ORDER BY category ASC');
  const rows = stmt.all() as { category: string }[];
  return ['All', ...rows.map((row) => row.category)];
}

function mapVideoRow(row: VideoRow): VideoWithChannel {
  const { channel_name, avatar_url, subscribers, tags, ...video } = row;
  return {
    ...video,
    tags: JSON.parse(tags) as string[],
    channel: {
      id: video.channelId,
      name: channel_name,
      avatarUrl: avatar_url,
      subscribers,
    },
  };
}
