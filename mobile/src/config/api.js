import { Platform } from 'react-native';

// Thay đổi IP này theo IP mạng Wi-Fi của máy chủ (xem bằng ipconfig trên Windows)
// Trên máy ảo Android emulator: dùng 10.0.2.2:5000
// Trên thiết bị thật cùng mạng Wi-Fi: dùng 192.168.1.161:5000
const DEV_MACHINE_IP = '192.168.1.161';
const PORT = '5000';

export const API_BASE_URL = Platform.select({
  android: `http://${DEV_MACHINE_IP}:${PORT}/api`,
  ios: `http://${DEV_MACHINE_IP}:${PORT}/api`,
  default: `http://${DEV_MACHINE_IP}:${PORT}/api`,
});

export default {
  API_BASE_URL,
};

