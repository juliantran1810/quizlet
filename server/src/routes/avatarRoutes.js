import express from 'express';
import {
  getPublicAvatars,
  getAdminAvatars,
  createAvatar,
  updateAvatar,
  deleteAvatar,
  seedDefaultAvatars,
} from '../controllers/avatarController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { adminOnly } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Public route: người học lấy danh sách avatar đang active
router.get('/', getPublicAvatars);

// Admin routes: Quản lý toàn bộ avatar
router.get('/admin', protect, adminOnly, getAdminAvatars);
router.post('/admin', protect, adminOnly, createAvatar);
router.put('/admin/:id', protect, adminOnly, updateAvatar);
router.delete('/admin/:id', protect, adminOnly, deleteAvatar);
router.post('/admin/seed-defaults', protect, adminOnly, seedDefaultAvatars);

export default router;
