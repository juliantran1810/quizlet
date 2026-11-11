import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  UploadCloud,
  Sparkles,
  Key,
  CheckCircle2,
  Trash2,
  Plus,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { aiService } from '../services/api';

export default function ImageScanModal({ isOpen, onClose, onImport }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('memora_gemini_key') || '');
  const [showKeyHelp, setShowKeyHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannedCards, setScannedCards] = useState([]);
  const [step, setStep] = useState('upload'); // 'upload' | 'review'

  const fileInputRef = useRef(null);

  // Lắng nghe sự kiện Paste (Ctrl + V) ảnh trực tiếp từ Clipboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Reset modal khi đóng
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl('');
      setError('');
      setScannedCards([]);
      setStep('upload');
      setLoading(false);
    }
  }, [isOpen]);

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }
    setError('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Nén ảnh và chuyển sang chuỗi Base64 (tối ưu kích thước để upload tức thì và AI xử lý siêu nhanh)
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Giới hạn cạnh lớn nhất tối đa 1600px để chữ Hán sắc nét nhưng dung lượng siêu nhẹ (~200KB)
            const maxDim = 1600;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Xuất JPEG chất lượng 85%
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            resolve(compressed);
          } catch (canvasErr) {
            resolve(e.target.result); // Fallback nếu trình duyệt lỗi canvas
          }
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  const handleScan = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn hoặc chụp một bức ảnh bảng từ vựng.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Lưu key vào localStorage nếu người dùng có nhập
      if (apiKey.trim()) {
        localStorage.setItem('memora_gemini_key', apiKey.trim());
      }

      const base64Data = await fileToBase64(selectedFile);

      const res = await aiService.scanImage({
        imageBase64: base64Data,
        mimeType: selectedFile.type || 'image/jpeg',
        apiKey: apiKey.trim() || undefined,
      });

      const cards = res.data?.cards || [];
      if (cards.length === 0) {
        setError('Không nhận diện được từ vựng nào trong ảnh. Hãy thử ảnh chụp góc gần và rõ nét hơn.');
        return;
      }

      setScannedCards(cards);
      setStep('review');
    } catch (err) {
      console.error('Lỗi scan ảnh:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể quét ảnh. Vui lòng kiểm tra lại kết nối mạng hoặc Gemini API Key.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCardChange = (index, field, value) => {
    const updated = [...scannedCards];
    updated[index] = { ...updated[index], [field]: value };
    setScannedCards(updated);
  };

  const handleDeleteCard = (index) => {
    setScannedCards(scannedCards.filter((_, idx) => idx !== index));
  };

  const handleAddBlankCard = () => {
    setScannedCards([...scannedCards, { term: '', pinyin: '', definition: '', hint: '', imageUrl: '' }]);
  };

  const handleConfirmImport = () => {
    const valid = scannedCards.filter((c) => c.term.trim() || c.definition.trim());
    if (valid.length === 0) {
      setError('Danh sách từ vựng đang trống.');
      return;
    }
    onImport(valid);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                Quét từ vựng bằng AI Vision
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">
                  Gemini 1.5
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Tự động bóc tách chữ Hán, Pinyin và nghĩa tiếng Việt từ ảnh chụp sách
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('API') && (
                  <div className="mt-1">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-rose-800 underline hover:text-rose-900"
                    >
                      Nhận Gemini API Key miễn phí tại đây <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'upload' ? (
            <>
              {/* Khu vực Upload / Drag & Drop */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  previewUrl
                    ? 'border-indigo-400 bg-indigo-50/20'
                    : 'border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {previewUrl ? (
                  <div className="relative group max-h-56 overflow-hidden rounded-xl shadow-sm border border-slate-200">
                    <img
                      src={previewUrl}
                      alt="Ảnh xem trước"
                      className="max-h-56 object-contain rounded-xl"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white text-xs font-semibold">
                      <RefreshCw className="w-4 h-4" /> Bấm để chọn ảnh khác
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Kéo thả ảnh vào đây, hoặc <span className="text-indigo-600">bấm để chọn ảnh</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Hỗ trợ chụp từ camera, ảnh JPG, PNG, WEBP hoặc dán trực tiếp (<kbd className="font-mono px-1 bg-slate-200 rounded text-slate-700">Ctrl + V</kbd>)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tùy chọn cấu hình Gemini API Key */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    Google Gemini API Key (Tùy chọn)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKeyHelp(!showKeyHelp)}
                    className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-[11px]"
                  >
                    <HelpCircle className="w-3 h-3" /> {showKeyHelp ? 'Ẩn hướng dẫn' : 'Lấy key ở đâu?'}
                  </button>
                </div>

                <input
                  type="password"
                  placeholder="AIzaSy... (Nếu server đã có key thì có thể để trống)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                />

                {showKeyHelp && (
                  <div className="text-[11px] text-slate-500 bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <p className="font-medium text-slate-700">Cách nhận Gemini API Key hoàn toàn miễn phí:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                      <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">Google AI Studio</a> và đăng nhập Google.</li>
                      <li>Bấm nút <strong>Create API Key</strong> và sao chép mã khóa.</li>
                      <li>Dán mã vào ô trên. Key sẽ được lưu an toàn trên trình duyệt của bạn.</li>
                    </ol>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Bước 2: Xem trước và duyệt các thẻ được nhận diện */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã nhận diện thành công {scannedCards.length} từ vựng
                </div>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Quét lại ảnh khác
                </button>
              </div>

              {/* Bảng danh sách từ bóc tách được */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto bg-slate-50/50">
                {scannedCards.map((card, idx) => (
                  <div key={idx} className="p-3 bg-white hover:bg-indigo-50/30 transition flex items-center gap-2 text-xs">
                    <span className="w-5 text-slate-400 font-mono text-[11px] text-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Term */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={card.term}
                        onChange={(e) => handleCardChange(idx, 'term', e.target.value)}
                        placeholder="Thuật ngữ / Chữ Hán"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 text-xs"
                      />
                    </div>

                    {/* Pinyin */}
                    <div className="w-28 shrink-0">
                      <input
                        type="text"
                        value={card.pinyin || ''}
                        onChange={(e) => handleCardChange(idx, 'pinyin', e.target.value)}
                        placeholder="Pinyin (tuỳ chọn)"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-indigo-600 font-medium text-xs"
                      />
                    </div>

                    {/* Definition */}
                    <div className="flex-[1.5] min-w-0">
                      <input
                        type="text"
                        value={card.definition}
                        onChange={(e) => handleCardChange(idx, 'definition', e.target.value)}
                        placeholder="Định nghĩa tiếng Việt"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700 text-xs"
                      />
                    </div>

                    {/* Nút Xóa dòng */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition shrink-0"
                      title="Xóa thẻ này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddBlankCard}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold py-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm một từ vựng mới
              </button>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
          >
            Hủy bỏ
          </button>

          {step === 'upload' ? (
            <button
              type="button"
              onClick={handleScan}
              disabled={loading || !selectedFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang phân tích trang sách (15-25s)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu quét từ vựng</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Thêm {scannedCards.length} từ vào bộ thẻ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
