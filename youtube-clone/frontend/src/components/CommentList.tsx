import { Comment } from '../api';
import './CommentList.css';
import { formatDistanceToNow } from '../utils/date';

interface CommentListProps {
  comments: Comment[];
}

export default function CommentList({ comments }: CommentListProps) {
  if (!comments.length) {
    return <p className="comment-empty">No comments yet. Be the first to share your thoughts!</p>;
  }

  return (
    <div className="comments">
      {comments.map((comment) => (
        <div className="comment" key={comment.id}>
          <img className="comment__avatar" src={comment.authorAvatarUrl} alt={comment.authorName} />
          <div className="comment__body">
            <div className="comment__header">
              <span className="comment__author">{comment.authorName}</span>
              <span className="comment__date">{formatDistanceToNow(comment.createdAt)}</span>
            </div>
            <p className="comment__text">{comment.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
