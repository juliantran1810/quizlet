import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { generateToken } from '../utils/generateToken.js';

// @desc    Gửi mã OTP xác thực email khi đăng ký
// @route   POST /api/auth/send-otp
// @access  Public
export const sendRegisterOtp = async (req, res) => {
  try {
    const { email, username } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Vui lòng cung cấp địa chỉ email',
      });
    }

    // Kiểm tra định dạng email
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Địa chỉ email không hợp lệ',
      });
    }

    // Kiểm tra email hoặc username đã tồn tại
    const existing = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        ...(username ? [{ username }] : []),
      ],
    });

    if (existing) {
      return res.status(400).json({
        status: 'fail',
        message:
          existing.email === email.toLowerCase()
            ? 'Email này đã được đăng ký'
            : 'Tên người dùng này đã tồn tại',
      });
    }

    // Sinh mã OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu hoặc cập nhật OTP vào DB (tự hết hạn sau 10 phút)
    await Otp.findOneAndUpdate(
      { email: email.toLowerCase() },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    console.log(`[AUTH OTP] Mã OTP xác nhận cho ${email}: ${otp}`);

    res.status(200).json({
      status: 'success',
      message: 'Mã xác thực OTP đã được gửi đến email của bạn (có hiệu lực trong 10 phút)',
      devOtp: otp, // Cung cấp cho môi trường dev/local để kiểm thử dễ dàng
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Xác thực mã OTP và hoàn tất đăng ký tài khoản
// @route   POST /api/auth/verify-otp-register
// @access  Public
export const verifyOtpRegister = async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;

    if (!username || !email || !password || !otp) {
      return res.status(400).json({
        status: 'fail',
        message: 'Vui lòng cung cấp đầy đủ username, email, password và mã OTP',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    // Tìm mã OTP trong DB
    const otpRecord = await Otp.findOne({ email: cleanEmail });
    if (!otpRecord || otpRecord.otp !== cleanOtp) {
      return res.status(400).json({
        status: 'fail',
        message: 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại!',
      });
    }

    // Kiểm tra lại tính duy nhất
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message:
          existingUser.email === cleanEmail
            ? 'Email này đã được sử dụng'
            : 'Tên người dùng này đã tồn tại',
      });
    }

    // Tạo tài khoản người dùng
    const user = await User.create({
      username,
      email: cleanEmail,
      password,
      role: 'user',
    });

    // Xóa OTP đã sử dụng
    await Otp.deleteOne({ email: cleanEmail });

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

// @desc    Đăng ký tài khoản mới (trực tiếp - fallback)
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

