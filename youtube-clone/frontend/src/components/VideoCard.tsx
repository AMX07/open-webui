import { Link } from 'react-router-dom';
import { Video } from '../api';
import './VideoCard.css';
import { formatDistanceToNow } from '../utils/date';
import { formatCompactNumber } from '../utils/number';

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  return (
    <Link to={`/watch/${video.id}`} className="video-card">
      <div className="video-card__thumbnail">
        <img src={video.thumbnailUrl} alt={video.title} loading="lazy" />
        <span className="video-card__duration">{video.duration}</span>
      </div>
      <div className="video-card__meta">
        <img className="video-card__avatar" src={video.channel.avatarUrl} alt={video.channel.name} loading="lazy" />
        <div className="video-card__details">
          <h3 className="video-card__title">{video.title}</h3>
          <p className="video-card__channel">{video.channel.name}</p>
          <p className="video-card__stats">
            {formatCompactNumber(video.views)} views · {formatDistanceToNow(video.publishedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
