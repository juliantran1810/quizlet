import UserProgress from '../models/UserProgress.js';
import Deck from '../models/Deck.js';

// @desc    Lấy tiến độ học của người dùng cho một bộ thẻ
// @route   GET /api/progress/:deckId
// @access  Private
export const getProgress = async (req, res) => {
  try {
    const { deckId } = req.params;

    let progress = await UserProgress.findOne({
      user: req.user._id,
      deck: deckId,
    });

    if (!progress) {
      return res.status(200).json({
        status: 'success',
        data: {
          progress: {
            user: req.user._id,
            deck: deckId,
            cardStats: [],
            masteredCount: 0,
            learningCount: 0,
          },
        },
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        progress,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Cập nhật tiến độ học một thẻ trong bộ
// @route   POST /api/progress/:deckId
// @access  Private
export const updateProgress = async (req, res) => {
  try {
    const { deckId } = req.params;
    const { cardId, status } = req.body;

    if (!cardId || !['learning', 'mastered'].includes(status)) {
      return res.status(400).json({
        status: 'fail',
        message: "Dữ liệu không hợp lệ. Trạng thái phải là 'learning' hoặc 'mastered'",
      });
    }

    // Kiểm tra bộ thẻ có tồn tại không
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy bộ thẻ',
      });
    }

    let progress = await UserProgress.findOne({
      user: req.user._id,
      deck: deckId,
    });

    if (!progress) {
      progress = new UserProgress({
        user: req.user._id,
        deck: deckId,
        cardStats: [
          {
            cardId,
            status,
            reviewCount: 1,
            lastReviewedAt: new Date(),
          },
        ],
        lastStudiedAt: new Date(),
      });
    } else {
      const cardIndex = progress.cardStats.findIndex(
        (c) => c.cardId.toString() === cardId.toString()
      );

      if (cardIndex > -1) {
        progress.cardStats[cardIndex].status = status;
        progress.cardStats[cardIndex].reviewCount += 1;
        progress.cardStats[cardIndex].lastReviewedAt = new Date();
      } else {
        progress.cardStats.push({
          cardId,
          status,
          reviewCount: 1,
          lastReviewedAt: new Date(),
        });
      }
      progress.lastStudiedAt = new Date();
    }

    await progress.save();

    res.status(200).json({
      status: 'success',
      data: {
        progress,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Đặt lại tiến độ học của bộ thẻ
// @route   DELETE /api/progress/:deckId
// @access  Private
export const resetProgress = async (req, res) => {
  try {
    const { deckId } = req.params;

    await UserProgress.findOneAndDelete({
      user: req.user._id,
      deck: deckId,
    });

    res.status(200).json({
      status: 'success',
      message: 'Đã đặt lại tiến độ học thành công',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

