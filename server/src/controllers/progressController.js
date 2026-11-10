import UserProgress from '../models/UserProgress.js';
import Deck from '../models/Deck.js';
import User from '../models/User.js';

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

    const isCorrect = status === 'mastered';
    // Khoảng ngày giãn cách theo Leitner: Box 1: 1 ngày, Box 2: 3 ngày, Box 3: 7 ngày, Box 4: 14 ngày, Box 5: 30 ngày
    const LEITNER_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

    const calculateNextReview = (currentBox, correct) => {
      let newBox = currentBox || 1;
      let newConsecutive = 0;
      if (correct) {
        newBox = Math.min(5, newBox + 1);
      } else {
        newBox = 1; // Sai thì bắt đầu lại từ Box 1
      }
      const daysToAdd = LEITNER_DAYS[newBox] || 1;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      return { newBox, nextDate };
    };

    let progress = await UserProgress.findOne({
      user: req.user._id,
      deck: deckId,
    });

    if (!progress) {
      const { newBox, nextDate } = calculateNextReview(1, isCorrect);
      progress = new UserProgress({
        user: req.user._id,
        deck: deckId,
        cardStats: [
          {
            cardId,
            status,
            box: newBox,
            nextReviewAt: nextDate,
            consecutiveCorrect: isCorrect ? 1 : 0,
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
        const currentStat = progress.cardStats[cardIndex];
        const { newBox, nextDate } = calculateNextReview(currentStat.box || 1, isCorrect);

        currentStat.status = status;
        currentStat.box = newBox;
        currentStat.nextReviewAt = nextDate;
        currentStat.consecutiveCorrect = isCorrect ? (currentStat.consecutiveCorrect || 0) + 1 : 0;
        currentStat.reviewCount = (currentStat.reviewCount || 0) + 1;
        currentStat.lastReviewedAt = new Date();
      } else {
        const { newBox, nextDate } = calculateNextReview(1, isCorrect);
        progress.cardStats.push({
          cardId,
          status,
          box: newBox,
          nextReviewAt: nextDate,
          consecutiveCorrect: isCorrect ? 1 : 0,
          reviewCount: 1,
          lastReviewedAt: new Date(),
        });
      }
      progress.lastStudiedAt = new Date();
    }

    await progress.save();

    // Cập nhật Daily Streak cho User
    let updatedUserStreak = null;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const user = await User.findById(req.user._id);

      if (user) {
        if (!user.lastActiveDate) {
          // Lần đầu học
          user.streakCount = 1;
          user.longestStreak = 1;
          user.lastActiveDate = todayStr;
          await user.save();
        } else if (user.lastActiveDate !== todayStr) {
          // Tính khoảng cách ngày so với ngày học trước
          const prevDate = new Date(user.lastActiveDate);
          const currentDate = new Date(todayStr);
          const diffTime = Math.abs(currentDate - prevDate);
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            // Học liên tiếp ngày hôm sau -> Tăng Streak
            user.streakCount = (user.streakCount || 0) + 1;
          } else if (diffDays > 1) {
            // Đã ngắt quãng quá 1 ngày -> Bắt đầu chuỗi mới
            user.streakCount = 1;
          }

          if (user.streakCount > (user.longestStreak || 0)) {
            user.longestStreak = user.streakCount;
          }
          user.lastActiveDate = todayStr;
          await user.save();
        }
        updatedUserStreak = {
          streakCount: user.streakCount,
          longestStreak: user.longestStreak,
          lastActiveDate: user.lastActiveDate,
        };
      }
    } catch (streakErr) {
      console.warn('Lỗi cập nhật streak:', streakErr);
    }

    res.status(200).json({
      status: 'success',
      data: {
        progress,
        userStreak: updatedUserStreak,
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

// @desc    Gắn sao / bỏ gắn sao một thẻ trong bộ
// @route   PATCH /api/progress/:deckId/cards/:cardId/star
// @access  Private
export const toggleCardStar = async (req, res) => {
  try {
    const { deckId, cardId } = req.params;
    const { isStarred } = req.body;

    let progress = await UserProgress.findOne({
      user: req.user._id,
      deck: deckId,
    });

    let newStarredState = true;

    if (!progress) {
      if (isStarred !== undefined) {
        newStarredState = Boolean(isStarred);
      }
      progress = new UserProgress({
        user: req.user._id,
        deck: deckId,
        cardStats: [
          {
            cardId,
            status: 'learning',
            reviewCount: 0,
            isStarred: newStarredState,
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
        if (isStarred !== undefined) {
          progress.cardStats[cardIndex].isStarred = Boolean(isStarred);
        } else {
          progress.cardStats[cardIndex].isStarred = !progress.cardStats[cardIndex].isStarred;
        }
        newStarredState = progress.cardStats[cardIndex].isStarred;
      } else {
        if (isStarred !== undefined) {
          newStarredState = Boolean(isStarred);
        }
        progress.cardStats.push({
          cardId,
          status: 'learning',
          reviewCount: 0,
          isStarred: newStarredState,
          lastReviewedAt: new Date(),
        });
      }
      progress.lastStudiedAt = new Date();
    }

    await progress.save();

    res.status(200).json({
      status: 'success',
      data: {
        cardId,
        isStarred: newStarredState,
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

