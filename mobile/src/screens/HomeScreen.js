import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { deckService } from '../services/api';
import CardItem from '../components/CardItem';
import StreakBadge from '../components/StreakBadge';

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('public'); // 'public' | 'myDecks'
  const [search, setSearch] = useState('');
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDecks = useCallback(async () => {
    try {
      if (activeTab === 'myDecks') {
        const res = await deckService.getMyDecks({ search: search.trim() });
        setDecks(res.data?.decks || []);
      } else {
        const res = await deckService.getAll({ search: search.trim() });
        setDecks(res.data?.decks || []);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách bộ thẻ:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      loadDecks();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadDecks]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      loadDecks();
      refreshUser();
    });
    return unsub;
  }, [navigation, loadDecks, refreshUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDecks(), refreshUser()]);
  };

  const handleDeckPress = (deck) => {
    navigation.navigate('DeckDetail', { deckId: deck._id, title: deck.title });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.brandGroup}>
            <View style={styles.miniLogo}>
              <Text style={styles.miniLogoText}>M</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>Memora</Text>
              <Text style={styles.welcomeText}>
                Chào, {user?.username || 'Học viên'}!
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <StreakBadge count={user?.streakCount || 0} />
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.profileBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileInitial}>
                {(user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Motivational Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroTitle}>
              {user?.streakCount > 0
                ? `Chuỗi 🔥 ${user.streakCount} Ngày Rực Rỡ!`
                : 'Bắt Đầu Chuỗi Ngày Học!'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {user?.streakCount > 0
                ? 'Hoàn thành 1 bài học hôm nay để không bị tắt lửa!'
                : 'Học ngay 1 bài để thắp sáng ngọn lửa Streak 🔥'}
            </Text>
          </View>
          <View style={styles.heroBadgeCircle}>
            <Text style={styles.heroEmoji}>{user?.streakCount > 0 ? '🔥' : '✨'}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm bộ thẻ từ vựng..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabBtn, activeTab === 'public' && styles.tabBtnActive]}
            onPress={() => setActiveTab('public')}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'public' && styles.tabBtnTextActive,
              ]}
            >
              🌟 Khám Phá Thư Viện
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabBtn, activeTab === 'myDecks' && styles.tabBtnActive]}
            onPress={() => setActiveTab('myDecks')}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'myDecks' && styles.tabBtnTextActive,
              ]}
            >
              📁 Bộ Thẻ Của Tôi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Decks List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Đang tải bộ thẻ...</Text>
          </View>
        ) : (
          <FlatList
            data={decks}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <CardItem deck={item} onPress={handleDeckPress} />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4F46E5']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>Chưa tìm thấy bộ thẻ nào</Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'myDecks'
                    ? 'Bạn chưa tạo bộ thẻ nào trên tài khoản này.'
                    : 'Hãy thử tìm kiếm với từ khóa khác.'}
                </Text>
              </View>
            }
          />
        )}

        {/* Floating Action Button for Create Deck */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.fab}
          onPress={() => navigation.navigate('CreateEditDeck')}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLogo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniLogoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  welcomeText: {
    fontSize: 12,
    color: '#64748B',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E7FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#4338CA',
    fontSize: 14,
    fontWeight: '700',
  },
  heroBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderBottomWidth: 3.5,
    borderColor: '#C7D2FE',
    borderBottomColor: '#818CF8',
  },
  heroLeft: {
    flex: 1,
    paddingRight: 12,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#312E81',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#4F46E5',
    lineHeight: 16,
    fontWeight: '600',
  },
  heroBadgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroEmoji: {
    fontSize: 24,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  searchClear: {
    color: '#94A3B8',
    fontSize: 14,
    padding: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: '#E2E8F0',
    borderBottomColor: '#CBD5E1',
  },
  tabBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderBottomColor: '#6366F1',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -3,
  },
});

