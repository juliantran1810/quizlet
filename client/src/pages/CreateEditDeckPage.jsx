import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { deckService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Languages,
  Tag,
  ChevronDown,
} from 'lucide-react';

// Danh sách gợi ý chủ đề mặc định
const SUGGESTED_CATEGORIES = [
  '🇨🇳 Tiếng Trung',
  '🇺🇸 Tiếng Anh',
  '🇯🇵 Tiếng Nhật',
  '🇰🇷 Tiếng Hàn',
  '🇫🇷 Tiếng Pháp',
  '💻 Công nghệ',
  '🔬 Khoa học',
  '📜 Lịch sử',
  '🏥 Y Dược',
  '📐 Toán học',
  '🎵 Âm nhạc',
  '📚 General',
];

export default function CreateEditDeckPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('🇨🇳 Tiếng Trung');
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryRef = useRef(null);
  const [isPublic, setIsPublic] = useState(true);
  const [cards, setCards] = useState([
    { term: '', pinyin: '', definition: '', hint: '', imageUrl: '' },
    { term: '', pinyin: '', definition: '', hint: '', imageUrl: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Đóng dropdown gợi ý khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategorySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Nếu là chế độ Sửa, tải thông tin bộ thẻ cũ
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      deckService
        .getById(id)
        .then((res) => {
          const deck = res.data.deck;
          // Kiểm tra xem user có phải là author không
          if (user && deck.author && deck.author._id !== user._id) {
            alert('Bạn không có quyền chỉnh sửa bộ thẻ này');
            navigate('/');
            return;
          }
          setTitle(deck.title);
          setDescription(deck.description || '');
          setCategory(deck.category || 'Tiếng Anh');
          setIsPublic(deck.isPublic !== undefined ? deck.isPublic : true);
          setCards(deck.cards.length >= 2 ? deck.cards : [...deck.cards, { term: '', definition: '', hint: '', imageUrl: '' }]);
        })
        .catch((err) => {
          setError('Không thể tải bộ thẻ: ' + (err.response?.data?.message || err.message));
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, user]);

  const handleCardChange = (index, field, value) => {
    const updated = [...cards];
    updated[index][field] = value;
    setCards(updated);
  };

  const handleAddCard = () => {
    setCards([...cards, { term: '', pinyin: '', definition: '', hint: '', imageUrl: '' }]);
  };

  const handleRemoveCard = (index) => {
    if (cards.length <= 2) {
      alert('Bộ thẻ phải có ít nhất 2 thẻ!');
      return;
    }
    const updated = cards.filter((_, i) => i !== index);
    setCards(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề cho bộ thẻ');
      return;
    }

    // Lọc các thẻ rỗng nếu có, nhưng phải đảm bảo ít nhất 2 thẻ hợp lệ
    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (validCards.length < 2) {
      setError('Bộ thẻ cần có ít nhất 2 thẻ với đầy đủ Thuật ngữ (Term) và Định nghĩa (Definition)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        isPublic,
        cards: validCards,
      };

      if (isEditMode) {
        await deckService.update(id, payload);
        navigate(`/decks/${id}`);
      } else {
        const res = await deckService.create(payload);
        navigate(`/decks/${res.data.deck._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu bộ thẻ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Đang tải dữ liệu bộ thẻ..." />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          to={isEditMode ? `/decks/${id}` : '/'}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>

        <h1 className="text-2xl font-extrabold text-slate-800">
          {isEditMode ? 'Chỉnh sửa bộ thẻ' : 'Tạo bộ thẻ mới'}
        </h1>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo bộ thẻ'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-sm text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Deck General Info */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Thông tin chung của bộ thẻ
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tiêu đề bộ thẻ *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: 100 Từ vựng IELTS chủ đề Environment"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Combobox Chủ đề tự do */}
            <div ref={categoryRef} className="relative">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Chủ đề / Thể loại
              </label>

              {/* Badge chủ đề đang chọn */}
              {category && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                    <Tag className="w-3 h-3" />
                    {category}
                  </span>
                </div>
              )}

              {/* Input gõ tìm kiếm hoặc đặt tên mới */}
              <div className="relative">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => {
                    setCategoryInput(e.target.value);
                    setShowCategorySuggestions(true);
                  }}
                  onFocus={() => setShowCategorySuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && categoryInput.trim()) {
                      e.preventDefault();
                      setCategory(categoryInput.trim());
                      setCategoryInput('');
                      setShowCategorySuggestions(false);
                    }
                  }}
                  placeholder="Nhập hoặc chọn chủ đề..."
                  className="w-full px-4 py-2.5 pr-9 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm bg-white"
                />
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                />
              </div>

              {/* Dropdown gợi ý */}
              {showCategorySuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  {/* Nút tạo chủ đề mới nếu đang gõ */}
                  {categoryInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(categoryInput.trim());
                        setCategoryInput('');
                        setShowCategorySuggestions(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition border-b border-indigo-100"
                    >
                      <Plus className="w-4 h-4" />
                      Tạo chủ đề mới: &ldquo;{categoryInput.trim()}&rdquo;
                    </button>
                  )}

                  {/* Danh sách gợi ý được lọc theo input */}
                  <div className="max-h-52 overflow-y-auto">
                    {SUGGESTED_CATEGORIES.filter((c) =>
                      !categoryInput.trim() ||
                      c.toLowerCase().includes(categoryInput.toLowerCase())
                    ).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          setCategoryInput('');
                          setShowCategorySuggestions(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition flex items-center gap-2 ${category === cat ? 'font-bold text-indigo-700 bg-indigo-50/50' : 'text-slate-700'
                          }`}
                      >
                        {cat}
                        {category === cat && (
                          <span className="ml-auto text-indigo-500 text-xs">✓ Đang chọn</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-1">
                💡 Gõ tên tùy ý và nhấn <kbd className="font-mono px-1 bg-slate-100 rounded">Enter</kbd> để tạo chủ đề mới
              </p>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-slate-700 cursor-pointer">
                Công khai cho mọi người cùng học
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô tả ngắn
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thêm mô tả về nội dung hoặc mục tiêu của bộ thẻ này..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition"
            />
          </div>
        </div>

        {/* Dynamic Cards Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Danh sách thẻ ({cards.length})
            </h2>
            <span className="text-xs text-slate-500">Tối thiểu 2 thẻ</span>
          </div>

          {cards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 relative group"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                  {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveCard(index)}
                  title="Xóa thẻ này"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Chữ Hán / Thuật ngữ (Term) *
                  </label>
                  <input
                    type="text"
                    required
                    value={card.term}
                    onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                    placeholder="VD: 爱 hoặc Biodegradable"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Nghĩa / Định nghĩa (Definition) *
                  </label>
                  <input
                    type="text"
                    required
                    value={card.definition}
                    onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                    placeholder="VD: Yêu thương / Có thể phân hủy sinh học"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Pinyin row */}
              <div className="pt-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                  <Languages className="w-3.5 h-3.5" />
                  Phiên âm Pinyin (Tùy chọn — dành cho tiếng Trung)
                </label>
                <input
                  type="text"
                  value={card.pinyin || ''}
                  onChange={(e) => handleCardChange(index, 'pinyin', e.target.value)}
                  placeholder="VD: ài, nǐ hǎo, wǒ ài nǐ..."
                  className="w-full px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50/40 focus:outline-none focus:border-indigo-500 text-sm font-medium text-indigo-700 tracking-wide"
                />
              </div>

              {/* Optional Hint & Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-50 text-xs">
                <div>
                  <label className="flex items-center gap-1 font-medium text-slate-500 mb-1">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    Gợi ý (Hint - Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={card.hint || ''}
                    onChange={(e) => handleCardChange(index, 'hint', e.target.value)}
                    placeholder="VD: Bắt đầu bằng chữ 'Bio...'"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 font-medium text-slate-500 mb-1">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    Link hình ảnh minh họa (URL - Tùy chọn)
                  </label>
                  <input
                    type="url"
                    value={card.imageUrl || ''}
                    onChange={(e) => handleCardChange(index, 'imageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Card Button */}
          <button
            type="button"
            onClick={handleAddCard}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-600 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-5 h-5" /> Thêm thẻ mới (+ Add Card)
          </button>
        </div>

        {/* Bottom Save Action */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Hoàn tất & Tạo bộ thẻ'}
          </button>
        </div>
      </form>
    </div>
  );
}

