import express from 'express';
import {
  getDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
  getTermSuggestions,
} from '../controllers/deckController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getDecks)
  .post(protect, createDeck);

// Tuyến đường gợi ý thông minh (phải đặt trước /:id để tránh trùng lặp param)
router.get('/suggestions', getTermSuggestions);

router.route('/:id')
  .get(getDeckById)
  .put(protect, updateDeck)
  .delete(protect, deleteDeck);

export default router;

