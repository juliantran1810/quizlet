import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deckService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Search,
  BookOpen,
  Layers,
  ArrowRight,
  BrainCircuit,
  Gamepad2,
  Sparkles,
  Plus,
} from 'lucide-react';

const CATEGORIES = ['All', 'Tiếng Anh', 'Công nghệ', 'Khoa học', 'Lịch sử', 'Y Dược', 'General'];

export default function HomePage() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchDecks();
  }, [selectedCategory]);

  const fetchDecks = async (searchTerm = search) => {
    try {
      setLoading(true);
      const res = await deckService.getAll({
        search: searchTerm,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
      });
      setDecks(res.data.decks);
    } catch (err) {
      console.error('Lỗi khi tải bộ thẻ:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDecks(search);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-700 text-white py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Phương pháp Spaced Repetition thông minh
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Chinh Phục Mọi Kiến Thức Với <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-indigo-200 to-white">
              Flashcard 3D & Mini Game
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-200 text-base sm:text-lg">
            Học từ vựng, ôn luyện bài thi dễ dàng qua thẻ ghi nhớ 3D, bài trắc nghiệm thông minh và game ghép từ sinh động.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex items-center bg-white rounded-2xl p-1.5 shadow-2xl">
            <Search className="w-5 h-5 text-slate-400 ml-3" />
            <input
              type="text"
              placeholder="Tìm kiếm bộ thẻ theo tên hoặc mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-slate-800 text-sm focus:outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Tìm
            </button>
          </form>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category Pills & Quick Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <Link
            to="/create"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            <Plus className="w-4 h-4" /> Tạo bộ thẻ của riêng bạn
          </Link>
        </div>

        {/* Deck List Grid */}
        {loading ? (
          <LoadingSpinner message="Đang tải danh sách bộ thẻ..." />
        ) : decks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Chưa có bộ thẻ nào</h3>
            <p className="text-sm text-slate-400 mt-1 mb-6">
              Hãy tạo ngay bộ thẻ đầu tiên để bắt đầu học tập và chia sẻ nhé!
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" /> Tạo bộ thẻ mới
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <div
                key={deck._id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs">
                      {deck.category || 'General'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {deck.cards?.length || 0} thẻ
                    </span>
                  </div>

                  <Link to={`/decks/${deck._id}`}>
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition line-clamp-1">
                      {deck.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 min-h-[32px]">
                    {deck.description || 'Không có mô tả chi tiết.'}
                  </p>
                </div>

                {/* Footer and Mode Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                      {deck.author?.username?.slice(0, 1).toUpperCase() || 'U'}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {deck.author?.username || 'Ẩn danh'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/decks/${deck._id}/flashcards`}
                      title="Lật thẻ 3D"
                      className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                    >
                      <Layers className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/decks/${deck._id}/quiz`}
                      title="Luyện trắc nghiệm"
                      className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                    >
                      <BrainCircuit className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/decks/${deck._id}/match`}
                      title="Game ghép từ"
                      className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                    >
                      <Gamepad2 className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

