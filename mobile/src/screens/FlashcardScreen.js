import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { speakChinese } from '../utils/speech';

const { width } = Dimensions.get('window');

export default function FlashcardScreen({ route, navigation }) {
  const { deckId, title } = route.params;
  const { updateStreak } = useAuth();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);

  useEffect(() => {
    async function loadDeck() {
      try {
        const res = await deckService.getById(deckId);
        const fetchedDeck = res.data?.deck;
        setDeck(fetchedDeck);
        setCards(fetchedDeck?.cards || []);
      } catch (err) {
        console.warn('Lỗi tải thẻ:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    loadDeck();
  }, [deckId]);

  const currentCard = cards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAnswer = async (isCorrect) => {
    if (!currentCard) return;

    if (isCorrect) {
      setKnownCount((k) => k + 1);
    } else {
      setLearningCount((l) => l + 1);
    }

    // Gửi tiến độ lên backend và cập nhật Streak 🔥
    try {
      const res = await progressService.update(deckId, {
        cardId: currentCard._id,
        isCorrect,
      });
      if (res.data?.userStreak) {
        updateStreak(res.data.userStreak);
      }
    } catch (e) {
      console.warn('Lỗi ghi nhận tiến độ:', e?.message);
    }

    // Chuyển thẻ tiếp theo
    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setFinished(false);
    setKnownCount(0);
    setLearningCount(0);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Đang chuẩn bị bộ thẻ...</Text>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Bộ thẻ chưa có thẻ từ vựng nào.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Màn hình kết thúc
  if (finished) {
    const accuracy = Math.round((knownCount / cards.length) * 100);
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryEmoji}>🎉</Text>
          <Text style={styles.summaryTitle}>Hoàn Thành Phiên Học!</Text>
          <Text style={styles.summaryDeck}>{title}</Text>

          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Text style={styles.statNumGreen}>{knownCount}</Text>
              <Text style={styles.statLabel}>Đã thuộc</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumRed}>{learningCount}</Text>
              <Text style={styles.statLabel}>Cần ôn lại</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumBlue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>Ghi nhớ</Text>
            </View>
          </View>

          <View style={styles.streakNotice}>
            <Text style={styles.streakNoticeIcon}>🔥</Text>
            <Text style={styles.streakNoticeText}>
              Chuỗi học liên tục đã được ghi nhận vào hệ thống!
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleRestart}
          >
            <Text style={styles.primaryBtnText}>Học lại bộ thẻ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryBtnText}>Trở về chi tiết bộ thẻ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Progress Bar & Header */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Thẻ {currentIndex + 1} / {cards.length}
          </Text>
          <TouchableOpacity
            style={styles.soundTopBtn}
            onPress={() => speakChinese(currentCard.term)}
          >
            <Text style={styles.soundTopIcon}>🔊 Phát âm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIndex + 1) / cards.length) * 100}%` },
            ]}
          />
        </View>

        {/* Flashcard Touch Area */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.cardWrapper}
          onPress={handleFlip}
        >
          <View style={[styles.flashcard, isFlipped ? styles.flashcardBack : styles.flashcardFront]}>
            <View style={styles.cardTypeBadge}>
              <Text style={styles.cardTypeBadgeText}>
                {isFlipped ? 'ĐỊNH NGHĨA' : 'TỪ VỰNG'}
              </Text>
            </View>

            {!isFlipped ? (
              // FRONT OF CARD
              <View style={styles.cardContent}>
                <Text style={styles.termText}>{currentCard.term}</Text>
                {currentCard.pinyin ? (
                  <Text style={styles.pinyinText}>{currentCard.pinyin}</Text>
                ) : null}
                <Text style={styles.tapHint}>Chạm vào thẻ để lật xem nghĩa</Text>
              </View>
            ) : (
              // BACK OF CARD
              <View style={styles.cardContent}>
                <Text style={styles.defText}>{currentCard.definition}</Text>
                {currentCard.example ? (
                  <View style={styles.exampleBox}>
                    <Text style={styles.exampleLabel}>Ví dụ:</Text>
                    <Text style={styles.exampleText}>{currentCard.example}</Text>
                  </View>
                ) : null}
                <Text style={styles.tapHint}>Chạm để quay lại mặt trước</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Actions Bar */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.stillLearningBtn}
            onPress={() => handleAnswer(false)}
          >
            <Text style={styles.actionBtnEmoji}>❌</Text>
            <Text style={styles.stillLearningText}>Chưa thuộc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.knownBtn}
            onPress={() => handleAnswer(true)}
          >
            <Text style={styles.actionBtnEmoji}>✅</Text>
            <Text style={styles.knownText}>Đã thuộc</Text>
          </TouchableOpacity>
        </View>
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
    padding: 18,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
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
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  soundTopBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  soundTopIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  flashcard: {
    width: width - 36,
    height: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: '#E2E8F0',
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  flashcardFront: {
    borderColor: '#E2E8F0',
    borderBottomColor: '#CBD5E1',
  },
  flashcardBack: {
    borderColor: '#C7D2FE',
    borderBottomColor: '#818CF8',
    backgroundColor: '#FAFAFF',
  },
  cardTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  cardTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  termText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  pinyinText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  defText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  exampleBox: {
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 16,
    marginTop: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 3,
  },
  exampleText: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 20,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 12,
  },
  stillLearningBtn: {
    flex: 1,
    backgroundColor: '#FFF1F2',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#FECDD3',
    borderBottomColor: '#F43F5E',
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stillLearningText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E11D48',
  },
  knownBtn: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#A7F3D0',
    borderBottomColor: '#10B981',
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  knownText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  actionBtnEmoji: {
    fontSize: 16,
  },
  // Summary styles
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  summaryEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  summaryDeck: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 24,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumGreen: {
    fontSize: 26,
    fontWeight: '800',
    color: '#059669',
  },
  statNumRed: {
    fontSize: 26,
    fontWeight: '800',
    color: '#E11D48',
  },
  statNumBlue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },
  streakNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 24,
    width: '100%',
  },
  streakNoticeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  streakNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EA580C',
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
});

