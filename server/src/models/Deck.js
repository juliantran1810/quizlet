import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: [true, 'Thuật ngữ (term) không được để trống'],
      trim: true,
    },
    definition: {
      type: String,
      required: [true, 'Định nghĩa (definition) không được để trống'],
      trim: true,
    },
    pinyin: {
      type: String,
      default: '',
      trim: true,
    },
    hint: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: true, // Tự động sinh ObjectId cho từng thẻ để liên kết với UserProgress
    timestamps: true,
  }
);

const deckSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề bộ thẻ không được để trống'],
      trim: true,
      maxlength: [100, 'Tiêu đề không được vượt quá 100 ký tự'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    cards: [cardSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property tính tổng số thẻ trong bộ
deckSchema.virtual('totalCards').get(function () {
  return this.cards ? this.cards.length : 0;
});

// Index hỗ trợ tìm kiếm nhanh theo title và category
deckSchema.index({ title: 'text', description: 'text' });
deckSchema.index({ author: 1, createdAt: -1 });

const Deck = mongoose.model('Deck', deckSchema);

export default Deck;

