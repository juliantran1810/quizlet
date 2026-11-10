import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { speakChinese } from '../utils/speech';

export default function LearnModeScreen({ route, navigation }) {
  const { deckId, title } = route.params;
  const { updateStreak } = useAuth();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [hintCount, setHintCount] = useState(0);
  const [feedback, setFeedback] = useState(null); // { isCorrect: boolean, message: string }
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [correctFirstTry, setCorrectFirstTry] = useState(0);

  useEffect(() => {
    async function loadDeck() {
      try {
        const res = await deckService.getById(deckId);
        setCards(res.data?.deck?.cards || []);
      } catch (err) {
        console.warn('Lỗi tải bài học:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    loadDeck();
  }, [deckId]);

  const currentCard = cards[currentIndex];

  const normalize = (str) => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  };

  const handleGiveHint = () => {
    if (!currentCard) return;
    const target = currentCard.term || '';
    if (hintCount < target.length) {
      const nextHint = target.slice(0, hintCount + 1);
      setUserInput(nextHint);
      setHintCount(hintCount + 1);
    }
  };

  const handleSubmit = async () => {
    if (!userInput.trim() || !currentCard || feedback) return;

    const userNorm = normalize(userInput);
    const targetNorm = normalize(currentCard.term);
    const pinyinNorm = normalize(currentCard.pinyin);

    // Đúng nếu khớp từ vựng hoặc khớp pinyin
    const isCorrect = userNorm === targetNorm || (pinyinNorm && userNorm === pinyinNorm);

    if (isCorrect) {
      speakChinese(currentCard.term);
      if (hintCount === 0) {
        setCorrectFirstTry((c) => c + 1);
      }
      setFeedback({ isCorrect: true, message: 'Chính xác! Làm tốt lắm.' });

      // Cập nhật tiến độ
      try {
        const res = await progressService.update(deckId, {
          cardId: currentCard._id,
          isCorrect: true,
        });
        if (res.data?.userStreak) {
          updateStreak(res.data.userStreak);
        }
      } catch (e) {
        console.warn('Lỗi cập nhật tiến độ:', e?.message);
      }

      setTimeout(() => {
        nextCard();
      }, 1200);
    } else {
      setFeedback({
        isCorrect: false,
        message: `Chưa chính xác. Đáp án đúng là: "${currentCard.term}"`,
      });
      speakChinese(currentCard.term);

      try {
        const res = await progressService.update(deckId, {
          cardId: currentCard._id,
          isCorrect: false,
        });
        if (res.data?.userStreak) {
          updateStreak(res.data.userStreak);
        }
      } catch (e) {
        // ignore
      }
    }
  };

  const nextCard = () => {
    setFeedback(null);
    setUserInput('');
    setHintCount(0);
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserInput('');
    setHintCount(0);
    setFeedback(null);
    setCorrectFirstTry(0);
    setFinished(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Đang tải câu hỏi...</Text>
      </View>
    );
  }

  if (finished) {
    const accuracy = Math.round((correctFirstTry / cards.length) * 100);
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryEmoji}>🏆</Text>
          <Text style={styles.summaryTitle}>Xuất Sắc! Hoàn Thành</Text>
          <Text style={styles.summaryDeck}>{title}</Text>

          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Text style={styles.statNumGreen}>{correctFirstTry}</Text>
              <Text style={styles.statLabel}>Đúng ngay lần đầu</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumBlue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>Độ chuẩn xác</Text>
            </View>
          </View>

          <View style={styles.streakNotice}>
            <Text style={styles.streakNoticeIcon}>🔥</Text>
            <Text style={styles.streakNoticeText}>
              Chuỗi Streak đã được bảo vệ và gia tăng!
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleRestart}>
            <Text style={styles.primaryBtnText}>Luyện tập lại</Text>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.progressText}>
              Câu {currentIndex + 1} / {cards.length}
            </Text>
            <TouchableOpacity
              style={styles.hintBtn}
              onPress={handleGiveHint}
            >
              <Text style={styles.hintBtnText}>💡 Gợi ý ({hintCount})</Text>
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

          {/* Prompt Box */}
          <View style={styles.promptCard}>
            <Text style={styles.promptCategory}>ĐỊNH NGHĨA TIẾNG VIỆT</Text>
            <Text style={styles.definitionText}>{currentCard?.definition}</Text>
            {currentCard?.example ? (
              <Text style={styles.exampleText}>Ví dụ: {currentCard.example}</Text>
            ) : null}
          </View>

          {/* Input Box */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>GÕ TỪ VỰNG TIẾNG TRUNG HOẶC PINYIN:</Text>
            <TextInput
              style={[
                styles.input,
                feedback && (feedback.isCorrect ? styles.inputSuccess : styles.inputError),
              ]}
              placeholder="Nhập chữ Hán hoặc Pinyin..."
              placeholderTextColor="#94A3B8"
              value={userInput}
              onChangeText={setUserInput}
              autoFocus
              editable={!feedback?.isCorrect}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {feedback && (
              <View
                style={[
                  styles.feedbackBox,
                  feedback.isCorrect ? styles.feedbackSuccess : styles.feedbackError,
                ]}
              >
                <Text style={styles.feedbackIcon}>
                  {feedback.isCorrect ? '✅' : '❌'}
                </Text>
                <Text
                  style={[
                    styles.feedbackText,
                    feedback.isCorrect ? styles.feedbackTextSuccess : styles.feedbackTextError,
                  ]}
                >
                  {feedback.message}
                </Text>
              </View>
            )}

            {!feedback?.isCorrect && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.submitBtn,
                  !userInput.trim() && styles.submitBtnDisabled,
                ]}
                disabled={!userInput.trim()}
                onPress={feedback?.isCorrect === false ? nextCard : handleSubmit}
              >
                <Text style={styles.submitBtnText}>
                  {feedback?.isCorrect === false ? 'Tiếp Tục &rarr;' : 'Kiểm Tra Đáp Án'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
  },
  headerRow: {
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
  hintBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderBottomWidth: 3,
    borderBottomColor: '#F59E0B',
  },
  hintBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 6,
  },
  promptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  promptCategory: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  definitionText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 32,
  },
  exampleText: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 10,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '700',
  },
  inputSuccess: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginTop: 14,
  },
  feedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderBottomWidth: 3,
    borderBottomColor: '#6EE7B7',
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderBottomWidth: 3,
    borderBottomColor: '#FDA4AF',
  },
  feedbackIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  feedbackTextSuccess: {
    color: '#059669',
  },
  feedbackTextError: {
    color: '#DC2626',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 16,
    borderBottomWidth: 5,
    borderBottomColor: '#312E81',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
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
    borderRadius: 24,
    padding: 22,
    width: '100%',
    justifyContent: 'space-around',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumGreen: {
    fontSize: 28,
    fontWeight: '800',
    color: '#059669',
  },
  statNumBlue: {
    fontSize: 28,
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
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderBottomWidth: 3.5,
    borderBottomColor: '#FDBA74',
    borderRadius: 18,
    padding: 14,
    marginBottom: 24,
    width: '100%',
  },
  streakNoticeIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  streakNoticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
    flex: 1,
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

