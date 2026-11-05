import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import User from './models/User.js';
import Deck from './models/Deck.js';
import UserProgress from './models/UserProgress.js';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Bỏ qua nếu môi trường không cho phép
}

const sampleDecks = [
  {
    title: '汉语基础词汇 - Tiếng Trung Cho Người Mới Bắt Đầu',
    description: 'Bộ từ vựng tiếng Trung cơ bản nhất với chữ Hán, Pinyin và nghĩa tiếng Việt. Bao gồm animation thứ tự nét bút.',
    category: 'Tiếng Trung',
    isPublic: true,
    cards: [
      { term: '爱', pinyin: 'ài', definition: 'Yêu, yêu thương', hint: 'Thanh 4 (nặng)' },
      { term: '你好', pinyin: 'nǐ hǎo', definition: 'Xin chào', hint: 'Chào hỏi cơ bản nhất' },
      { term: '谢谢', pinyin: 'xiè xiè', definition: 'Cảm ơn', hint: 'Lặp lại 2 lần' },
      { term: '对不起', pinyin: 'duì bu qǐ', definition: 'Xin lỗi', hint: '3 chữ Hán' },
      { term: '中文', pinyin: 'zhōng wén', definition: 'Tiếng Trung (ngôn ngữ)', hint: 'Trung = Trung Quốc' },
      { term: '学习', pinyin: 'xué xí', definition: 'Học tập', hint: 'Thanh 2 rồi Thanh 2' },
      { term: '朋友', pinyin: 'péng yǒu', definition: 'Bạn bè', hint: 'Phát âm pong-yo' },
      { term: '家', pinyin: 'jiā', definition: 'Nhà, gia đình', hint: 'Thanh 1 (bằng)' },
    ],
  },
  {
    title: 'Từ Vựng IELTS Chủ Đề Environment (Môi Trường)',
    description: 'Bộ từ vựng học thuật quan trọng bậc nhất cho bài thi IELTS Writing & Speaking Task 2',
    category: 'Tiếng Anh',
    isPublic: true,
    cards: [
      { term: 'Biodegradable', pinyin: '', definition: 'Có thể bị vi khuẩn phân hủy tự nhiên mà không gây hại cho môi trường', hint: 'Bắt đầu bằng Bio...' },
      { term: 'Carbon Footprint', pinyin: '', definition: 'Lượng khí nhà kính phát thải trực tiếp hoặc gián tiếp từ hoạt động con người', hint: 'Dấu chân...' },
      { term: 'Deforestation', pinyin: '', definition: 'Hành động chặt phá rừng trên diện rộng', hint: 'Phá rừng...' },
      { term: 'Renewable Energy', pinyin: '', definition: 'Năng lượng tái tạo từ các nguồn tự nhiên vô tận như gió, mặt trời', hint: 'Năng lượng sạch...' },
      { term: 'Ecosystem', pinyin: '', definition: 'Hệ sinh thái gồm quần xã sinh vật và môi trường sống của chúng', hint: 'Hệ...' },
    ],
  },
  {
    title: 'Thuật Ngữ Công Nghệ Web & Lập Trình Cơ Bản',
    description: 'Các thuật ngữ lập trình cốt lõi dành cho Full-stack Developers',
    category: 'Công nghệ',
    isPublic: true,
    cards: [
      { term: 'RESTful API', pinyin: '', definition: 'Kiến trúc giao tiếp client-server sử dụng các phương thức HTTP chuẩn (GET, POST, PUT, DELETE)', hint: 'Chuẩn API phổ biến nhất...' },
      { term: 'JWT (JSON Web Token)', pinyin: '', definition: 'Chuẩn mã hóa thông tin an toàn dạng chuỗi JSON dùng để xác thực người dùng không lưu state', hint: 'Gồm Header, Payload, Signature...' },
      { term: 'Virtual DOM', pinyin: '', definition: 'Bản sao ảo siêu nhẹ của DOM thật trong bộ nhớ được React dùng để tối ưu hiệu năng render', hint: 'Cơ chế cốt lõi của React...' },
      {
        term: 'Mongoose ODM',
        definition: 'Thư viện Node.js mô hình hóa dữ liệu (Object Data Modeling) cho MongoDB',
        hint: 'Schema & Model...',
      },
      {
        term: 'Tailwind CSS',
        definition: 'Utility-first CSS framework giúp thiết kế giao diện nhanh chóng bằng class dựng sẵn',
        hint: 'Class tiện ích...',
      },
    ],
  },
];

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizlet_db';
    await mongoose.connect(mongoUri);
    console.log('[Seeder] Đã kết nối MongoDB thành công');

    // Xóa dữ liệu cũ
    await User.deleteMany();
    await Deck.deleteMany();
    await UserProgress.deleteMany();

    // Tạo user mẫu
    const demoUser = await User.create({
      username: 'demo_teacher',
      email: 'demo@quizlet.com',
      password: 'password123',
    });

    console.log(`[Seeder] Đã tạo User mẫu: ${demoUser.email} (Mật khẩu: password123)`);

    // Gán author cho các bộ thẻ và lưu
    const decksWithAuthor = sampleDecks.map((d) => ({
      ...d,
      author: demoUser._id,
    }));

    await Deck.insertMany(decksWithAuthor);
    console.log(`[Seeder] Đã nạp thành công ${decksWithAuthor.length} bộ thẻ mẫu!`);

    process.exit(0);
  } catch (error) {
    console.error(`[Seeder] Lỗi khi nạp dữ liệu: ${error.message}`);
    process.exit(1);
  }
};

seedData();
