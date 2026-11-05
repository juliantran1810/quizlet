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
    title: 'Từ Vựng IELTS Chủ Đề Environment (Môi Trường)',
    description: 'Bộ từ vựng học thuật quan trọng bậc nhất cho bài thi IELTS Writing & Speaking Task 2',
    category: 'Tiếng Anh',
    isPublic: true,
    cards: [
      {
        term: 'Biodegradable',
        definition: 'Có thể bị vi khuẩn phân hủy tự nhiên mà không gây hại cho môi trường',
        hint: 'Bắt đầu bằng Bio...',
      },
      {
        term: 'Carbon Footprint',
        definition: 'Lượng khí nhà kính phát thải trực tiếp hoặc gián tiếp từ hoạt động con người',
        hint: 'Dấu chân...',
      },
      {
        term: 'Deforestation',
        definition: 'Hành động chặt phá rừng trên diện rộng',
        hint: 'Phá rừng...',
      },
      {
        term: 'Renewable Energy',
        definition: 'Năng lượng tái tạo từ các nguồn tự nhiên vô tận như gió, mặt trời',
        hint: 'Năng lượng sạch...',
      },
      {
        term: 'Ecosystem',
        definition: 'Hệ sinh thái gồm quần xã sinh vật và môi trường sống của chúng',
        hint: 'Hệ...',
      },
    ],
  },
  {
    title: 'Thuật Ngữ Công Nghệ Web & Lập Trình Cơ Bản',
    description: 'Các thuật ngữ lập trình cốt lõi dành cho Full-stack Developers',
    category: 'Công nghệ',
    isPublic: true,
    cards: [
      {
        term: 'RESTful API',
        definition: 'Kiến trúc giao tiếp client-server sử dụng các phương thức HTTP chuẩn (GET, POST, PUT, DELETE)',
        hint: 'Chuẩn API phổ biến nhất...',
      },
      {
        term: 'JWT (JSON Web Token)',
        definition: 'Chuẩn mã hóa thông tin an toàn dạng chuỗi JSON dùng để xác thực người dùng không lưu state',
        hint: 'Gồm Header, Payload, Signature...',
      },
      {
        term: 'Virtual DOM',
        definition: 'Bản sao ảo siêu nhẹ của DOM thật trong bộ nhớ được React dùng để tối ưu hiệu năng render',
        hint: 'Cơ chế cốt lõi của React...',
      },
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
