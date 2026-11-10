import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import { deckService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { speakChinese } from '../utils/speech';

const { width } = Dimensions.get('window');
const TILE_WIDTH = (width - 48) / 2;

export default function MatchGameScreen({ route, navigation }) {
  const { deckId, title } = route.params;
  const { updateStreak } = useAuth();

  const [tiles, setTiles] = useState([]);
  const [selectedFirst, setSelectedFirst] = useState(null); // tile object
  const [selectedSecond, setSelectedSecond] = useState(null); // tile object
  const [isWrongPair, setIsWrongPair] = useState(false);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [victory, setVictory] = useState(false);

  const timerRef = useRef(null);

  // Khởi tạo trò chơi
  const startNewGame = (cards) => {
    // Lấy tối đa 6 thẻ từ (12 ô) để vừa vặn màn hình mobile
    const chosenCards = [...cards].sort(() => 0.5 - Math.random()).slice(0, 6);

    const generatedTiles = [];
    chosenCards.forEach((c) => {
      generatedTiles.push({
        id: `${c._id}_term`,
        cardId: c._id,
        text: c.term,
        type: 'term',
        pinyin: c.pinyin,
      });
      generatedTiles.push({
        id: `${c._id}_def`,
        cardId: c._id,
        text: c.definition,
        type: 'def',
      });
    });

    // Xáo trộn toàn bộ các ô
    setTiles(generatedTiles.sort(() => 0.5 - Math.random()));
    setSelectedFirst(null);
    setSelectedSecond(null);
    setMatchedIds(new Set());
    setSeconds(0);
    setVictory(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    async function init() {
      try {
        const res = await deckService.getById(deckId);
        const cards = res.data?.deck?.cards || [];
        if (cards.length >= 2) {
          startNewGame(cards);
        }
      } catch (err) {
        console.warn('Lỗi tải game ghép từ:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [deckId]);

  // Bộ đếm giờ
  useEffect(() => {
    if (isPlaying && !victory) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, victory]);

  const handleTilePress = (tile) => {
    if (matchedIds.has(tile.id) || selectedSecond || isWrongPair) return;

    // Chạm vào chính ô đang chọn -> hủy chọn
    if (selectedFirst && selectedFirst.id === tile.id) {
      setSelectedFirst(null);
      return;
    }

    if (!selectedFirst) {
      setSelectedFirst(tile);
      if (tile.type === 'term') {
        speakChinese(tile.text);
      }
      return;
    }

    // Chọn ô thứ 2
    setSelectedSecond(tile);

    // Kiểm tra khớp
    if (selectedFirst.cardId === tile.cardId && selectedFirst.id !== tile.id) {
      // Đúng cặp!
      const termTile = selectedFirst.type === 'term' ? selectedFirst : tile;
      speakChinese(termTile.text);

      const nextMatched = new Set(matchedIds);
      nextMatched.add(selectedFirst.id);
      nextMatched.add(tile.id);
      setMatchedIds(nextMatched);

      setSelectedFirst(null);
      setSelectedSecond(null);

      // Kiểm tra hoàn thành tất cả
      if (nextMatched.size === tiles.length) {
        setIsPlaying(false);
        setVictory(true);
      }
    } else {
      // Sai cặp -> chớp đỏ
      setIsWrongPair(true);
      setTimeout(() => {
        setSelectedFirst(null);
        setSelectedSecond(null);
        setIsWrongPair(false);
      }, 700);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Đang sắp xếp các thẻ ghép từ...</Text>
      </View>
    );
  }

  if (tiles.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Bộ thẻ cần tối thiểu 2 thẻ từ vựng để chơi ghép từ.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (victory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.victoryContainer}>
          <Text style={styles.victoryEmoji}>👑</Text>
          <Text style={styles.victoryTitle}>Chiến Thắng Tuyệt Vời!</Text>
          <Text style={styles.victorySubtitle}>Bạn đã ghép chính xác tất cả các cặp từ</Text>

          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>THỜI GIAN HOÀN THÀNH</Text>
            <Text style={styles.timeValue}>{formatTime(seconds)}</Text>
            <Text style={styles.timeDesc}>Tốc độ phản xạ và ghi nhớ siêu đỉnh! ⚡</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              setLoading(true);
              const res = await deckService.getById(deckId);
              startNewGame(res.data?.deck?.cards || []);
              setLoading(false);
            }}
          >
            <Text style={styles.primaryBtnText}>Chơi lại ván mới</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Trở về trang chi tiết</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Timer & Pairs Counter */}
        <View style={styles.header}>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>⏱️ {formatTime(seconds)}</Text>
          </View>
          <Text style={styles.counterText}>
            Đã ghép: {matchedIds.size / 2} / {tiles.length / 2} cặp
          </Text>
        </View>

        {/* Tiles Grid */}
        <ScrollView contentContainerStyle={styles.gridContainer}>
          {tiles.map((tile) => {
            const isMatched = matchedIds.has(tile.id);
            const isSelected =
              selectedFirst?.id === tile.id || selectedSecond?.id === tile.id;

            if (isMatched) {
              return <View key={tile.id} style={styles.tilePlaceholder} />;
            }

            let tileStyle = [styles.tile];
            let textStyle = [styles.tileText];

            if (isSelected) {
              if (isWrongPair) {
                tileStyle.push(styles.tileWrong);
                textStyle.push(styles.tileTextWrong);
              } else {
                tileStyle.push(styles.tileSelected);
                textStyle.push(styles.tileTextSelected);
              }
            }

            return (
              <TouchableOpacity
                key={tile.id}
                activeOpacity={0.7}
                style={tileStyle}
                onPress={() => handleTilePress(tile)}
              >
                <Text
                  style={[
                    textStyle,
                    tile.type === 'term' ? styles.tileTermText : styles.tileDefText,
                  ]}
                  numberOfLines={4}
                >
                  {tile.text}
                </Text>
                {tile.pinyin ? (
                  <Text style={styles.tilePinyin}>{tile.pinyin}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  timerBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderBottomWidth: 3,
    borderBottomColor: '#A5B4FC',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  tile: {
    width: TILE_WIDTH,
    minHeight: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tilePlaceholder: {
    width: TILE_WIDTH,
    minHeight: 112,
  },
  tileSelected: {
    borderColor: '#4F46E5',
    borderBottomColor: '#312E81',
    backgroundColor: '#EEF2FF',
    transform: [{ translateY: 2 }],
    borderBottomWidth: 3,
  },
  tileWrong: {
    borderColor: '#EF4444',
    borderBottomColor: '#991B1B',
    backgroundColor: '#FEF2F2',
  },
  tileText: {
    textAlign: 'center',
  },
  tileTermText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  tileDefText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 19,
  },
  tilePinyin: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
    marginTop: 4,
  },
  tileTextSelected: {
    color: '#312E81',
  },
  tileTextWrong: {
    color: '#DC2626',
  },
  // Victory Styles
  victoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  victoryEmoji: {
    fontSize: 68,
    marginBottom: 12,
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  victorySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  timeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  timeValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#4F46E5',
    marginBottom: 8,
  },
  timeDesc: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 16,
    borderBottomWidth: 5,
    borderBottomColor: '#312E81',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
});

