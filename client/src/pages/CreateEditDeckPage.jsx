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
  Camera,
} from 'lucide-react';
import ImageScanModal from '../components/ImageScanModal';

// ----- Danh sách gợi ý chủ đề -----
const SUGGESTED_CATEGORIES = [
  { label: '🇨🇳 Tiếng Trung', value: 'Tiếng Trung' },
  { label: '🇺🇸 Tiếng Anh', value: 'Tiếng Anh' },
  { label: '🇯🇵 Tiếng Nhật', value: 'Tiếng Nhật' },
  { label: '🇰🇷 Tiếng Hàn', value: 'Tiếng Hàn' },
  { label: '🇫🇷 Tiếng Pháp', value: 'Tiếng Pháp' },
  { label: '💻 Công nghệ', value: 'Công nghệ' },
  { label: '🔬 Khoa học', value: 'Khoa học' },
  { label: '📜 Lịch sử', value: 'Lịch sử' },
  { label: '🏥 Y Dược', value: 'Y Dược' },
  { label: '📐 Toán học', value: 'Toán học' },
  { label: '🎵 Âm nhạc', value: 'Âm nhạc' },
  { label: '📚 General', value: 'General' },
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
  const [termSep, setTermSep] = useState('auto'); // Mặc định tự động nhận diện (Tab, Phẩy, Gạch, Chấm phẩy)
  const [preview, setPreview] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Phát hiện dấu phân cách thông minh dựa trên nội dung dán vào
  const detectSeparator = (text) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return ' - ';
    const sample = lines.slice(0, 10);

    // Ưu tiên kiểm tra: Tab (Excel/Quizlet) -> Dấu gạch ( - / – / — ) -> Dấu hai chấm (:) -> Dấu chấm phẩy (;) -> Dấu phẩy (,)
    // LƯU Ý: Không được ưu tiên dấu phẩy trước dấu gạch, vì định nghĩa tiếng Việt thường dùng dấu phẩy để ngăn các từ đồng nghĩa!
    if (sample.some((l) => l.includes('\t'))) return '\t';
    if (sample.some((l) => /\s*[-–—]\s*/.test(l))) return ' - ';
    if (sample.some((l) => /\s*[:：]\s*/.test(l))) return ':';
    if (sample.some((l) => l.includes(';'))) return ';';
    if (sample.some((l) => l.includes(','))) return ',';
    return ' - ';
  };

  // Parse raw text thành mảng thẻ
  const parseCards = useCallback(
    (text, sep) => {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      let actual_sep = sep;
      if (sep === 'auto') {
        actual_sep = detectSeparator(text);
      } else if (sep === '\\t') {
        actual_sep = '\t';
      }

      return lines
        .map((line) => {
          let rawTerm = '';
          let rawDef = '';

          if (actual_sep === ' - ') {
            const parts = line.split(/\s*[-–—]\s*/);
            if (parts.length >= 2) {
              rawTerm = parts[0];
              rawDef = parts.slice(1).join(' - ');
            }
          } else if (actual_sep === ':') {
            const parts = line.split(/\s*[:：]\s*/);
            if (parts.length >= 2) {
              rawTerm = parts[0];
              rawDef = parts.slice(1).join(': ');
            }
          } else {
            const parts = line.split(actual_sep);
            if (parts.length >= 2) {
              rawTerm = parts[0];
              rawDef = parts.slice(1).join(actual_sep);
            }
          }

          if (!rawTerm.trim() || !rawDef.trim()) return null;

          rawTerm = rawTerm.trim();
          rawDef = rawDef.trim();

          // Tự động bóc tách nếu Term có kèm Pinyin trong ngoặc, ví dụ: "你 (nǐ)" -> Term: "你", Pinyin: "nǐ"
          let term = rawTerm;
          let pinyin = '';

          const pinyinMatch = rawTerm.match(/^([^\(\)（）]+)\s*[\(（]([^\(\)（）]+)[\)）]$/);
          if (pinyinMatch) {
            term = pinyinMatch[1].trim();
            pinyin = pinyinMatch[2].trim();
          }

          return {
            term,
            pinyin,
            definition: rawDef,
            hint: '',
            imageUrl: '',
          };
        })
        .filter(Boolean);
    },
    []
  );

  // Live preview & TỰ ĐỘNG SINH PINYIN NGAY KHI NHẬP
  useEffect(() => {
    let isCancelled = false;
    const parsed = parseCards(rawText, termSep);
    setPreview(parsed);

    // Tự động sinh Pinyin cho tất cả chữ Hán mà không cần người dùng phải bấm nút nào
    const needsPinyin = parsed.some((c) => isHanzi(c.term) && !c.pinyin);
    if (needsPinyin) {
      setGenerating(true);
      Promise.all(
        parsed.map(async (card) => {
          if (isHanzi(card.term) && !card.pinyin) {
            const py = await getPinyin(card.term);
            return { ...card, pinyin: py };
          }
          return card;
        })
      )
        .then((withPinyin) => {
          if (!isCancelled) {
            setPreview(withPinyin);
            setGenerating(false);
          }
        })
        .catch(() => {
          if (!isCancelled) setGenerating(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [rawText, termSep, parseCards]);

  // Xác nhận nhập thẻ: đảm bảo 100% thẻ có chữ Hán đều có Pinyin
  const handleConfirm = async () => {
    if (preview.length === 0) return;
    setGenerating(true);

    const completed = await Promise.all(
      preview.map(async (card) => {
        if (isHanzi(card.term) && !card.pinyin) {
          const py = await getPinyin(card.term);
          return { ...card, pinyin: py };
        }
        return card;
      })
    );

    setGenerating(false);
    onImport(completed);
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ký tự phân tách Term ↔ Định nghĩa:
              </label>
              {termSep === 'auto' && (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  ✓ Đang tự động nhận diện
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '✨ Tự động nhận diện', value: 'auto' },
                { label: 'Dấu gạch (-)', value: ' - ' },
                { label: 'Tab (Excel / Quizlet)', value: '\t' },
                { label: 'Dấu hai chấm (:)', value: ':' },
                { label: 'Dấu chấm phẩy (;)', value: ';' },
                { label: 'Dấu phẩy (,)', value: ',' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTermSep(opt.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${termSep === opt.value
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
              placeholder={`Dán danh sách từ vựng vào đây...\nVí dụ:\n爱,Yêu thương\n你好,Xin chào\n学习,Học tập`}
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

                {/* Trạng thái Pinyin */}
                {generating ? (
                  <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    ⚡ Đang tự động sinh Pinyin...
                  </span>
                ) : (
                  preview.some((c) => isHanzi(c.term) && c.pinyin) && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã tự động tạo Pinyin cho toàn bộ chữ Hán
                    </span>
                  )
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
  const [category, setCategory] = useState('Tiếng Trung');
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
  const [showImageScan, setShowImageScan] = useState(false);

  // Trạng thái gợi ý thông minh cho Term & Definition
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(null);
  const [termSuggestions, setTermSuggestions] = useState([]);
  const [defSuggestionsMap, setDefSuggestionsMap] = useState({});
  const suggestionTimeoutRef = useRef(null);
  const cardListRef = useRef(null);

  // Đóng dropdown category & suggestions khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategorySuggestions(false);
      }
      if (cardListRef.current && !cardListRef.current.contains(e.target)) {
        setActiveSuggestIndex(null);
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

  // Tra cứu gợi ý thông minh khi gõ Term
  const fetchTermSuggestions = (index, termVal) => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    const trimmed = termVal.trim();
    if (!trimmed) {
      setTermSuggestions([]);
      setActiveSuggestIndex(null);
      return;
    }

    suggestionTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await deckService.getSuggestions(trimmed);
        const list = res.data?.suggestions || [];
        setTermSuggestions(list);
        if (list.length > 0) {
          setActiveSuggestIndex(index);
        } else {
          setActiveSuggestIndex(null);
        }

        // Cập nhật sẵn gợi ý định nghĩa nếu có từ khớp
        const match = list.find((item) => item.term.toLowerCase() === trimmed.toLowerCase()) || list[0];
        if (match && match.definitions?.length > 0) {
          setDefSuggestionsMap((prev) => ({
            ...prev,
            [index]: match.definitions,
          }));
        }
      } catch (err) {
        console.warn('Lỗi lấy gợi ý từ vựng:', err);
      }
    }, 250);
  };

  // Tra cứu gợi ý định nghĩa khi người dùng trỏ vào ô Definition
  const handleFocusDefinition = async (index) => {
    const cardTerm = cards[index]?.term?.trim();
    if (!cardTerm) return;

    if (!defSuggestionsMap[index] || defSuggestionsMap[index].length === 0) {
      try {
        const res = await deckService.getSuggestions(cardTerm);
        const list = res.data?.suggestions || [];
        const match = list.find((item) => item.term.toLowerCase() === cardTerm.toLowerCase()) || list[0];
        if (match && match.definitions?.length > 0) {
          setDefSuggestionsMap((prev) => ({
            ...prev,
            [index]: match.definitions,
          }));
        }
      } catch (err) {
        console.warn('Lỗi lấy gợi ý định nghĩa:', err);
      }
    }
  };

  // Khi người dùng chọn một Term gợi ý từ dropdown
  const handleSelectTermSuggestion = (index, item) => {
    const updated = [...cards];
    updated[index] = {
      ...updated[index],
      term: item.term,
      pinyin: item.pinyin || updated[index].pinyin,
      definition: updated[index].definition || item.definitions[0] || '',
    };
    setCards(updated);
    setDefSuggestionsMap((prev) => ({
      ...prev,
      [index]: item.definitions || [],
    }));
    setActiveSuggestIndex(null);
    setTermSuggestions([]);
  };

  // Khi người dùng chọn một Định nghĩa gợi ý
  const handleSelectDefSuggestion = (index, def) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], definition: def };
    setCards(updated);
  };

  // Xử lý thay đổi từng ô input trong thẻ
  const handleCardChange = async (index, field, value) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], [field]: value };

    // Tự động sinh Pinyin khi nhập chữ Hán vào ô "term" và ô pinyin đang trống
    if (field === 'term' && isHanzi(value) && !updated[index].pinyin) {
      getPinyin(value).then((py) => {
        setCards((curr) => {
          const c = [...curr];
          if (c[index] && !c[index].pinyin) {
            c[index] = { ...c[index], pinyin: py };
          }
          return c;
        });
      });
    }

    // Tra cứu gợi ý thông minh khi sửa term
    if (field === 'term') {
      fetchTermSuggestions(index, value);
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

  // Thêm thẻ từ Bulk Import vào cuối danh sách (tự động đảm bảo Pinyin)
  const handleBulkImport = async (importedCards) => {
    const withPinyin = await Promise.all(
      importedCards.map(async (card) => {
        if (isHanzi(card.term) && !card.pinyin) {
          const py = await getPinyin(card.term);
          return { ...card, pinyin: py };
        }
        return card;
      })
    );

    setCards((prev) => {
      // Lọc bỏ toàn bộ các thẻ trống hiện tại (ví dụ 2 thẻ mẫu ban đầu khi mới tạo bộ)
      const existingFilledCards = prev.filter((c) => c.term.trim() || c.definition.trim());
      return [...existingFilledCards, ...withPinyin];
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

      {/* AI Image Scan Modal */}
      {showImageScan && (
        <ImageScanModal
          isOpen={showImageScan}
          onClose={() => setShowImageScan(false)}
          onImport={handleBulkImport}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <Link
            to={isEditMode ? `/decks/${id}` : '/'}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Link>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
            {isEditMode ? 'Chỉnh sửa bộ thẻ' : 'Tạo bộ thẻ mới'}
          </h1>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition disabled:opacity-50 w-full sm:w-auto"
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
                      !categoryInput.trim() ||
                      c.label.toLowerCase().includes(categoryInput.toLowerCase()) ||
                      c.value.toLowerCase().includes(categoryInput.toLowerCase())
                    ).map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setCategory(cat.value);
                          setCategoryInput('');
                          setShowCategorySuggestions(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition flex items-center gap-2 ${category === cat.value ? 'font-bold text-indigo-700 bg-indigo-50/50' : 'text-slate-700'
                          }`}
                      >
                        <span>{cat.label}</span>
                        {category === cat.value && (
                          <span className="ml-auto text-indigo-500 text-xs font-semibold">✓ Đang chọn</span>
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
        <div ref={cardListRef} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">
              Danh sách thẻ ({cards.length})
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 hidden sm:inline">Tối thiểu 2 thẻ hợp lệ</span>

              {/* Nút mở AI Scan */}
              <button
                type="button"
                onClick={() => setShowImageScan(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition"
              >
                <Camera className="w-3.5 h-3.5" />
                Quét từ ảnh (AI)
              </button>

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
                {/* CỘT THUẬT NGỮ (TERM) */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Chữ Hán / Thuật ngữ (Term) *
                    </label>
                    <span className="text-[11px] text-indigo-500 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Gợi ý từ
                    </span>
                  </div>

                  <input
                    type="text"
                    required
                    value={card.term}
                    onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                    onFocus={() => {
                      if (card.term?.trim()) {
                        fetchTermSuggestions(index, card.term);
                      }
                    }}
                    placeholder="VD: 爱 hoặc Biodegradable"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xl font-bold text-slate-800"
                  />

                  {/* Dropdown gợi ý Term khi gõ */}
                  {activeSuggestIndex === index && termSuggestions.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-150">
                      <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Gợi ý từ vựng phù hợp</span>
                        <span className="text-[10px] font-normal text-slate-400">Click để điền nhanh</span>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {termSuggestions.map((item, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectTermSuggestion(index, item);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/70 transition flex items-center justify-between group"
                          >
                            <div className="flex items-baseline gap-2">
                              <span className={`font-bold text-slate-800 group-hover:text-indigo-700 ${isHanzi(item.term) ? 'text-lg' : 'text-sm'}`}>
                                {item.term}
                              </span>
                              {item.pinyin && (
                                <span className="text-xs text-indigo-500 font-medium">
                                  {item.pinyin}
                                </span>
                              )}
                            </div>
                            {item.definitions?.[0] && (
                              <span className="text-xs text-slate-500 group-hover:text-indigo-600 truncate max-w-[50%]">
                                {item.definitions[0]}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CỘT NGHĨA (DEFINITION) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Nghĩa / Định nghĩa (Definition) *
                    </label>
                    {defSuggestionsMap[index]?.length > 0 && (
                      <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Click gợi ý bên dưới
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    value={card.definition}
                    onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                    onFocus={() => handleFocusDefinition(index)}
                    placeholder="VD: Yêu thương / Có thể phân hủy sinh học"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-800"
                  />

                  {/* Pills Gợi ý nghĩa (Quizlet Style) */}
                  {defSuggestionsMap[index] && defSuggestionsMap[index].length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 mr-0.5">
                        💡 Gợi ý nghĩa:
                      </span>
                      {defSuggestionsMap[index].map((def, dIdx) => {
                        const isChosen = card.definition === def;
                        return (
                          <button
                            key={dIdx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectDefSuggestion(index, def);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 flex items-center gap-1 ${isChosen
                              ? 'bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-xs'
                              : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 hover:border-amber-300'
                              }`}
                          >
                            <span>{def}</span>
                            {isChosen && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
