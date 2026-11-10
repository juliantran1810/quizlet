import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

// @desc    Đăng ký tài khoản mới
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Vui lòng cung cấp đầy đủ username, email và password',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message:
          existingUser.email === email.toLowerCase()
            ? 'Email này đã được sử dụng'
            : 'Tên người dùng này đã tồn tại',
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: 'user',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar || '',
          streakCount: user.streakCount || 0,
          longestStreak: user.longestStreak || 0,
          lastActiveDate: user.lastActiveDate || null,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Vui lòng cung cấp email và mật khẩu',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar || '',
          streakCount: user.streakCount || 0,
          longestStreak: user.longestStreak || 0,
          lastActiveDate: user.lastActiveDate || null,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Lấy thông tin người dùng hiện tại
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
};

// @desc    Cập nhật thông tin tài khoản (username, email)
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy người dùng' });
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    if (username && username.trim()) {
      if (username.trim() !== user.username) {
        const existUser = await User.findOne({ username: username.trim() });
        if (existUser) {
          return res.status(400).json({ status: 'fail', message: 'Tên người dùng này đã có người sử dụng' });
        }
        user.username = username.trim();
      }
    }

    if (email && email.trim()) {
      const lowerEmail = email.trim().toLowerCase();
      if (lowerEmail !== user.email) {
        const existEmail = await User.findOne({ email: lowerEmail });
        if (existEmail) {
          return res.status(400).json({ status: 'fail', message: 'Email này đã có người sử dụng' });
        }
        user.email = lowerEmail;
      }
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật thông tin thành công',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar || '',
          streakCount: user.streakCount || 0,
          longestStreak: user.longestStreak || 0,
          lastActiveDate: user.lastActiveDate || null,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Đổi mật khẩu
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        status: 'fail',
        message: 'Mật khẩu hiện tại không chính xác',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới của bạn.',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

