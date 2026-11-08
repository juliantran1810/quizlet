import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      message: 'Bạn chưa đăng nhập hoặc không có quyền truy cập',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_quizlet_clone_2026'
    );

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Tài khoản liên kết với token này không còn tồn tại',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
  }
};

/**
 * Middleware xác thực tùy chọn:
 * Nếu client gửi Token hợp lệ -> gắn req.user.
 * Nếu không có token hoặc token hỏng -> vẫn cho đi tiếp như khách vãng lai (guest).
 */
export const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_quizlet_clone_2026'
    );
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Bỏ qua lỗi token hết hạn/sai, xử lý như guest
  }

  next();
};

