import express from 'express';
import {
  getProgress,
  updateProgress,
  resetProgress,
  toggleCardStar,
} from '../controllers/progressController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // Tất cả routes progress đều yêu cầu đăng nhập

router.route('/:deckId')
  .get(getProgress)
  .post(updateProgress)
  .delete(resetProgress);

router.patch('/:deckId/cards/:cardId/star', toggleCardStar);

export default router;

