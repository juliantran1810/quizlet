import mongoose from 'mongoose';
import dns from 'dns';

// Sử dụng DNS của Google (8.8.8.8) để khắc phục lỗi querySrv ECONNREFUSED trên mạng Việt Nam
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('Không thể thiết lập custom DNS server:', e.message);
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizlet_db';
    const conn = await mongoose.connect(mongoUri);

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
