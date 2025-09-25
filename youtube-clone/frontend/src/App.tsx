import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import WatchPage from './pages/WatchPage';
import './App.css';

export default function App() {
  return (
    <div className="app-container">
      <Header />
      <main className="layout">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/watch/:id" element={<WatchPage />} />
        </Routes>
      </main>
    </div>
  );
}
