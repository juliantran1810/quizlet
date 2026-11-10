import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { speakChinese } from '../utils/speech';

export default function DeckDetailScreen({ route, navigation }) {
  const { deckId } = route.params;
  const { user } = useAuth();
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);

  const fetchDeckAndProgress = async () => {
    try {
      const [deckRes, progRes] = await Promise.all([
        deckService.getById(deckId),
        progressService.get(deckId).catch(() => ({ data: null })),
      ]);
      setDeck(deckRes.data?.deck || null);

      if (progRes.data?.progress?.cards) {
        const now = new Date();
        const due = progRes.data.progress.cards.filter(
          (c) => c.nextReviewAt && new Date(c.nextReviewAt) <= now
        ).length;
        setDueCount(due);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải thông tin bộ thẻ.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeckAndProgress();
    const unsub = navigation.addListener('focus', fetchDeckAndProgress);
    return unsub;
  }, [deckId, navigation]);

  const isOwner =
    user && deck?.owner && (user._id === deck.owner._id || user._id === deck.owner);

  const handleDeleteDeck = () => {
    Alert.alert(
      'Xác nhận xóa bộ thẻ',
      `Bạn có chắc chắn muốn xóa bộ thẻ "${deck?.title}"? Thao tác này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await deckService.delete(deckId);
              Alert.alert('Thành công', 'Đã xóa bộ thẻ!');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xóa bộ thẻ.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Đang tải chi tiết bộ thẻ...</Text>
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy bộ thẻ</Text>
      </View>
    );
  }

  const cards = deck.cards || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Deck Info Banner */}
      <View style={styles.banner}>
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{deck.category || 'Chung'}</Text>
          </View>
          <Text style={styles.cardCountText}>{cards.length} thẻ từ</Text>
        </View>

        <Text style={styles.deckTitle}>{deck.title}</Text>
        {deck.description ? (
          <Text style={styles.deckDesc}>{deck.description}</Text>
        ) : null}

        <View style={styles.bannerFooter}>
          <Text style={styles.authorText}>
            Tạo bởi: {deck.owner?.username || 'Ẩn danh'}
          </Text>

          {dueCount > 0 && (
            <View style={styles.dueBadge}>
              <Text style={styles.dueBadgeText}>⏰ {dueCount} thẻ đến hạn (Leitner)</Text>
            </View>
          )}
        </View>

        {/* Owner Controls */}
        {isOwner && (
          <View style={styles.ownerActionsRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('CreateEditDeck', { deckId: deck._id })}
            >
              <Text style={styles.editBtnText}>✏️ Chỉnh sửa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteDeck}>
              <Text style={styles.deleteBtnText}>🗑️ Xóa bộ thẻ</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Mode Buttons */}
      <Text style={styles.sectionHeader}>4 CHẾ ĐỘ HỌC TẬP THÔNG MINH</Text>

      {/* Mode 1: Flashcards */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.modeCardPrimary}
        onPress={() => navigation.navigate('Flashcard', { deckId: deck._id, title: deck.title })}
      >
        <View style={styles.modeIconCircle}>
          <Text style={styles.modeEmoji}>🎴</Text>
        </View>
        <View style={styles.modeTextCol}>
          <Text style={styles.modeTitlePrimary}>Chế Độ Thẻ Lật (Flashcards)</Text>
          <Text style={styles.modeSubtitlePrimary}>
            Chạm để lật thẻ, nghe phát âm và ôn tập ghi nhớ
          </Text>
        </View>
      </TouchableOpacity>

      {/* Mode 2: Learn / Write Mode */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.modeCardSecondary}
        onPress={() => navigation.navigate('LearnMode', { deckId: deck._id, title: deck.title })}
      >
        <View style={[styles.modeIconCircle, { backgroundColor: '#EDE9FE' }]}>
          <Text style={styles.modeEmoji}>✍️</Text>
        </View>
        <View style={styles.modeTextCol}>
          <Text style={styles.modeTitleSecondary}>Chế Độ Gõ Từ (Learn Mode)</Text>
          <Text style={styles.modeSubtitleSecondary}>
            Active Recall: Gõ từ vựng, gợi ý chữ cái 💡 và tính Streak 🔥
          </Text>
        </View>
      </TouchableOpacity>

      {/* Mode 3: Quiz Mode */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.modeCardSecondary, { borderColor: '#A7F3D0' }]}
        onPress={() => navigation.navigate('QuizMode', { deckId: deck._id, title: deck.title })}
      >
        <View style={[styles.modeIconCircle, { backgroundColor: '#D1FAE5' }]}>
          <Text style={styles.modeEmoji}>🎯</Text>
        </View>
        <View style={styles.modeTextCol}>
          <Text style={[styles.modeTitleSecondary, { color: '#047857' }]}>
            Chế Độ Trắc Nghiệm (Quiz Mode)
          </Text>
          <Text style={styles.modeSubtitleSecondary}>
            Thử thách 4 lựa chọn, phản hồi tức thì và xếp hạng độ chính xác
          </Text>
        </View>
      </TouchableOpacity>

      {/* Mode 4: Match Game */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.modeCardSecondary, { borderColor: '#FED7AA', marginBottom: 24 }]}
        onPress={() => navigation.navigate('MatchGame', { deckId: deck._id, title: deck.title })}
      >
        <View style={[styles.modeIconCircle, { backgroundColor: '#FFEDD5' }]}>
          <Text style={styles.modeEmoji}>🧩</Text>
        </View>
        <View style={styles.modeTextCol}>
          <Text style={[styles.modeTitleSecondary, { color: '#C2410C' }]}>
            Mini Game Ghép Từ (Match Game)
          </Text>
          <Text style={styles.modeSubtitleSecondary}>
            Ghép đôi từ vựng & định nghĩa, đồng hồ đếm giây phản xạ nhanh
          </Text>
        </View>
      </TouchableOpacity>

      {/* Cards List Preview */}
      <View style={styles.cardsHeaderRow}>
        <Text style={styles.sectionHeader}>DANH SÁCH THẺ ({cards.length})</Text>
      </View>

      {cards.map((c, idx) => (
        <View key={c._id || idx} style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTerm}>{c.term}</Text>
            {c.pinyin ? <Text style={styles.cardPinyin}>{c.pinyin}</Text> : null}
            <Text style={styles.cardDef}>{c.definition}</Text>
          </View>
          <TouchableOpacity
            style={styles.audioBtn}
            onPress={() => speakChinese(c.term)}
          >
            <Text style={styles.audioIcon}>🔊</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  cardCountText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  deckTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  deckDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  bannerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  authorText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  dueBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  ownerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editBtnText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  deleteBtnText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  modeCardPrimary: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderBottomWidth: 5,
    borderColor: '#4338CA',
    borderBottomColor: '#312E81',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  modeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  modeEmoji: {
    fontSize: 26,
  },
  modeTextCol: {
    flex: 1,
  },
  modeTitlePrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  modeSubtitlePrimary: {
    fontSize: 12,
    color: '#E0E7FF',
    lineHeight: 16,
    fontWeight: '600',
  },
  modeCardSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderBottomWidth: 4.5,
    borderColor: '#E2E8F0',
    borderBottomColor: '#CBD5E1',
  },
  modeTitleSecondary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4338CA',
    marginBottom: 3,
  },
  modeSubtitleSecondary: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '500',
  },
  cardsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  cardTerm: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardPinyin: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 2,
  },
  cardDef: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  audioBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioIcon: {
    fontSize: 16,
  },
});

