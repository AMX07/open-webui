import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoryChips from '../components/CategoryChips';
import VideoCard from '../components/VideoCard';
import './HomePage.css';
import { Video, fetchCategories, fetchTrendingVideos, fetchVideos } from '../api';

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<string[]>(['All']);
  const [videos, setVideos] = useState<Video[]>([]);
  const [trending, setTrending] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeCategory = searchParams.get('category') ?? 'All';
  const searchTerm = searchParams.get('q') ?? '';

  useEffect(() => {
    fetchCategories()
      .then(({ categories: data }) => setCategories(data))
      .catch(() => setCategories(['All']));

    fetchTrendingVideos()
      .then(({ videos: items }) => setTrending(items))
      .catch(() => setTrending([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchVideos({
      category: activeCategory,
      search: searchTerm,
    })
      .then(({ videos: items }) => {
        setVideos(items);
        setError(null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Could not load videos');
      })
      .finally(() => setIsLoading(false));
  }, [activeCategory, searchTerm]);

  const heading = useMemo(() => {
    if (searchTerm) {
      return `Results for “${searchTerm}”`;
    }
    if (activeCategory !== 'All') {
      return `${activeCategory} videos`;
    }
    return 'Latest uploads';
  }, [activeCategory, searchTerm]);

  const handleCategorySelect = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === 'All') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    setSearchParams(params);
  };

  return (
    <div className="home">
      <section>
        <h2 className="section-title">Trending now</h2>
        <div className="trending">
          {trending.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Browse by topic</h2>
        <CategoryChips categories={categories} activeCategory={activeCategory} onSelect={handleCategorySelect} />
      </section>

      <section className="home__results">
        <div className="home__results-header">
          <h2 className="section-title">{heading}</h2>
          {searchTerm && <span className="home__results-subtitle">Showing {videos.length} curated results</span>}
        </div>
        {error && <p className="home__error">{error}</p>}
        {isLoading ? (
          <p className="home__loading">Loading videos…</p>
        ) : videos.length ? (
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="home__empty">No videos found. Try a different search or category.</p>
        )}
      </section>
    </div>
  );
}
