// Middleware kiểm tra quyền Admin
// Phải dùng SAU middleware `protect`
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      status: 'fail',
      message: 'Bạn không có quyền Admin để thực hiện thao tác này',
    });
  }
};

