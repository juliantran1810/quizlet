import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Upload,
  X,
  Eye,
  CheckCircle2,
  FileText,
} from 'lucide-react';

// ----- Danh sách gợi ý chủ đề -----
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

// ----- Helper: nhận diện chữ Hán -----
const isHanzi = (text) => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);

// ----- Sinh Pinyin từ pinyin-pro (lazy import) -----
let pinyinProModule = null;
const getPinyin = async (text) => {
  if (!isHanzi(text)) return '';
  try {
    if (!pinyinProModule) {
      pinyinProModule = await import('pinyin-pro');
    }
    const { pinyin } = pinyinProModule;
    return pinyin(text, { toneType: 'symbol', separator: ' ', nonZh: 'consecutive' });
  } catch (e) {
    console.warn('Lỗi sinh Pinyin:', e);
    return '';
  }
};

// ----- Modal Bulk Import -----
function BulkImportModal({ onClose, onImport }) {
  const [rawText, setRawText] = useState('');
  const [termSep, setTermSep] = useState('\t');   // Dấu phân tách Term — Def
  const [preview, setPreview] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Parse raw text thành mảng thẻ
  const parseCards = useCallback(
    (text, sep) => {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const actual_sep = sep === '\\t' ? '\t' : sep;
      return lines
        .map((line) => {
          const parts = line.split(actual_sep).map((p) => p.trim());
          if (parts.length < 2) return null;
          return {
            term: parts[0] || '',
            pinyin: '',
            definition: parts.slice(1).join(' ') || '',
            hint: '',
            imageUrl: '',
          };
        })
        .filter(Boolean);
    },
    []
  );

  // Live preview cập nhật khi thay đổi input
  useEffect(() => {
    const parsed = parseCards(rawText, termSep);
    setPreview(parsed);
  }, [rawText, termSep, parseCards]);

  // Sinh Pinyin tự động cho tất cả thẻ có chữ Hán trong preview
  const handleGeneratePinyin = async () => {
    setGenerating(true);
    const updated = await Promise.all(
      preview.map(async (card) => {
        if (isHanzi(card.term) && !card.pinyin) {
          const py = await getPinyin(card.term);
          return { ...card, pinyin: py };
        }
        return card;
      })
    );
    setPreview(updated);
    setGenerating(false);
  };

  const handleConfirm = () => {
    if (preview.length === 0) return;
    onImport(preview);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Nhập nhanh từ văn bản</h2>
              <p className="text-xs text-slate-400">Paste từ Excel, Quizlet, Anki hoặc bất kỳ văn bản nào</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Hướng dẫn định dạng */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-800 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Định dạng được hỗ trợ:</p>
            <p>• Mỗi <strong>dòng = 1 thẻ</strong>. Phân tách Term & Định nghĩa bằng ký tự bạn chọn bên dưới.</p>
            <p>• Ví dụ Tab (Excel):  <code className="bg-blue-100 px-1 rounded">爱	Yêu</code></p>
            <p>• Ví dụ dấu phẩy:  <code className="bg-blue-100 px-1 rounded">你好,Xin chào</code></p>
            <p>• Ví dụ dấu gạch:  <code className="bg-blue-100 px-1 rounded">谢谢 - Cảm ơn</code></p>
          </div>

          {/* Chọn ký tự phân tách */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ký tự phân tách Term ↔ Định nghĩa:
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Tab (Excel / Quizlet)', value: '\t' },
                { label: 'Dấu phẩy (,)', value: ',' },
                { label: 'Dấu gạch (-)', value: ' - ' },
                { label: 'Dấu chấm phẩy (;)', value: ';' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTermSep(opt.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                    termSep === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vùng paste */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Dán nội dung vào đây:
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Dán danh sách từ vựng vào đây...\nVí dụ:\n爱\tYêu thương\n你好\tXin chào\n学习\tHọc tập`}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-mono resize-none bg-slate-50"
            />
          </div>

          {/* Live Preview */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                  Xem trước ({preview.length} thẻ nhận diện được):
                </label>

                {/* Nút sinh Pinyin hàng loạt */}
                {preview.some((c) => isHanzi(c.term) && !c.pinyin) && (
                  <button
                    type="button"
                    onClick={handleGeneratePinyin}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-semibold transition disabled:opacity-50"
                  >
                    🈶 {generating ? 'Đang sinh...' : 'Tự động thêm Pinyin'}
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {preview.map((card, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  >
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`font-bold text-slate-800 ${isHanzi(card.term) ? 'text-xl' : ''}`}>
                        {card.term}
                      </span>
                      {card.pinyin && (
                        <span className="ml-2 text-indigo-500 font-medium text-xs">{card.pinyin}</span>
                      )}
                    </div>
                    <span className="text-slate-500 shrink-0 max-w-[45%] truncate">{card.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rawText && preview.length === 0 && (
            <div className="text-center py-6 text-sm text-slate-400">
              ⚠️ Không nhận diện được thẻ nào — thử đổi ký tự phân tách bên trên nhé!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500">
            {preview.length > 0 ? `✅ Sẵn sàng thêm ${preview.length} thẻ vào bộ` : 'Chưa có dữ liệu'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={preview.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Thêm {preview.length > 0 ? `${preview.length} thẻ` : ''} vào bộ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- MAIN PAGE -----
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
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Đóng dropdown category khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategorySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load deck khi sửa
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      deckService
        .getById(id)
        .then((res) => {
          const deck = res.data.deck;
          if (user && deck.author && deck.author._id !== user._id) {
            alert('Bạn không có quyền chỉnh sửa bộ thẻ này');
            navigate('/');
            return;
          }
          setTitle(deck.title);
          setDescription(deck.description || '');
          setCategory(deck.category || '🇨🇳 Tiếng Trung');
          setIsPublic(deck.isPublic !== undefined ? deck.isPublic : true);
          const loaded = deck.cards.length >= 2
            ? deck.cards
            : [...deck.cards, { term: '', pinyin: '', definition: '', hint: '', imageUrl: '' }];
          setCards(loaded);
        })
        .catch((err) => setError('Không thể tải bộ thẻ: ' + (err.response?.data?.message || err.message)))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, user]);

  // Xử lý thay đổi từng ô input trong thẻ
  const handleCardChange = async (index, field, value) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], [field]: value };

    // Tự động sinh Pinyin khi nhập chữ Hán vào ô "term" và ô pinyin đang trống
    if (field === 'term' && isHanzi(value) && !updated[index].pinyin) {
      const py = await getPinyin(value);
      updated[index].pinyin = py;
    }

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
    setCards(cards.filter((_, i) => i !== index));
  };

  // Thêm thẻ từ Bulk Import vào cuối danh sách
  const handleBulkImport = (importedCards) => {
    setCards((prev) => {
      // Lọc bỏ các thẻ trống ở cuối trước khi thêm
      const cleaned = prev.filter((c) => c.term.trim() || c.definition.trim());
      const base = cleaned.length >= 2 ? cleaned : prev;
      return [...base, ...importedCards];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề cho bộ thẻ');
      return;
    }

    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (validCards.length < 2) {
      setError('Bộ thẻ cần có ít nhất 2 thẻ với đầy đủ Thuật ngữ và Định nghĩa');
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

  if (loading) return <LoadingSpinner message="Đang tải dữ liệu bộ thẻ..." />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImport={handleBulkImport}
        />
      )}

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
        {/* Thông tin chung */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Thông tin chung của bộ thẻ
          </h2>

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tiêu đề bộ thẻ *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: 100 Từ vựng HSK2 — Chủ đề Gia Đình"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Combobox Chủ đề tự do */}
            <div ref={categoryRef} className="relative">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Chủ đề / Thể loại
              </label>

              {category && (
                <div className="mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                    <Tag className="w-3 h-3" />
                    {category}
                  </span>
                </div>
              )}

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
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {showCategorySuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
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
                  <div className="max-h-52 overflow-y-auto">
                    {SUGGESTED_CATEGORIES.filter((c) =>
                      !categoryInput.trim() || c.toLowerCase().includes(categoryInput.toLowerCase())
                    ).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          setCategoryInput('');
                          setShowCategorySuggestions(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition flex items-center gap-2 ${
                          category === cat ? 'font-bold text-indigo-700 bg-indigo-50/50' : 'text-slate-700'
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
                💡 Gõ tên tùy ý rồi nhấn <kbd className="font-mono px-1 bg-slate-100 rounded">Enter</kbd> để tạo chủ đề mới
              </p>
            </div>

            {/* Công khai */}
            <div className="flex items-start gap-3 pt-7">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <div>
                <label htmlFor="isPublic" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Công khai cho mọi người cùng học
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bộ thẻ sẽ hiển thị ở trang chủ và tìm kiếm cộng đồng
                </p>
              </div>
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô tả ngắn
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả nội dung hoặc mục tiêu của bộ thẻ này..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition"
            />
          </div>
        </div>

        {/* Danh sách thẻ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Danh sách thẻ ({cards.length})
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tối thiểu 2 thẻ hợp lệ</span>
              {/* Nút mở Bulk Import */}
              <button
                type="button"
                onClick={() => setShowBulkImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-semibold text-xs transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Nhập nhanh (Import)
              </button>
            </div>
          </div>

          {cards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 relative"
            >
              {/* Card Header */}
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

              {/* Term + Definition */}
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

              {/* Pinyin — tự động sinh + có thể sửa tay */}
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                  <Languages className="w-3.5 h-3.5" />
                  Phiên âm Pinyin
                  {isHanzi(card.term) && !card.pinyin && (
                    <span className="ml-auto text-[10px] text-indigo-400 font-normal normal-case">
                      ⚡ Đang tự sinh...
                    </span>
                  )}
                  {card.pinyin && (
                    <span className="ml-auto text-[10px] text-emerald-500 font-normal normal-case">
                      ✓ Đã có Pinyin
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={card.pinyin || ''}
                  onChange={(e) => handleCardChange(index, 'pinyin', e.target.value)}
                  placeholder="Tự động sinh khi nhập chữ Hán, hoặc gõ thủ công..."
                  className="w-full px-4 py-2 rounded-xl border border-indigo-100 bg-indigo-50/40 focus:outline-none focus:border-indigo-500 text-sm font-medium text-indigo-700 tracking-wide"
                />
              </div>

              {/* Hint + Image (tùy chọn) */}
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
                    placeholder="VD: Thanh 4 (nặng)..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 font-medium text-slate-500 mb-1">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    Link hình ảnh (URL - Tùy chọn)
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

          {/* Nút thêm thẻ */}
          <button
            type="button"
            onClick={handleAddCard}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-600 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-5 h-5" /> Thêm thẻ mới (+ Add Card)
          </button>
        </div>

        {/* Bottom Save */}
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
