import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import deckRoutes from './routes/deckRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Load biến môi trường
dotenv.config();

// Khởi tạo Express
const app = express();

// Kết nối cơ sở dữ liệu MongoDB
connectDB();

// Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);

// Route kiểm tra trạng thái máy chủ (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Quizlet API Server is running smoothly 🚀',
    timestamp: new Date().toISOString(),
  });
});

// Middleware xử lý 404
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Không tìm thấy đường dẫn: ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Lỗi máy chủ nội bộ',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Server đang chạy tại http://localhost:${PORT}`);
});
