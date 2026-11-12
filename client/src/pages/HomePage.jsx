import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deckService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Search,
  BookOpen,
  Layers,
  BrainCircuit,
  Gamepad2,
  Plus,
  Lock,
  Globe,
  Sparkles,
  X,
  User,
  SpellCheck,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Tiếng Trung',
  'Tiếng Anh',
  'Tiếng Nhật',
  'Tiếng Hàn',
  'Công nghệ',
  'Khoa học',
  'Lịch sử',
  'Y Dược',
  'General',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, formatCategory } = useLanguage();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewScope, setViewScope] = useState('all'); // 'all' | 'my'
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchBoxRef = useRef(null);

  const fetchDecks = async (searchTerm = search, cat = selectedCategory) => {
    try {
      setLoading(true);
      const res = await deckService.getAll({
        search: searchTerm.trim() || undefined,
        category: cat === 'All' ? undefined : cat,
      });
      setDecks(res.data.decks || []);
    } catch (err) {
      console.error('Lỗi khi tải bộ thẻ:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tự động tìm kiếm tức thì với Debounce 300ms khi gõ từ khóa hoặc chọn thể loại
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDecks(search, selectedCategory);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (val) => {
    setSearch(val);
    const trimmed = val.trim().toLowerCase();
    if (trimmed.length > 0) {
      const matched = decks
        .filter(
          (d) =>
            d.title.toLowerCase().includes(trimmed) ||
            (d.description && d.description.toLowerCase().includes(trimmed)) ||
            (d.category && d.category.toLowerCase().includes(trimmed)) ||
            (d.cards &&
              d.cards.some(
                (c) =>
                  (c.term && c.term.toLowerCase().includes(trimmed)) ||
                  (c.definition && c.definition.toLowerCase().includes(trimmed)) ||
                  (c.pinyin && c.pinyin.toLowerCase().includes(trimmed))
              ))
        )
        .slice(0, 5);
      setSearchSuggestions(matched);
      setShowSearchDropdown(matched.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSearchDropdown(false);
    fetchDecks(search, selectedCategory);
  };

  const handleClearSearch = () => {
    setSearch('');
    setSearchSuggestions([]);
    setShowSearchDropdown(false);
    fetchDecks('', selectedCategory);
  };

  // Lọc theo viewScope (Tất cả vs Bộ thẻ của tôi)
  const displayedDecks = viewScope === 'my' && user
    ? decks.filter((d) => d.author && d.author._id === user._id)
    : decks;

  const myDecksCount = user
    ? decks.filter((d) => d.author && d.author._id === user._id).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50/70">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header tinh giản, tập trung vào nội dung */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              {user ? (
                <span>
                  {t('nav.welcome')}, <span className="text-indigo-600">{user.username}</span> 👋
                </span>
              ) : (
                t('home.hero_title')
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('home.hero_subtitle')}
            </p>
          </div>

          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition active:scale-95 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('nav.create_deck')}</span>
          </Link>
        </div>

        {/* Thanh Tìm kiếm & Điều hướng Bộ lọc */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-8 space-y-4">
          {/* Ô tìm kiếm có Autocomplete */}
          <div ref={searchBoxRef} className="relative">
            <form onSubmit={handleSearchSubmit} className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
              <input
                type="text"
                placeholder={t('home.search_placeholder')}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (search.trim().length > 0) setShowSearchDropdown(true);
                }}
                className="w-full bg-transparent text-slate-800 text-sm focus:outline-none placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 text-slate-400 hover:text-slate-600 transition"
                  title={t('home.clear_search')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="ml-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shrink-0"
              >
                {t('common.search')}
              </button>
            </form>

            {/* Dropdown gợi ý tìm kiếm */}
            {showSearchDropdown && searchSuggestions.length > 0 && (
              <div className="absolute z-40 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-150">
                <div className="px-3 py-2 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{t('home.quick_suggestion')}</span>
                  <span className="text-[10px] font-normal text-slate-400">{t('home.click_to_open')}</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {searchSuggestions.map((deck) => (
                    <button
                      key={deck._id}
                      type="button"
                      onClick={() => {
                        setShowSearchDropdown(false);
                        navigate(`/decks/${deck._id}`);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-indigo-50/70 transition flex items-center justify-between text-left group"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 truncate">
                          {deck.title}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">
                          {deck.description || t('home.no_description')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-md">
                          {formatCategory(deck.category)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {deck.cards?.length || 0} {t('deck.cards_count')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hàng bộ lọc: Phạm vi (Tất cả / Của tôi) & Danh mục thẻ */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Chuyển đổi phạm vi hiển thị (nếu đã đăng nhập) */}
            {user ? (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start">
                <button
                  onClick={() => setViewScope('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    viewScope === 'all'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('home.all_scope')} ({decks.length})
                </button>
                <button
                  onClick={() => setViewScope('my')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    viewScope === 'my'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('nav.my_decks')} ({myDecksCount})
                </button>
              </div>
            ) : (
              <div className="text-xs font-semibold text-slate-500">
                {t('home.category_label')}
              </div>
            )}

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {formatCategory(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danh sách Bộ thẻ (Deck Cards Grid) */}
        {loading ? (
          <LoadingSpinner message={t('common.loading')} />
        ) : displayedDecks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              {search ? t('home.no_decks_found') : t('home.no_decks_yet')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-5 max-w-sm mx-auto">
              {search
                ? `"${search}" - ${t('home.no_decks_found')}`
                : t('home.no_description')}
            </p>
            {search ? (
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                {t('home.clear_search')}
              </button>
            ) : (
              <Link
                to="/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" /> {t('home.create_first_deck')}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedDecks.map((deck) => {
              const totalCards = deck.cards?.length || 0;
              const isOwner = user && deck.author && deck.author._id === user._id;

              return (
                <div
                  key={deck._id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header Card: Category & Card Count & Visibility Tag */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                          {formatCategory(deck.category)}
                        </span>
                        {isOwner && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              deck.isPublic
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {deck.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                            {deck.isPublic ? t('deck.public') : t('deck.private')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {totalCards} {t('deck.cards_count')}
                      </span>
                    </div>

                    {/* Deck Title */}
                    <Link to={`/decks/${deck._id}`}>
                      <h3 className="font-bold text-base text-slate-800 group-hover:text-indigo-600 transition line-clamp-1">
                        {deck.title}
                      </h3>
                    </Link>

                    {/* Deck Description */}
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px] leading-relaxed">
                      {deck.description || t('home.no_description')}
                    </p>

                    {/* Preview từ vựng thực tế (Tập trung vào nội dung) */}
                    {deck.cards && deck.cards.length > 0 && (
                      <div className="my-3 py-2 px-3 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-wrap gap-1.5 text-xs">
                        {deck.cards.slice(0, 3).map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs text-[11px]"
                          >
                            <span className="font-bold text-indigo-700">{c.term}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-600 truncate max-w-[90px]">{c.definition}</span>
                          </span>
                        ))}
                        {deck.cards.length > 3 && (
                          <span className="text-[10px] font-semibold text-slate-400 self-center px-1">
                            +{deck.cards.length - 3} {t('home.more')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer & Quick Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {/* Tác giả */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center border border-slate-200">
                        {deck.author?.username?.slice(0, 1).toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs text-slate-500 font-medium truncate max-w-[100px]">
                        {deck.author?.username || t('home.anonymous')}
                      </span>
                    </div>

                    {/* Nút vào học: Primary CTA + Quick Mode Icons */}
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/decks/${deck._id}/flashcards`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-semibold transition flex items-center gap-1"
                        title={t('deck.mode_flashcards')}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{t('home.study_now')}</span>
                      </Link>
                      <Link
                        to={`/decks/${deck._id}/learn`}
                        title={t('deck.mode_learn')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      >
                        <SpellCheck className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/decks/${deck._id}/quiz`}
                        title={t('deck.mode_quiz')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition"
                      >
                        <BrainCircuit className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/decks/${deck._id}/match`}
                        title={t('deck.mode_match')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                      >
                        <Gamepad2 className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
