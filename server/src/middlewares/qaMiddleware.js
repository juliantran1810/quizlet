// Middleware kiểm tra quyền QA hoặc Admin
// Phải dùng SAU middleware `protect`
export const qaOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'qa' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({
      status: 'fail',
      message: 'Chỉ tài khoản có quyền QA hoặc Admin mới có thể truy cập hệ thống Bug Tracker',
    });
  }
};
