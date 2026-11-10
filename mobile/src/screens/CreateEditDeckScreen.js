import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { deckService } from '../services/api';

const CATEGORIES = ['Tiếng Trung', 'Tiếng Anh', 'HSK', 'Công nghệ', 'Y Dược', 'Chung'];

export default function CreateEditDeckScreen({ route, navigation }) {
  const deckId = route.params?.deckId;
  const isEditing = !!deckId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tiếng Trung');
  const [isPublic, setIsPublic] = useState(true);
  const [cards, setCards] = useState([
    { term: '', pinyin: '', definition: '', example: '' },
    { term: '', pinyin: '', definition: '', example: '' },
  ]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing) return;

    async function loadDeck() {
      try {
        const res = await deckService.getById(deckId);
        const d = res.data?.deck;
        if (d) {
          setTitle(d.title || '');
          setDescription(d.description || '');
          setCategory(d.category || 'Tiếng Trung');
          setIsPublic(d.isPublic ?? true);
          if (d.cards && d.cards.length > 0) {
            setCards(
              d.cards.map((c) => ({
                term: c.term || '',
                pinyin: c.pinyin || '',
                definition: c.definition || '',
                example: c.example || '',
              }))
            );
          }
        }
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể tải dữ liệu bộ thẻ.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    loadDeck();
  }, [deckId, isEditing, navigation]);

  const handleCardChange = (index, field, value) => {
    setCards((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddCard = () => {
    setCards((prev) => [...prev, { term: '', pinyin: '', definition: '', example: '' }]);
  };

  const handleDeleteCard = (index) => {
    if (cards.length <= 2) {
      Alert.alert('Thông báo', 'Bộ thẻ cần tối thiểu 2 thẻ từ vựng.');
      return;
    }
    setCards((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề cho bộ thẻ.');
      return;
    }

    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (validCards.length < 2) {
      Alert.alert('Thông báo', 'Vui lòng nhập tối thiểu 2 thẻ có đầy đủ Thuật ngữ và Định nghĩa.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      isPublic,
      cards: validCards,
    };

    try {
      setSubmitting(true);
      if (isEditing) {
        await deckService.update(deckId, payload);
        Alert.alert('Thành công', 'Đã cập nhật bộ thẻ!');
      } else {
        await deckService.create(payload);
        Alert.alert('Thành công', 'Đã tạo bộ thẻ mới thành công!');
      }
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể lưu bộ thẻ. Vui lòng thử lại.';
      Alert.alert('Lỗi lưu bộ thẻ', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Đang tải dữ liệu bộ thẻ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Deck Info Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isEditing ? 'Chỉnh Sửa Bộ Thẻ' : 'Thông Tin Bộ Thẻ'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Tiêu đề bộ thẻ *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Từ vựng HSK 3 bài 1..."
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mô tả (Tùy chọn)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mô tả nội dung hoặc mục tiêu của bộ thẻ..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Chuyên mục</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pill, category === cat && styles.pillActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Chế độ công khai</Text>
                <Text style={styles.switchDesc}>Mọi người đều có thể tìm và học bộ thẻ này</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
                thumbColor={isPublic ? '#4F46E5' : '#F1F5F9'}
              />
            </View>
          </View>

          {/* Cards List Header */}
          <View style={styles.cardsHeaderRow}>
            <Text style={styles.sectionTitle}>
              Danh Sách Thẻ Từ Vựng ({cards.length})
            </Text>
            <TouchableOpacity style={styles.addCardTopBtn} onPress={handleAddCard}>
              <Text style={styles.addCardTopBtnText}>+ Thêm thẻ</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Cards */}
          {cards.map((c, idx) => (
            <View key={idx} style={styles.flashcardItem}>
              <View style={styles.cardItemHeader}>
                <View style={styles.cardItemIndexBadge}>
                  <Text style={styles.cardItemIndexText}>Thẻ {idx + 1}</Text>
                </View>
                {cards.length > 2 && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCard(idx)}
                    style={styles.deleteCardBtn}
                  >
                    <Text style={styles.deleteCardText}>🗑️ Xóa</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardInputsRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.labelSmall}>Thuật ngữ / Chữ Hán *</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="VD: 谢谢"
                    placeholderTextColor="#94A3B8"
                    value={c.term}
                    onChangeText={(v) => handleCardChange(idx, 'term', v)}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.labelSmall}>Pinyin / Phiên âm</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="VD: xièxie"
                    placeholderTextColor="#94A3B8"
                    value={c.pinyin}
                    onChangeText={(v) => handleCardChange(idx, 'pinyin', v)}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSmall}>Định nghĩa / Nghĩa tiếng Việt *</Text>
                <TextInput
                  style={styles.inputSmall}
                  placeholder="VD: Cảm ơn"
                  placeholderTextColor="#94A3B8"
                  value={c.definition}
                  onChangeText={(v) => handleCardChange(idx, 'definition', v)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSmall}>Câu ví dụ (Tùy chọn)</Text>
                <TextInput
                  style={styles.inputSmall}
                  placeholder="VD: 谢谢你的帮助！"
                  placeholderTextColor="#94A3B8"
                  value={c.example}
                  onChangeText={(v) => handleCardChange(idx, 'example', v)}
                />
              </View>
            </View>
          ))}

          {/* Add More Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.addMoreBtn}
            onPress={handleAddCard}
          >
            <Text style={styles.addMoreBtnText}>+ Thêm Một Thẻ Từ Mới</Text>
          </TouchableOpacity>

          {/* Save Action */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
            disabled={submitting}
            onPress={handleSave}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Lưu Thay Đổi' : 'Tạo Bộ Thẻ Mới'}
              </Text>
            )}
          </TouchableOpacity>
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
    fontSize: 14,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  inputSmall: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  pillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
    borderBottomColor: '#4338CA',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  switchDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  addCardTopBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  addCardTopBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },
  flashcardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
  },
  cardItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardItemIndexBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  cardItemIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  deleteCardBtn: {
    padding: 4,
  },
  deleteCardText: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '700',
  },
  cardInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addMoreBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#A5B4FC',
    borderBottomWidth: 4,
    borderBottomColor: '#818CF8',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  addMoreBtnText: {
    color: '#4F46E5',
    fontSize: 15,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 18,
    borderBottomWidth: 5,
    borderBottomColor: '#312E81',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

