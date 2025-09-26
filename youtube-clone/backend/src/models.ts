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
}

export interface VideoWithChannel extends Video {
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

export interface VideoFilters {
  search?: string;
  category?: string;
}

export interface CreateCommentInput {
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
}
