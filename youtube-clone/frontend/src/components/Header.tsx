import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    params.delete('page');
    setSearchParams(params);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand">
          <span className="header__logo">▶</span>
          <span className="header__title">MinimalTube</span>
        </Link>
        <form className="header__search" onSubmit={handleSubmit}>
          <input
            className="header__input"
            type="search"
            placeholder="Search videos"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button className="header__submit" type="submit">
            Search
          </button>
        </form>
        <a className="header__cta" href="https://github.com" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </header>
  );
}
