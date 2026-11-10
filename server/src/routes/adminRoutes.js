import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { adminOnly } from '../middlewares/adminMiddleware.js';
import {
  getStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllDecks,
  adminToggleDeckVisibility,
  adminDeleteDeck,
} from '../controllers/adminController.js';

const router = express.Router();

// Tất cả routes admin đều cần protect + adminOnly
router.use(protect, adminOnly);

router.get('/stats', getStats);

router.get('/users', getAllUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

router.get('/decks', getAllDecks);
router.patch('/decks/:id/visibility', adminToggleDeckVisibility);
router.delete('/decks/:id', adminDeleteDeck);

export default router;

