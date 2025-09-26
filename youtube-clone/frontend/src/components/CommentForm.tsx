import { FormEvent, useState } from 'react';
import './CommentForm.css';

interface CommentFormProps {
  onSubmit(input: { authorName: string; text: string }): Promise<void>;
}

export default function CommentForm({ onSubmit }: CommentFormProps) {
  const [authorName, setAuthorName] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!authorName.trim() || !text.trim()) {
      setError('Please provide your name and a comment.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ authorName: authorName.trim(), text: text.trim() });
      setText('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <div className="comment-form__fields">
        <input
          className="comment-form__input"
          type="text"
          placeholder="Your name"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
        />
        <textarea
          className="comment-form__textarea"
          placeholder="Share your thoughts"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
        />
      </div>
      {error && <p className="comment-form__error">{error}</p>}
      <div className="comment-form__actions">
        <button className="comment-form__submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Posting…' : 'Post comment'}
        </button>
      </div>
    </form>
  );
}
