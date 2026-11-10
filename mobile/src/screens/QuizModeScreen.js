import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { speakChinese } from '../utils/speech';

export default function QuizModeScreen({ route, navigation }) {
  const { deckId, title } = route.params;
  const { updateStreak } = useAuth();

  const [cards, setCards] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [missedCards, setMissedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const res = await deckService.getById(deckId);
        const fetchedCards = res.data?.deck?.cards || [];
        setCards(fetchedCards);

        if (fetchedCards.length >= 2) {
          // Xáo trộn và sinh câu hỏi trắc nghiệm
          const generated = fetchedCards.map((card) => {
            const otherCards = fetchedCards.filter((c) => c._id !== card._id);
            const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
            const distractors = shuffledOthers.slice(0, 3).map((c) => c.term);
            const allOptions = [...distractors, card.term].sort(() => 0.5 - Math.random());
            return {
              card,
              question: card.definition,
              correctAnswer: card.term,
              options: allOptions,
            };
          }).sort(() => 0.5 - Math.random());

          setQuestions(generated);
        }
      } catch (err) {
        console.warn('Lỗi tải bài trắc nghiệm:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [deckId]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = async (option) => {
    if (isAnswered || !currentQ) return;

    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQ.correctAnswer;

    if (isCorrect) {
      setScore((s) => s + 1);
      speakChinese(currentQ.card.term);
    } else {
      setMissedCards((prev) => [...prev, currentQ.card]);
      speakChinese(currentQ.card.term);
    }

    // Gửi tiến độ lên backend
    try {
      const res = await progressService.update(deckId, {
        cardId: currentQ.card._id,
        isCorrect,
      });
      if (res.data?.userStreak) {
        updateStreak(res.data.userStreak);
      }
    } catch (e) {
      // ignore
    }

    // Tự động chuyển câu tiếp theo sau 1.2s
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        setFinished(true);
      }
    }, 1200);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setMissedCards([]);
    setFinished(false);
    setQuestions((prev) => [...prev].sort(() => 0.5 - Math.random()));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Đang chuẩn bị đề thi trắc nghiệm...</Text>
      </View>
    );
  }

  if (cards.length < 2) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Bộ thẻ cần tối thiểu 2 thẻ để tạo câu hỏi trắc nghiệm.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished) {
    const total = questions.length;
    const accuracy = Math.round((score / total) * 100);

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.summaryContainer}>
          <Text style={styles.summaryEmoji}>🎯</Text>
          <Text style={styles.summaryTitle}>Kết Quả Trắc Nghiệm</Text>
          <Text style={styles.summaryDeck}>{title}</Text>

          <View style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNumGreen}>{score}</Text>
                <Text style={styles.scoreLabel}>Đúng</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNumRed}>{total - score}</Text>
                <Text style={styles.scoreLabel}>Sai</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNumBlue}>{accuracy}%</Text>
                <Text style={styles.scoreLabel}>Độ chính xác</Text>
              </View>
            </View>
          </View>

          {/* Missed Cards Section */}
          {missedCards.length > 0 && (
            <View style={styles.missedSection}>
              <Text style={styles.missedSectionTitle}>
                CẦN ÔN LẠI ({missedCards.length} câu sai)
              </Text>
              {missedCards.map((c, idx) => (
                <View key={idx} style={styles.missedItem}>
                  <View style={styles.missedItemLeft}>
                    <Text style={styles.missedTerm}>{c.term}</Text>
                    {c.pinyin ? <Text style={styles.missedPinyin}>{c.pinyin}</Text> : null}
                    <Text style={styles.missedDef}>{c.definition}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.soundSmallBtn}
                    onPress={() => speakChinese(c.term)}
                  >
                    <Text style={styles.soundSmallIcon}>🔊</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleRestart}>
            <Text style={styles.primaryBtnText}>Làm lại đề thi trắc nghiệm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Trở về trang chi tiết</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Progress Header */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Câu {currentIndex + 1} / {questions.length}
          </Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeText}>Đúng: {score}</Text>
          </View>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIndex + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>CHỌN TỪ TIẾNG TRUNG PHÙ HỢP NGHĨA:</Text>
          <Text style={styles.questionText}>{currentQ.question}</Text>
        </View>

        {/* 4 Choices */}
        <View style={styles.optionsList}>
          {currentQ.options.map((option, idx) => {
            const isCorrect = option === currentQ.correctAnswer;
            const isChosen = option === selectedOption;

            let btnStyle = styles.optionBtn;
            let textStyle = styles.optionText;

            if (isAnswered) {
              if (isCorrect) {
                btnStyle = [styles.optionBtn, styles.optionCorrect];
                textStyle = [styles.optionText, styles.optionTextCorrect];
              } else if (isChosen) {
                btnStyle = [styles.optionBtn, styles.optionWrong];
                textStyle = [styles.optionText, styles.optionTextWrong];
              }
            }

            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.8}
                disabled={isAnswered}
                style={btnStyle}
                onPress={() => handleSelectOption(option)}
              >
                <View style={styles.optionLetterBadge}>
                  <Text style={styles.optionLetterText}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={textStyle}>{option}</Text>
              </TouchableOpacity>
            );
          })}
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
  scoreBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderBottomWidth: 3,
    borderBottomColor: '#6EE7B7',
  },
  scoreBadgeText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
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
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
    minHeight: 140,
    justifyContent: 'center',
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 32,
  },
  optionsList: {
    gap: 12,
    marginBottom: 20,
  },
  optionBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderBottomWidth: 5,
    borderBottomColor: '#059669',
  },
  optionWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderBottomWidth: 5,
    borderBottomColor: '#B91C1C',
  },
  optionLetterBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  optionTextCorrect: {
    color: '#059669',
  },
  optionTextWrong: {
    color: '#DC2626',
  },
  // Summary Styles
  summaryContainer: {
    padding: 20,
    alignItems: 'center',
  },
  summaryEmoji: {
    fontSize: 54,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  summaryDeck: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  scoreBox: {
    alignItems: 'center',
  },
  scoreNumGreen: {
    fontSize: 28,
    fontWeight: '800',
    color: '#059669',
  },
  scoreNumRed: {
    fontSize: 28,
    fontWeight: '800',
    color: '#E11D48',
  },
  scoreNumBlue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4F46E5',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
  },
  missedSection: {
    width: '100%',
    marginBottom: 20,
  },
  missedSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  missedItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderBottomWidth: 3.5,
    borderBottomColor: '#FDA4AF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missedItemLeft: {
    flex: 1,
    paddingRight: 10,
  },
  missedTerm: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  missedPinyin: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '700',
    marginTop: 2,
  },
  missedDef: {
    fontSize: 14,
    color: '#475569',
    marginTop: 3,
    fontWeight: '500',
  },
  soundSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundSmallIcon: {
    fontSize: 16,
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

