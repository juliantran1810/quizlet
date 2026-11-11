import express from 'express';
import { scanVocabularyImage } from '../controllers/aiController.js';

const router = express.Router();

// @route   POST /api/ai/scan-image
// @desc    Quét ảnh tài liệu học / sách giáo trình và bóc tách từ vựng thành thẻ học
// @access  Public (hoặc người dùng có thể gửi kèm API Key cá nhân)
router.post('/scan-image', scanVocabularyImage);

export default router;
