import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CommentForm from '../components/CommentForm';
import CommentList from '../components/CommentList';
import RelatedVideoCard from '../components/RelatedVideoCard';
import './WatchPage.css';
import {
  Comment,
  Video,
  fetchComments,
  fetchRelatedVideos,
  fetchVideo,
  postComment,
} from '../api';
import { formatCompactNumber, formatSubscriberCount } from '../utils/number';

export default function WatchPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    Promise.all([fetchVideo(id), fetchRelatedVideos(id), fetchComments(id)])
      .then(([videoResponse, relatedResponse, commentsResponse]) => {
        setVideo(videoResponse.video);
        setRelated(relatedResponse.videos);
        setComments(commentsResponse.comments);
        setError(null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Could not load video');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleCommentSubmit = async (input: { authorName: string; text: string }) => {
    if (!id) return;
    const response = await postComment(id, input);
    setComments((previous) => [response.comment, ...previous]);
  };

  if (isLoading) {
    return <p className="watch__status">Loading video experience…</p>;
  }

  if (error) {
    return <p className="watch__status watch__status--error">{error}</p>;
  }

  if (!video) {
    return <p className="watch__status watch__status--error">Video not found.</p>;
  }

  return (
    <div className="watch">
      <div className="watch__player">
        <div className="watch__video">
          <video src={video.videoUrl} controls poster={video.thumbnailUrl} />
        </div>
        <div className="watch__details">
          <h1 className="watch__title">{video.title}</h1>
          <div className="watch__meta">
            <div className="watch__channel">
              <img src={video.channel.avatarUrl} alt={video.channel.name} />
              <div>
                <h3>{video.channel.name}</h3>
                <p>{formatSubscriberCount(video.channel.subscribers)}</p>
              </div>
            </div>
            <div className="watch__stats">
              <span>{formatCompactNumber(video.views)} views</span>
              <span>{formatCompactNumber(video.likes)} likes</span>
            </div>
          </div>
          <p className="watch__description">{video.description}</p>
          <div className="watch__tags">
            {video.tags.map((tag) => (
              <Link key={tag} to={`/?q=${encodeURIComponent(tag)}`} className="watch__tag">
                #{tag}
              </Link>
            ))}
          </div>
        </div>
        <div className="watch__comments">
          <h2>Comments</h2>
          <CommentForm onSubmit={handleCommentSubmit} />
          <CommentList comments={comments} />
        </div>
      </div>
      <aside className="watch__related">
        <h2>More like this</h2>
        <div className="watch__related-list">
          {related.length ? (
            related.map((item) => <RelatedVideoCard key={item.id} video={item} />)
          ) : (
            <p className="watch__related-empty">No related videos available.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
