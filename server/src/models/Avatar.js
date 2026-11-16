import mongoose from 'mongoose';

const avatarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng cung cấp tên avatar'],
      trim: true,
      maxlength: [100, 'Tên avatar không được vượt quá 100 ký tự'],
    },
    category: {
      type: String,
      required: [true, 'Vui lòng chọn danh mục'],
      default: 'characters',
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Vui lòng cung cấp đường dẫn ảnh (URL hoặc Data URI)'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

avatarSchema.index({ category: 1, isActive: 1 });

const Avatar = mongoose.model('Avatar', avatarSchema);
export default Avatar;
