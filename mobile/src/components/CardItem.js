import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const CATEGORY_COLORS = {
  'Tiếng Trung': { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' },
  'Tiếng Anh': { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' },
  'HSK': { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  'Công nghệ': { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  'Y Dược': { bg: '#FFE4E6', text: '#BE123C', border: '#FECDD3' },
  default: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
};

export default function CardItem({ deck, onPress }) {
  const cardCount = deck.cards?.length || 0;
  const authorName = deck.owner?.username || 'Ẩn danh';
  const authorAvatar = deck.owner?.avatar;
  const cleanCat = deck.category ? deck.category.replace(/[\p{Emoji}\p{Extended_Pictographic}\s]+/gu, ' ').trim() : '';
  const categoryTheme = CATEGORY_COLORS[cleanCat] || CATEGORY_COLORS[deck.category] || CATEGORY_COLORS.default;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => onPress && onPress(deck)}
    >
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: categoryTheme.bg, borderColor: categoryTheme.border }]}>
          <Text style={[styles.badgeText, { color: categoryTheme.text }]}>
            {deck.category || 'Chung'}
          </Text>
        </View>

        <View style={styles.cardCountPill}>
          <Text style={styles.cardCountText}>📖 {cardCount} thẻ</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {deck.title}
      </Text>

      {deck.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {deck.description}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.authorBadge}>
          {authorAvatar ? (
            <Image source={{ uri: authorAvatar }} style={styles.authorImg} />
          ) : (
            <Text style={styles.authorInitial}>
              {authorName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.authorText} numberOfLines={1}>
          {authorName}
        </Text>
        <Text style={styles.learnArrow}>Học ngay &rarr;</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderColor: '#E2E8F0',
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardCountPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardCountText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 23,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  authorBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  authorImg: {
    width: 24,
    height: 24,
  },
  authorInitial: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  authorText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  learnArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
});

