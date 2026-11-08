import Deck from '../models/Deck.js';
import UserProgress from '../models/UserProgress.js';
import { BUILTIN_VOCABULARY } from '../utils/dictionaryData.js';

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

// @desc    Lấy gợi ý thuật ngữ và định nghĩa thông minh (Autocomplete / Smart Suggestions)
// @route   GET /api/decks/suggestions
// @access  Public
export const getTermSuggestions = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.status(200).json({
        status: 'success',
        data: {
          suggestions: [],
        },
      });
    }

    const lowerQ = query.toLowerCase();
    const suggestionsMap = new Map();

    // 1. Tìm trong Built-in Vocabulary
    for (const item of BUILTIN_VOCABULARY) {
      const matchTerm = item.term.toLowerCase().includes(lowerQ);
      const matchPinyin = item.pinyin && item.pinyin.toLowerCase().includes(lowerQ);
      const matchDef = item.definitions.some((d) => d.toLowerCase().includes(lowerQ));

      if (matchTerm || matchPinyin || matchDef) {
        suggestionsMap.set(item.term.toLowerCase(), {
          term: item.term,
          pinyin: item.pinyin || '',
          definitions: [...item.definitions],
        });
      }
    }

    // 2. Tìm trong Database MongoDB (từ các bộ thẻ công khai)
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const decks = await Deck.find({
        isPublic: true,
        'cards.term': { $regex: escapedQuery, $options: 'i' },
      })
        .select('cards')
        .limit(20);

      for (const d of decks) {
        if (!d.cards) continue;
        for (const c of d.cards) {
          if (c.term && c.term.toLowerCase().includes(lowerQ)) {
            const key = c.term.toLowerCase();
            if (suggestionsMap.has(key)) {
              const existing = suggestionsMap.get(key);
              if (c.definition && !existing.definitions.includes(c.definition)) {
                existing.definitions.push(c.definition);
              }
              if (!existing.pinyin && c.pinyin) {
                existing.pinyin = c.pinyin;
              }
            } else {
              suggestionsMap.set(key, {
                term: c.term,
                pinyin: c.pinyin || '',
                definitions: c.definition ? [c.definition] : [],
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi tìm kiếm gợi ý từ DB:', e);
    }

    // Chuyển Map thành mảng và sắp xếp ưu tiên
    const results = Array.from(suggestionsMap.values())
      .sort((a, b) => {
        const aStarts = a.term.toLowerCase().startsWith(lowerQ);
        const bStarts = b.term.toLowerCase().startsWith(lowerQ);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.term.length - b.term.length;
      })
      .slice(0, 8); // Tối đa 8 gợi ý phù hợp nhất

    res.status(200).json({
      status: 'success',
      data: {
        suggestions: results,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};


