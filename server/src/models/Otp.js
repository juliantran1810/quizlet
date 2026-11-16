import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    // Mục đích của mã: đăng ký tài khoản hay đặt lại mật khẩu
    purpose: {
      type: String,
      enum: ['register', 'reset'],
      default: 'register',
    },
    // Số lần nhập sai (chống dò mã OTP)
    attempts: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Tự động xóa document sau 10 phút (TTL index)
    },
  },
  {
    timestamps: false,
  }
);

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
