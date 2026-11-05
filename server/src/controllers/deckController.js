import Deck from '../models/Deck.js';
import UserProgress from '../models/UserProgress.js';

// @desc    Lấy danh sách các bộ thẻ (hỗ trợ lọc tìm kiếm & thể loại)
// @route   GET /api/decks
// @access  Public
export const getDecks = async (req, res) => {
  try {
    const { search, category, author } = req.query;
    let query = { isPublic: true };

    if (author) {
      query = { author };
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const decks = await Deck.find(query)
      .populate('author', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: decks.length,
      data: {
        decks,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Lấy chi tiết một bộ thẻ
// @route   GET /api/decks/:id
// @access  Public
export const getDeckById = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id).populate('author', 'username email');

    if (!deck) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy bộ thẻ này',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        deck,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Tạo bộ thẻ mới
// @route   POST /api/decks
// @access  Private
export const createDeck = async (req, res) => {
  try {
    const { title, description, category, isPublic, cards } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Tiêu đề bộ thẻ là bắt buộc',
      });
    }

    if (!cards || !Array.isArray(cards) || cards.length < 2) {
      return res.status(400).json({
        status: 'fail',
        message: 'Bộ thẻ cần có ít nhất 2 thẻ thuật ngữ/định nghĩa',
      });
    }

    // Kiểm tra từng thẻ hợp lệ
    for (const card of cards) {
      if (!card.term || !card.definition) {
        return res.status(400).json({
          status: 'fail',
          message: 'Tất cả các thẻ đều phải có đầy đủ thuật ngữ (term) và định nghĩa (definition)',
        });
      }
    }

    const newDeck = await Deck.create({
      title,
      description: description || '',
      category: category || 'General',
      isPublic: isPublic !== undefined ? isPublic : true,
      cards,
      author: req.user._id,
    });

    const populatedDeck = await newDeck.populate('author', 'username email');

    res.status(201).json({
      status: 'success',
      data: {
        deck: populatedDeck,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Cập nhật bộ thẻ
// @route   PUT /api/decks/:id
// @access  Private (Chỉ tác giả)
export const updateDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);

    if (!deck) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy bộ thẻ này',
      });
    }

    if (deck.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Bạn không có quyền chỉnh sửa bộ thẻ này',
      });
    }

    const { title, description, category, isPublic, cards } = req.body;

    if (title) deck.title = title;
    if (description !== undefined) deck.description = description;
    if (category) deck.category = category;
    if (isPublic !== undefined) deck.isPublic = isPublic;
    if (cards && Array.isArray(cards)) {
      if (cards.length < 2) {
        return res.status(400).json({
          status: 'fail',
          message: 'Bộ thẻ phải có ít nhất 2 thẻ',
        });
      }
      deck.cards = cards;
    }

    const updatedDeck = await deck.save();
    await updatedDeck.populate('author', 'username email');

    res.status(200).json({
      status: 'success',
      data: {
        deck: updatedDeck,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Xóa bộ thẻ
// @route   DELETE /api/decks/:id
// @access  Private (Chỉ tác giả)
export const deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);

    if (!deck) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy bộ thẻ này',
      });
    }

    if (deck.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Bạn không có quyền xóa bộ thẻ này',
      });
    }

    await Deck.findByIdAndDelete(req.params.id);
    // Xóa toàn bộ tiến độ học liên quan đến bộ thẻ này
    await UserProgress.deleteMany({ deck: req.params.id });

    res.status(200).json({
      status: 'success',
      message: 'Đã xóa bộ thẻ thành công',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

