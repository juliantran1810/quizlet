import User from '../models/User.js';
import Deck from '../models/Deck.js';
import UserProgress from '../models/UserProgress.js';

// @desc    Lấy thống kê tổng quan nâng cao (dashboard)
// @route   GET /api/admin/stats
// @access  Admin
export const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalDecks,
      publicDecks,
      privateDecks,
      totalCards,
      totalProgress,
      activeStreaks,
      categoryStats,
      topStreakers,
    ] = await Promise.all([
      User.countDocuments(),
      Deck.countDocuments(),
      Deck.countDocuments({ isPublic: true }),
      Deck.countDocuments({ isPublic: false }),
      Deck.aggregate([
        { $project: { cardCount: { $size: '$cards' } } },
        { $group: { _id: null, total: { $sum: '$cardCount' } } },
      ]),
      UserProgress.countDocuments(),
      User.countDocuments({ streakCount: { $gt: 0 } }),
      // Phân bổ bộ thẻ theo thể loại
      Deck.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      // Top 5 người dùng có chuỗi ngày học cao nhất
      User.find({ streakCount: { $gt: 0 } })
        .sort({ streakCount: -1, longestStreak: -1 })
        .limit(5)
        .select('username email avatar streakCount longestStreak'),
    ]);

    // Top 5 bộ thẻ mới nhất
    const topDecks = await Deck.find()
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(6)
      .select('title category author cards isPublic createdAt');

    // 6 người dùng mới nhất
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('username email avatar role streakCount createdAt');

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalDecks,
          publicDecks,
          privateDecks,
          totalCards: totalCards[0]?.total || 0,
          totalProgress,
          activeStreaks,
          avgCardsPerDeck: totalDecks > 0 ? Math.round((totalCards[0]?.total || 0) / totalDecks) : 0,
        },
        categoryStats,
        topStreakers,
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
    const { search, role, page = 1, limit = 20 } = req.query;
    let query = {};

    if (role && role !== 'All') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [rawUsers, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Lấy số lượng bộ thẻ do từng user tạo
    const userIds = rawUsers.map((u) => u._id);
    const deckCounts = await Deck.aggregate([
      { $match: { author: { $in: userIds } } },
      { $group: { _id: '$author', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    deckCounts.forEach((dc) => {
      countMap[dc._id.toString()] = dc.count;
    });

    const users = rawUsers.map((u) => ({
      ...u.toObject(),
      deckCount: countMap[u._id.toString()] || 0,
    }));

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
    const { search, category, visibility, page = 1, limit = 20 } = req.query;
    let query = {};

    if (category && category !== 'All') query.category = category;
    if (visibility === 'public') query.isPublic = true;
    if (visibility === 'private') query.isPublic = false;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [decks, total] = await Promise.all([
      Deck.find(query)
        .populate('author', 'username email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('title description category author cards isPublic createdAt'),
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

// @desc    Admin chuyển đổi trạng thái Public/Private của bộ thẻ
// @route   PATCH /api/admin/decks/:id/visibility
// @access  Admin
export const adminToggleDeckVisibility = async (req, res) => {
  try {
    const { isPublic } = req.body;
    const deck = await Deck.findByIdAndUpdate(
      req.params.id,
      { isPublic: Boolean(isPublic) },
      { new: true }
    );

    if (!deck) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy bộ thẻ' });
    }

    res.status(200).json({
      status: 'success',
      message: `Đã chuyển bộ thẻ sang trạng thái ${deck.isPublic ? 'Công khai' : 'Riêng tư'}`,
      data: { deck },
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

