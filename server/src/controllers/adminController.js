import User from '../models/User.js';
import Deck from '../models/Deck.js';
import UserProgress from '../models/UserProgress.js';

// @desc    Lấy thống kê tổng quan (dashboard)
// @route   GET /api/admin/stats
// @access  Admin
export const getStats = async (req, res) => {
  try {
    const [totalUsers, totalDecks, totalCards, totalProgress] = await Promise.all([
      User.countDocuments(),
      Deck.countDocuments(),
      Deck.aggregate([
        { $project: { cardCount: { $size: '$cards' } } },
        { $group: { _id: null, total: { $sum: '$cardCount' } } },
      ]),
      UserProgress.countDocuments(),
    ]);

    // Top 5 bộ thẻ được học nhiều nhất (theo số lần học)
    const topDecks = await Deck.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category author cards createdAt');

    // 5 người dùng mới nhất
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username email role createdAt');

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalDecks,
          totalCards: totalCards[0]?.total || 0,
          totalProgress,
        },
        topDecks,
        recentUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Lấy danh sách tất cả người dùng
// @route   GET /api/admin/users
// @access  Admin
export const getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Thay đổi role của người dùng
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ status: 'fail', message: 'Role không hợp lệ' });
    }

    // Không thể tự đổi role của chính mình
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ status: 'fail', message: 'Không thể tự thay đổi role của chính mình' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Xóa người dùng
// @route   DELETE /api/admin/users/:id
// @access  Admin
export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ status: 'fail', message: 'Không thể tự xóa tài khoản của chính mình' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy người dùng' });
    }

    // Xóa toàn bộ dữ liệu liên quan
    const userDecks = await Deck.find({ author: req.params.id }).select('_id');
    const deckIds = userDecks.map((d) => d._id);
    await Deck.deleteMany({ author: req.params.id });
    await UserProgress.deleteMany({ $or: [{ user: req.params.id }, { deck: { $in: deckIds } }] });

    res.status(200).json({ status: 'success', message: 'Đã xóa người dùng và dữ liệu liên quan' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Lấy danh sách tất cả bộ thẻ (admin)
// @route   GET /api/admin/decks
// @access  Admin
export const getAllDecks = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    let query = {};

    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [decks, total] = await Promise.all([
      Deck.find(query)
        .populate('author', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('title category author cards isPublic createdAt'),
      Deck.countDocuments(query),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        decks,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Admin xóa bất kỳ bộ thẻ nào
// @route   DELETE /api/admin/decks/:id
// @access  Admin
export const adminDeleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findByIdAndDelete(req.params.id);
    if (!deck) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy bộ thẻ' });
    }
    await UserProgress.deleteMany({ deck: req.params.id });
    res.status(200).json({ status: 'success', message: 'Đã xóa bộ thẻ thành công' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

