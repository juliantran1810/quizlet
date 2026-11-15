import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Nội dung bình luận không được để trống'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    name: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  { _id: true, timestamps: true }
);

const issueSchema = new mongoose.Schema(
  {
    issueKey: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề lỗi (Summary) là bắt buộc'],
      trim: true,
      maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    stepsToReproduce: {
      type: String,
      default: '',
      trim: true,
    },
    expectedResult: {
      type: String,
      default: '',
      trim: true,
    },
    actualResult: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['bug', 'improvement', 'task'],
      default: 'bug',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'ready_for_qa', 'qa_testing', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    module: {
      type: String,
      default: 'General',
      trim: true,
    },
    browserEnv: {
      type: String,
      default: '',
      trim: true,
    },
    screenshotUrl: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: [attachmentSchema],
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    comments: [commentSchema],
  },
  {
    timestamps: true,
  }
);

// Tự động tạo issueKey dạng MEM-101, MEM-102 trước khi lưu
issueSchema.pre('save', async function (next) {
  if (!this.issueKey) {
    try {
      const count = await mongoose.model('Issue').countDocuments();
      this.issueKey = `MEM-${100 + count + 1}`;
    } catch (e) {
      this.issueKey = `MEM-${Date.now().toString().slice(-4)}`;
    }
  }
  next();
});

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;
