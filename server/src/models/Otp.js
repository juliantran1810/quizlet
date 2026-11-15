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
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // T? d?ng xóa document sau 10 phút (TTL index)
    },
  },
  {
    timestamps: false,
  }
);

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
