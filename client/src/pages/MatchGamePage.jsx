import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deckService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ArrowLeft,
  Timer,
  Trophy,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MatchGamePage() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [wrongPair, setWrongPair] = useState([]);
  const [loading, setLoading] = useState(true);

  // Realtime Timer state
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadDeckAndSetupGame();
    return () => clearInterval(timerRef.current);
  }, [id]);

  // Timer runner
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime((prev) => prev + 100);
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const loadDeckAndSetupGame = async () => {
    try {
      setLoading(true);
      const res = await deckService.getById(id);
      const deckData = res.data.deck;
      setDeck(deckData);
      setupGameTiles(deckData.cards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setupGameTiles = (cards) => {
    if (!cards || cards.length === 0) return;

    // Chọn tối đa 6 cặp thẻ để vừa với lưới giao diện người dùng
    const selectedCards = [...cards].sort(() => Math.random() - 0.5).slice(0, 6);

    const generatedTiles = [];
    selectedCards.forEach((c) => {
      // Tile Thuật ngữ
      generatedTiles.push({
        id: `term-${c._id}`,
        cardId: c._id,
        type: 'term',
        text: c.term,
      });
      // Tile Định nghĩa
      generatedTiles.push({
        id: `def-${c._id}`,
        cardId: c._id,
        type: 'def',
        text: c.definition,
      });
    });

    // Xáo trộn toàn bộ lưới
    const shuffledTiles = generatedTiles.sort(() => Math.random() - 0.5);
    setTiles(shuffledTiles);
    setMatchedIds(new Set());
    setSelectedTile(null);
    setWrongPair([]);
    setTime(0);
    setIsRunning(true);
    setGameCompleted(false);
  };

  const handleTileClick = (tile) => {
    // Nếu thẻ đã ghép xong hoặc đang trong hiệu ứng sai thì bỏ qua
    if (matchedIds.has(tile.id) || wrongPair.length > 0) return;

    // Nếu bấm lại chính thẻ đang chọn thì bỏ chọn
    if (selectedTile && selectedTile.id === tile.id) {
      setSelectedTile(null);
      return;
    }

    if (!selectedTile) {
      setSelectedTile(tile);
    } else {
      // So sánh cặp: cùng cardId và khác type (1 term + 1 def)
      if (
        selectedTile.cardId === tile.cardId &&
        selectedTile.type !== tile.type
      ) {
        // GHÉP ĐÚNG!
        const newMatched = new Set(matchedIds);
        newMatched.add(selectedTile.id);
        newMatched.add(tile.id);
        setMatchedIds(newMatched);
        setSelectedTile(null);

        // Kiểm tra xem đã ghép hết chưa
        if (newMatched.size === tiles.length) {
          setIsRunning(false);
          setGameCompleted(true);
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }
      } else {
        // GHÉP SAI!
        setWrongPair([selectedTile.id, tile.id]);
        setTimeout(() => {
          setWrongPair([]);
          setSelectedTile(null);
        }, 700);
      }
    }
  };

  if (loading) return <LoadingSpinner message="Đang chuẩn bị đấu trường Ghép từ..." />;
  if (!deck || tiles.length === 0) {
    return <div className="text-center py-20">Bộ thẻ cần có thẻ để chơi</div>;
  }

  const formattedTime = (time / 1000).toFixed(1);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-[85vh] flex flex-col justify-between">
      {/* Top Bar */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/decks/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Thoát Game
          </Link>

          {/* Realtime Timer Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-mono font-bold text-lg shadow-sm">
            <Timer className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
            <span>{formattedTime}s</span>
          </div>

          <button
            onClick={() => setupGameTiles(deck.cards)}
            title="Chơi ván mới"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800 flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Ghép Từ Nhanh (Match Game)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chọn một cặp Thẻ Thuật ngữ & Thẻ Định nghĩa tương ứng càng nhanh càng tốt!
          </p>
        </div>
      </div>

      {/* Main Game Board */}
      <div className="my-auto py-4">
        {gameCompleted ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-md text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-1">Thành tích tuyệt vời!</h2>
            <p className="text-sm text-slate-500 mb-6">Bạn đã ghép chính xác tất cả các cặp từ vựng.</p>

            <div className="p-6 bg-gradient-to-tr from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Thời gian hoàn thành:
              </span>
              <div className="text-4xl font-black text-amber-600 font-mono mt-1">
                {formattedTime} giây
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setupGameTiles(deck.cards)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Chơi lại ván mới
              </button>
              <Link
                to={`/decks/${id}`}
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
              >
                Quay lại bộ thẻ
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tiles.map((tile) => {
              const isMatched = matchedIds.has(tile.id);
              const isSelected = selectedTile?.id === tile.id;
              const isWrong = wrongPair.includes(tile.id);

              let tileStyle =
                'bg-white border-slate-200 text-slate-800 hover:border-amber-400 hover:shadow-md cursor-pointer';

              if (isMatched) {
                // Đã ghép đúng: ẩn mờ hoặc biến mất mượt mà
                tileStyle = 'opacity-0 scale-95 pointer-events-none transition-all duration-500';
              } else if (isWrong) {
                tileStyle =
                  'bg-rose-50 border-rose-500 text-rose-800 animate-shake shadow-rose-100';
              } else if (isSelected) {
                tileStyle =
                  'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-400 shadow-md scale-105';
              }

              return (
                <div
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  className={`min-h-[110px] p-4 rounded-2xl border-2 flex items-center justify-center text-center font-semibold text-sm transition-all duration-200 select-none shadow-sm ${tileStyle}`}
                >
                  <span className="line-clamp-4 leading-snug">{tile.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-400 py-2">
        Thời gian đang đếm realtime • Ghép chuẩn xác để xóa sạch bảng
      </div>
    </div>
  );
}

