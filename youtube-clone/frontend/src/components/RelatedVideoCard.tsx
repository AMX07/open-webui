import { Link } from 'react-router-dom';
import { Video } from '../api';
import './RelatedVideoCard.css';
import { formatCompactNumber } from '../utils/number';

interface RelatedVideoCardProps {
  video: Video;
}

export default function RelatedVideoCard({ video }: RelatedVideoCardProps) {
  return (
    <Link to={`/watch/${video.id}`} className="related-video">
      <div className="related-video__thumb">
        <img src={video.thumbnailUrl} alt={video.title} loading="lazy" />
        <span className="related-video__duration">{video.duration}</span>
      </div>
      <div className="related-video__meta">
        <h4 className="related-video__title">{video.title}</h4>
        <p className="related-video__channel">{video.channel.name}</p>
        <p className="related-video__stats">{formatCompactNumber(video.views)} views</p>
      </div>
    </Link>
  );
}
