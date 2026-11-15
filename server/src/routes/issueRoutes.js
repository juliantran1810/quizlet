import express from 'express';
import {
  getIssues,
  getIssueStats,
  getIssueById,
  createIssue,
  updateIssue,
  addComment,
  deleteIssue,
} from '../controllers/issueController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { qaOrAdmin } from '../middlewares/qaMiddleware.js';

const router = express.Router();

// Tất cả endpoints đều yêu cầu đăng nhập và có quyền QA hoặc Admin
router.use(protect, qaOrAdmin);

router.get('/stats', getIssueStats);

router.route('/')
  .get(getIssues)
  .post(createIssue);

router.route('/:id')
  .get(getIssueById)
  .put(updateIssue)
  .delete(deleteIssue);

router.post('/:id/comments', addComment);

export default router;
