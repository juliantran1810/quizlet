/**
 * Script tạo tài khoản Admin đầu tiên
 * 
 * Chạy: node src/createAdmin.js
 * 
 * Lưu ý: Chạy 1 lần để tạo admin, sau đó có thể cấp admin cho các user khác
 * qua Admin Workbench (/admin → tab Người dùng → icon Shield)
 */
import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';
import User from './models/User.js';
import connectDB from './config/db.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@quizletclone.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026!';

const run = async () => {
  await connectDB();

  try {
    // Kiểm tra đã tồn tại chưa
    const existing = await User.findOne({
      $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }],
    });

    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`✅ Đã nâng cấp "${existing.username}" lên Admin!`);
      } else {
        console.log(`ℹ️  Admin "${existing.username}" đã tồn tại rồi.`);
      }
    } else {
      const admin = await User.create({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log(`✅ Đã tạo tài khoản Admin thành công!`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log(`\n⚠️  Hãy đổi mật khẩu ngay sau khi đăng nhập lần đầu!`);
    }
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();

