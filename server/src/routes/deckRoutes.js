import express from 'express';
import {
  getDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
  getTermSuggestions,
  toggleDeckVisibility,
} from '../controllers/deckController.js';
import { protect, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(optionalAuth, getDecks)
  .post(protect, createDeck);

// Tuyến đường gợi ý thông minh (phải đặt trước /:id để tránh trùng lặp param)
router.get('/suggestions', getTermSuggestions);

// Chuyển đổi trạng thái công khai / riêng tư nhanh
router.patch('/:id/visibility', protect, toggleDeckVisibility);

router.route('/:id')
  .get(optionalAuth, getDeckById)
  .put(protect, updateDeck)
  .delete(protect, deleteDeck);

export default router;

