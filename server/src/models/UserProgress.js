import mongoose from 'mongoose';

const cardStatSchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ['learning', 'mastered'],
      default: 'learning',
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastReviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: true,
    },
    cardStats: [cardStatSchema],
    lastStudiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Đảm bảo mỗi người dùng chỉ có 1 bản ghi tiến độ duy nhất cho mỗi bộ thẻ
userProgressSchema.index({ user: 1, deck: 1 }, { unique: true });

// Virtual tính tổng số thẻ đã thuộc (mastered) và đang học (learning)
userProgressSchema.virtual('masteredCount').get(function () {
  return this.cardStats ? this.cardStats.filter((c) => c.status === 'mastered').length : 0;
});

userProgressSchema.virtual('learningCount').get(function () {
  return this.cardStats ? this.cardStats.filter((c) => c.status === 'learning').length : 0;
});

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

export default UserProgress;

