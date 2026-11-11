import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiService } from '../services/api';

export default function ImageScanModal({ visible, onClose, onImport }) {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('upload'); // 'upload' | 'review'
  const [scannedCards, setScannedCards] = useState([]);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('memora_gemini_key').then((val) => {
        if (val) setApiKey(val);
      });
    } else {
      setImageUri(null);
      setImageBase64(null);
      setScannedCards([]);
      setStep('upload');
      setLoading(false);
    }
  }, [visible]);

  // Chọn ảnh từ thư viện
  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tiếp tục.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64);
      }
    } catch (e) {
      console.warn('Lỗi chọn ảnh:', e);
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  // Chụp ảnh từ Camera
  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền sử dụng camera để chụp ảnh sách.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64);
      }
    } catch (e) {
      console.warn('Lỗi chụp ảnh:', e);
      Alert.alert('Lỗi', 'Không thể mở camera.');
    }
  };

  const handleScan = async () => {
    if (!imageBase64) {
      Alert.alert('Thông báo', 'Vui lòng chụp ảnh hoặc chọn ảnh sách từ thư viện.');
      return;
    }

    try {
      setLoading(true);

      if (apiKey.trim()) {
        await AsyncStorage.setItem('memora_gemini_key', apiKey.trim());
      }

      const res = await aiService.scanImage({
        imageBase64: imageBase64,
        mimeType: 'image/jpeg',
        apiKey: apiKey.trim() || undefined,
      });

      const cards = res.data?.cards || [];
      if (cards.length === 0) {
        Alert.alert('Thông báo', 'Không nhận diện được từ vựng nào. Hãy thử chụp gần và rõ nét hơn.');
        return;
      }

      setScannedCards(cards);
      setStep('review');
    } catch (err) {
      console.error('Lỗi scan:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể quét ảnh. Vui lòng kiểm tra lại kết nối mạng hoặc Gemini API Key.';
      Alert.alert('Lỗi quét ảnh AI', msg);
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

  const handleAddCard = () => {
    setScannedCards([...scannedCards, { term: '', pinyin: '', definition: '', hint: '', imageUrl: '' }]);
  };

  const handleConfirm = () => {
    const valid = scannedCards.filter((c) => c.term.trim() || c.definition.trim());
    if (valid.length === 0) {
      Alert.alert('Thông báo', 'Danh sách từ vựng đang trống.');
      return;
    }
    onImport(valid);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>📷 Quét từ vựng bằng AI</Text>
            <Text style={styles.headerSub}>Google Gemini 1.5 Flash Vision</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'upload' ? (
            <View style={styles.uploadSection}>
              {/* Image Preview or Placeholder */}
              {imageUri ? (
                <View style={styles.previewCard}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                  <Text style={styles.previewTip}>✓ Đã chọn ảnh thành công</Text>
                </View>
              ) : (
                <View style={styles.placeholderCard}>
                  <Text style={styles.placeholderEmoji}>📖</Text>
                  <Text style={styles.placeholderTitle}>Chụp ảnh trang sách từ vựng</Text>
                  <Text style={styles.placeholderDesc}>
                    AI sẽ tự động đọc chữ Hán, Pinyin thanh điệu và nghĩa tiếng Việt
                  </Text>
                </View>
              )}

              {/* Action Buttons: Camera & Gallery */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.btnAction, styles.btnCamera]}
                  onPress={takePhotoWithCamera}
                >
                  <Text style={styles.btnActionIcon}>📸</Text>
                  <Text style={styles.btnActionText}>Chụp ảnh mới</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.btnAction, styles.btnGallery]}
                  onPress={pickImageFromGallery}
                >
                  <Text style={styles.btnActionIcon}>🖼️</Text>
                  <Text style={styles.btnActionText}>Chọn từ thư viện</Text>
                </TouchableOpacity>
              </View>

              {/* Gemini API Key Setting Toggle */}
              <View style={styles.keyBox}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowKeyInput(!showKeyInput)}
                  style={styles.keyToggle}
                >
                  <Text style={styles.keyToggleText}>
                    🔑 Cấu hình Gemini API Key (Tùy chọn) {showKeyInput ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {showKeyInput && (
                  <View style={styles.keyInputWrapper}>
                    <TextInput
                      style={styles.keyInput}
                      placeholder="Dán mã Gemini API Key vào đây..."
                      placeholderTextColor="#94A3B8"
                      value={apiKey}
                      onChangeText={setApiKey}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    <Text style={styles.keyHelpText}>
                      Nhận key miễn phí 100% tại aistudio.google.com. Key sẽ được lưu trên máy của bạn.
                    </Text>
                  </View>
                )}
              </View>

              {/* Scan Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.btnScan, (!imageBase64 || loading) && styles.btnDisabled]}
                onPress={handleScan}
                disabled={!imageBase64 || loading}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.btnScanText}>AI đang phân tích từ vựng...</Text>
                  </View>
                ) : (
                  <Text style={styles.btnScanText}>✨ Bắt Đầu Quét Từ Vựng</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Step 2: Review */
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>
                  🎉 Tìm thấy {scannedCards.length} từ vựng
                </Text>
                <TouchableOpacity onPress={() => setStep('upload')}>
                  <Text style={styles.reScanText}>🔄 Quét ảnh khác</Text>
                </TouchableOpacity>
              </View>

              {scannedCards.map((card, idx) => (
                <View key={idx} style={styles.cardItem}>
                  <View style={styles.cardItemTop}>
                    <Text style={styles.cardIndex}>#{idx + 1}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCard(idx)}>
                      <Text style={styles.deleteText}>✕ Xóa</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={styles.colHalf}>
                      <Text style={styles.inputLabel}>Chữ Hán / Thuật ngữ</Text>
                      <TextInput
                        style={styles.inputMini}
                        value={card.term}
                        onChangeText={(v) => handleCardChange(idx, 'term', v)}
                        placeholder="Từ vựng..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={styles.colHalf}>
                      <Text style={styles.inputLabel}>Pinyin (phiên âm)</Text>
                      <TextInput
                        style={styles.inputMini}
                        value={card.pinyin}
                        onChangeText={(v) => handleCardChange(idx, 'pinyin', v)}
                        placeholder="Pinyin..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={styles.rowFull}>
                    <Text style={styles.inputLabel}>Định nghĩa tiếng Việt</Text>
                    <TextInput
                      style={styles.inputMini}
                      value={card.definition}
                      onChangeText={(v) => handleCardChange(idx, 'definition', v)}
                      placeholder="Nghĩa của từ..."
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity activeOpacity={0.7} style={styles.btnAddRow} onPress={handleAddCard}>
                <Text style={styles.btnAddRowText}>+ Thêm 1 thẻ mới</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        {step === 'review' && (
          <View style={styles.footer}>
            <TouchableOpacity activeOpacity={0.8} style={styles.btnConfirm} onPress={handleConfirm}>
              <Text style={styles.btnConfirmText}>
                ✓ Thêm {scannedCards.length} thẻ vào bộ bài học
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  uploadSection: {
    gap: 16,
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C7D2FE',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  placeholderDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  previewTip: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderBottomWidth: 3.5,
  },
  btnCamera: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderBottomColor: '#6366F1',
  },
  btnGallery: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderBottomColor: '#22C55E',
  },
  btnActionIcon: {
    fontSize: 18,
  },
  btnActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  keyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  keyToggle: {
    paddingVertical: 2,
  },
  keyToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  keyInputWrapper: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  keyInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1E293B',
  },
  keyHelpText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 15,
  },
  btnScan: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#3730A3',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnScanText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  reviewSection: {
    gap: 12,
    paddingBottom: 20,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  reScanText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  cardItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  rowFull: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputMini: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  btnAddRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C7D2FE',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnAddRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btnConfirm: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#059669',
  },
  btnConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
