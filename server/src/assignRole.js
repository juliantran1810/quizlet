/**
 * Script gán role cho tài khoản người dùng
 * 
 * Cách dùng:
 * node src/assignRole.js <username_hoac_email> <role: qa | admin | user>
 * 
 * Ví dụ:
 * node src/assignRole.js qa_tester qa
 * node src/assignRole.js tester@gmail.com qa
 */
import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';
import User from './models/User.js';
import connectDB from './config/db.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const targetIdentifier = process.argv[2] || process.env.TARGET_USER;
const targetRole = (process.argv[3] || process.env.TARGET_ROLE || 'qa').toLowerCase();

if (!targetIdentifier) {
  console.log('⚠️  Cách sử dụng: node src/assignRole.js <username_hoặc_email> <qa | admin | user>');
  console.log('Ví dụ: node src/assignRole.js tester1 qa');
  process.exit(1);
}

if (!['user', 'qa', 'admin'].includes(targetRole)) {
  console.log('❌ Role không hợp lệ. Chỉ chấp nhận: user, qa, admin');
  process.exit(1);
}

const run = async () => {
  await connectDB();

  try {
    const user = await User.findOne({
      $or: [
        { email: targetIdentifier.toLowerCase() },
        { username: targetIdentifier },
      ],
    });

    if (!user) {
      console.log(`❌ Không tìm thấy người dùng với username/email: "${targetIdentifier}"`);
    } else {
      user.role = targetRole;
      await user.save();
      console.log(`✅ Đã cập nhật thành công!`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email:    ${user.email}`);
      console.log(`   Role mới: ${user.role.toUpperCase()} ${user.role === 'qa' ? '🐞 (Có quyền truy cập Bug Tracker)' : ''}`);
    }
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
