import express from 'express';
import {
  getDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
} from '../controllers/deckController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getDecks)
  .post(protect, createDeck);

router.route('/:id')
  .get(getDeckById)
  .put(protect, updateDeck)
  .delete(protect, deleteDeck);

export default router;

