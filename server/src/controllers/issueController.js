import Issue from '../models/Issue.js';

// @desc    Lấy danh sách các issue / bug (có lọc theo status, priority, module, search)
// @route   GET /api/issues
// @access  Private (Logged in user / QA)
export const getIssues = async (req, res) => {
  try {
    const { status, priority, module, search, type } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (module && module !== 'all') {
      query.module = module;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { issueKey: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const issues = await Issue.find(query)
      .populate('reporter', 'username email avatar role')
      .populate('assignee', 'username email avatar role')
      .populate('comments.author', 'username email avatar role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: issues.length,
      data: {
        issues,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Lấy thống kê nhanh về bug / issues
// @route   GET /api/issues/stats
// @access  Private
export const getIssueStats = async (req, res) => {
  try {
    const [total, open, inProgress, resolved, readyForQa, qaTesting, closed, critical] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: 'open' }),
      Issue.countDocuments({ status: 'in_progress' }),
      Issue.countDocuments({ status: 'resolved' }),
      Issue.countDocuments({ status: 'ready_for_qa' }),
      Issue.countDocuments({ status: 'qa_testing' }),
      Issue.countDocuments({ status: 'closed' }),
      Issue.countDocuments({ priority: 'critical', status: { $ne: 'closed' } }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        total,
        open,
        inProgress,
        resolved,
        readyForQa,
        qaTesting,
        closed,
        critical,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Lấy chi tiết 1 issue
// @route   GET /api/issues/:id
// @access  Private
export const getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reporter', 'username email avatar role')
      .populate('assignee', 'username email avatar role')
      .populate('comments.author', 'username email avatar role');

    if (!issue) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy Issue / Bug này',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        issue,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Tạo mới một bug / issue
// @route   POST /api/issues
// @access  Private (QA, User, Admin)
export const createIssue = async (req, res) => {
  try {
    const {
      title,
      description,
      stepsToReproduce,
      expectedResult,
      actualResult,
      type,
      priority,
      module,
      browserEnv,
      screenshotUrl,
      attachments,
      assignee,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Tiêu đề tóm tắt lỗi (Title) là bắt buộc',
      });
    }

    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    const firstUrl = screenshotUrl?.trim() || safeAttachments[0]?.url || '';

    const newIssue = await Issue.create({
      title: title.trim(),
      description: description?.trim() || '',
      stepsToReproduce: stepsToReproduce?.trim() || '',
      expectedResult: expectedResult?.trim() || '',
      actualResult: actualResult?.trim() || '',
      type: type || 'bug',
      priority: priority || 'medium',
      module: module || 'General',
      browserEnv: browserEnv || '',
      screenshotUrl: firstUrl,
      attachments: safeAttachments,
      reporter: req.user._id,
      assignee: assignee || null,
    });

    const populated = await newIssue.populate([
      { path: 'reporter', select: 'username email avatar role' },
      { path: 'assignee', select: 'username email avatar role' },
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        issue: populated,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Cập nhật issue (Status, Priority, Assignee, Nội dung)
// @route   PUT /api/issues/:id
// @access  Private
export const updateIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy Issue / Bug này',
      });
    }

    const {
      title,
      description,
      stepsToReproduce,
      expectedResult,
      actualResult,
      type,
      status,
      priority,
      module,
      browserEnv,
      screenshotUrl,
      attachments,
      assignee,
    } = req.body;

    if (title !== undefined) issue.title = title.trim();
    if (description !== undefined) issue.description = description.trim();
    if (stepsToReproduce !== undefined) issue.stepsToReproduce = stepsToReproduce.trim();
    if (expectedResult !== undefined) issue.expectedResult = expectedResult.trim();
    if (actualResult !== undefined) issue.actualResult = actualResult.trim();
    if (type !== undefined) issue.type = type;
    if (status !== undefined) issue.status = status;
    if (priority !== undefined) issue.priority = priority;
    if (module !== undefined) issue.module = module;
    if (browserEnv !== undefined) issue.browserEnv = browserEnv;
    if (screenshotUrl !== undefined) issue.screenshotUrl = screenshotUrl;
    if (attachments !== undefined && Array.isArray(attachments)) {
      issue.attachments = attachments;
    }
    if (assignee !== undefined) issue.assignee = assignee || null;

    const updatedIssue = await issue.save();
    const populated = await updatedIssue.populate([
      { path: 'reporter', select: 'username email avatar role' },
      { path: 'assignee', select: 'username email avatar role' },
      { path: 'comments.author', select: 'username email avatar role' },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        issue: populated,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Thêm bình luận trao đổi giữa QA & Dev
// @route   POST /api/issues/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Nội dung bình luận không được để trống',
      });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy Issue / Bug này',
      });
    }

    issue.comments.push({
      author: req.user._id,
      content: content.trim(),
    });

    await issue.save();

    const populated = await issue.populate([
      { path: 'reporter', select: 'username email avatar role' },
      { path: 'assignee', select: 'username email avatar role' },
      { path: 'comments.author', select: 'username email avatar role' },
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        issue: populated,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

// @desc    Xóa bug / issue
// @route   DELETE /api/issues/:id
// @access  Private (Chỉ reporter hoặc Admin)
export const deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy Issue / Bug này',
      });
    }

    // Chỉ người tạo hoặc admin mới có quyền xóa
    const isReporter = issue.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Bạn không có quyền xóa Issue này',
      });
    }

    await Issue.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Đã xóa Issue thành công',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
