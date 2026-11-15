import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { issueService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Bug,
  PlusCircle,
  Search,
  Filter,
  Kanban,
  ListFilter,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  Send,
  Trash2,
  X,
  ExternalLink,
  Laptop,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  UploadCloud,
  Image as ImageIcon,
  Video,
  Film,
  Maximize2,
  Paperclip,
  Play,
  FileText,
  Pencil,
} from 'lucide-react';

const MODULES = [
  'Flashcards (3D & Lật thẻ)',
  'Learn Mode (Luyện gõ từ)',
  'Quiz Mode (Trắc nghiệm)',
  'Match Game (Ghép từ)',
  'Gravity Game (Arcade)',
  'Audio & TTS (Phát âm)',
  'Chữ Hán & Nét bút',
  'Auth (Đăng nhập / Đăng ký)',
  'Quản lý Bộ thẻ (Create/Edit/Import)',
  'UI / UX & Responsive',
  'Khác (General)',
];

const STATUS_COLUMNS = [
  { key: 'open',          label: 'Mở (Open)',              color: 'bg-slate-100 text-slate-700 border-slate-300',   dot: 'bg-slate-400'   },
  { key: 'in_progress',   label: 'Đang xử lý (In Progress)', color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500'    },
  { key: 'resolved',      label: 'Đã sửa (Resolved)',      color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500'  },
  { key: 'ready_for_qa', label: 'Chờ QA Test (Ready for QA)', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500'   },
  { key: 'qa_testing',   label: 'Đang kiểm thử (QA Testing)', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { key: 'closed',       label: 'Đóng (Closed)',           color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
];

// ===== TOAST NOTIFICATION COMPONENT =====
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[10000] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold text-white transition-all animate-in slide-in-from-bottom-5 duration-200 ${type === 'success'
          ? 'bg-slate-900 border border-emerald-500/40 text-emerald-100'
          : 'bg-rose-600 shadow-rose-900/40 text-white'
        }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-white shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function BugTrackerPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterModule, setFilterModule] = useState('all');

  // Modals & Viewers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [lightboxMedia, setLightboxMedia] = useState(null); // { url, type, name }
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // New Issue Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'bug',
    priority: 'high',
    module: 'Flashcards (3D & Lật thẻ)',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    browserEnv: typeof window !== 'undefined' ? `${navigator.userAgent.slice(0, 120)}` : '',
    description: '',
    attachments: [], // [{ url, type: 'image' | 'video', name, size }]
  });
  const [isDragging, setIsDragging] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Edit Issue Form State
  const [editFormData, setEditFormData] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const editFileInputRef = useRef(null);
  const [isEditDragging, setIsEditDragging] = useState(false);
  const [editExternalUrl, setEditExternalUrl] = useState('');
  const [showEditUrlInput, setShowEditUrlInput] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterStatus, filterPriority, filterModule]);

  // Đóng Modal khi bấm phím Esc theo thứ tự ưu tiên
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxMedia) {
          setLightboxMedia(null);
        } else if (showEditModal) {
          setShowEditModal(false);
        } else if (showCreateModal) {
          setShowCreateModal(false);
        } else if (selectedIssue) {
          setSelectedIssue(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxMedia, showEditModal, showCreateModal, selectedIssue]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [issuesRes, statsRes] = await Promise.all([
        issueService.getAll({
          status: filterStatus !== 'all' ? filterStatus : undefined,
          priority: filterPriority !== 'all' ? filterPriority : undefined,
          module: filterModule !== 'all' ? filterModule : undefined,
        }),
        issueService.getStats(),
      ]);
      setIssues(issuesRes.data.issues || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('Lỗi khi tải danh sách issues:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper format dung lượng tệp
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Xử lý đọc nhiều file (Hình ảnh + Video) cho Modal Tạo mới
  const processFiles = (files) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isImage && !isVideo) {
        showToast(`Tệp "${file.name}" không phải định dạng hình ảnh hoặc video được hỗ trợ.`, 'error');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        showToast(`Tệp "${file.name}" vượt quá 25MB. Hãy nén hoặc sử dụng link video ngoài.`, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newAttachment = {
          url: e.target.result,
          type: isVideo ? 'video' : 'image',
          name: file.name,
          size: file.size,
        };
        setFormData((prev) => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // Xử lý đọc nhiều file cho Modal Chỉnh sửa
  const processEditFiles = (files) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isImage && !isVideo) {
        showToast(`Tệp "${file.name}" không phải định dạng hình ảnh hoặc video được hỗ trợ.`, 'error');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        showToast(`Tệp "${file.name}" vượt quá 25MB. Hãy nén hoặc sử dụng link video ngoài.`, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newAttachment = {
          url: e.target.result,
          type: isVideo ? 'video' : 'image',
          name: file.name,
          size: file.size,
        };
        setEditFormData((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), newAttachment],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // Xử lý dán Clipboard (Ctrl + V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToProcess = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) filesToProcess.push(file);
      }
    }

    if (filesToProcess.length > 0) {
      if (showEditModal) {
        processEditFiles(filesToProcess);
      } else if (showCreateModal) {
        processFiles(filesToProcess);
      }
    }
  };

  const handleAddExternalUrl = () => {
    if (!externalUrl.trim()) return;
    const cleanUrl = externalUrl.trim();
    const isVideo =
      cleanUrl.includes('.mp4') ||
      cleanUrl.includes('.webm') ||
      cleanUrl.includes('.mov') ||
      cleanUrl.includes('loom.com') ||
      cleanUrl.includes('youtube.com') ||
      cleanUrl.includes('youtu.be');

    const newAttachment = {
      url: cleanUrl,
      type: isVideo ? 'video' : 'image',
      name: cleanUrl.split('/').pop()?.slice(0, 30) || 'Media URL',
      size: 0,
    };

    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, newAttachment],
    }));
    setExternalUrl('');
    setShowUrlInput(false);
    showToast('Đã thêm liên kết tệp đính kèm!');
  };

  const handleAddEditExternalUrl = () => {
    if (!editExternalUrl.trim()) return;
    const cleanUrl = editExternalUrl.trim();
    const isVideo =
      cleanUrl.includes('.mp4') ||
      cleanUrl.includes('.webm') ||
      cleanUrl.includes('.mov') ||
      cleanUrl.includes('loom.com') ||
      cleanUrl.includes('youtube.com') ||
      cleanUrl.includes('youtu.be');

    const newAttachment = {
      url: cleanUrl,
      type: isVideo ? 'video' : 'image',
      name: cleanUrl.split('/').pop()?.slice(0, 30) || 'Media URL',
      size: 0,
    };

    setEditFormData((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment],
    }));
    setEditExternalUrl('');
    setShowEditUrlInput(false);
    showToast('Đã thêm liên kết tệp đính kèm!');
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleRemoveEditAttachment = (indexToRemove) => {
    setEditFormData((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Mở modal chỉnh sửa Bug
  const handleStartEdit = (issue) => {
    let initialAttachments = [];
    if (issue.attachments && issue.attachments.length > 0) {
      initialAttachments = [...issue.attachments];
    } else if (issue.screenshotUrl) {
      initialAttachments = [
        {
          url: issue.screenshotUrl,
          type: 'image',
          name: 'Screenshot đính kèm',
          size: 0,
        },
      ];
    }

    setEditFormData({
      title: issue.title || '',
      type: issue.type || 'bug',
      priority: issue.priority || 'medium',
      status: issue.status || 'open',
      module: issue.module || 'General',
      stepsToReproduce: issue.stepsToReproduce || '',
      expectedResult: issue.expectedResult || '',
      actualResult: issue.actualResult || '',
      browserEnv: issue.browserEnv || '',
      description: issue.description || '',
      attachments: initialAttachments,
    });
    setEditErrorMsg('');
    setShowEditModal(true);
  };

  // Submit cập nhật Bug Log
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData || !selectedIssue) return;
    if (!editFormData.title.trim()) {
      setEditErrorMsg('Tiêu đề tóm tắt lỗi không được để trống.');
      return;
    }

    setUpdating(true);
    setEditErrorMsg('');
    try {
      const res = await issueService.update(selectedIssue._id, editFormData);
      const updated = res.data?.issue;
      setSelectedIssue(updated);
      setIssues((prev) =>
        prev.map((item) => (item._id === selectedIssue._id ? updated : item))
      );
      setShowEditModal(false);
      showToast(`Đã cập nhật thông tin ${selectedIssue.issueKey} thành công!`);
      issueService.getStats().then((s) => setStats(s.data));
    } catch (err) {
      setEditErrorMsg(err.response?.data?.message || 'Có lỗi khi cập nhật Bug Report.');
      showToast('Cập nhật không thành công', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Filter issues locally by search term
  const filteredIssues = useMemo(() => {
    if (!search.trim()) return issues;
    const q = search.toLowerCase().trim();
    return issues.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.issueKey?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.reporter?.username?.toLowerCase().includes(q)
    );
  }, [issues, search]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('Vui lòng nhập tóm tắt tiêu đề lỗi.');
      return;
    }

    setCreating(true);
    setErrorMsg('');
    try {
      const res = await issueService.create(formData);
      setShowCreateModal(false);
      // Reset form
      setFormData({
        title: '',
        type: 'bug',
        priority: 'high',
        module: 'Flashcards (3D & Lật thẻ)',
        stepsToReproduce: '',
        expectedResult: '',
        actualResult: '',
        browserEnv: typeof window !== 'undefined' ? `${navigator.userAgent.slice(0, 120)}` : '',
        description: '',
        attachments: [],
      });
      loadData();
      showToast(`Đã tạo Bug mới thành công: ${res.data?.issue?.issueKey || ''}!`);
      if (res.data?.issue) {
        setSelectedIssue(res.data.issue);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi khi tạo Bug Report.');
      showToast('Không thể tạo Bug mới', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      const res = await issueService.update(issueId, { status: newStatus });
      setIssues((prev) =>
        prev.map((item) => (item._id === issueId ? { ...item, status: newStatus } : item))
      );
      if (selectedIssue && selectedIssue._id === issueId) {
        setSelectedIssue(res.data.issue);
      }
      const statusObj = STATUS_COLUMNS.find((c) => c.key === newStatus);
      showToast(`Đã chuyển trạng thái sang: ${statusObj?.label || newStatus}`);
      issueService.getStats().then((s) => setStats(s.data));
    } catch (err) {
      showToast('Không thể đổi trạng thái: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedIssue) return;
    setCommentSubmitting(true);
    try {
      const res = await issueService.addComment(selectedIssue._id, commentText);
      setSelectedIssue(res.data.issue);
      setIssues((prev) =>
        prev.map((item) => (item._id === selectedIssue._id ? res.data.issue : item))
      );
      setCommentText('');
      showToast('Đã gửi phản hồi trao đổi!');
    } catch (err) {
      showToast('Không thể gửi bình luận: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Issue / Bug này không?')) return;
    try {
      await issueService.delete(issueId);
      setIssues((prev) => prev.filter((item) => item._id !== issueId));
      if (selectedIssue && selectedIssue._id === issueId) {
        setSelectedIssue(null);
      }
      showToast('Đã xóa Bug thành công!');
      issueService.getStats().then((s) => setStats(s.data));
    } catch (err) {
      showToast('Lỗi xóa bug: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600 animate-pulse" /> Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3 h-3 text-orange-600" /> High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'improvement':
        return <Sparkles className="w-3.5 h-3.5 text-purple-600" title="Cải tiến (Improvement)" />;
      case 'task':
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" title="Nhiệm vụ (Task)" />;
      default:
        return <Bug className="w-3.5 h-3.5 text-rose-600" title="Lỗi (Bug)" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" onPaste={handlePaste}>
      {/* Jira Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-200">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  QA Bug Tracker
                </h1>
                <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Jira Workspace
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảng quản lý và báo lỗi trực tiếp dành cho QA và Đội ngũ Phát triển
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'board'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-700 shadow-sm transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Báo lỗi mới (Log Bug)</span>
          </button>
        </div>
      </div>

      {/* Jira Quick Statistics Counter */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Issues</p>
            <p className="text-xl font-black text-slate-800 mt-1">{stats.total || 0}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Open
            </p>
            <p className="text-xl font-black text-slate-800 mt-1">{stats.open || 0}</p>
          </div>
          <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress
            </p>
            <p className="text-xl font-black text-blue-800 mt-1">{stats.inProgress || 0}</p>
          </div>
          <div className="bg-violet-50/50 p-3.5 rounded-2xl border border-violet-200 shadow-2xs">
            <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> Resolved
            </p>
            <p className="text-xl font-black text-violet-800 mt-1">{stats.resolved || 0}</p>
          </div>
          <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Ready for QA
            </p>
            <p className="text-xl font-black text-amber-800 mt-1">{stats.readyForQa || 0}</p>
          </div>
          <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-200 shadow-2xs">
            <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> QA Testing
            </p>
            <p className="text-xl font-black text-orange-800 mt-1">{stats.qaTesting || 0}</p>
          </div>
          <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-600" /> Critical
            </p>
            <p className="text-xl font-black text-rose-800 mt-1">{stats.critical || 0}</p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã (MEM-101), tiêu đề lỗi, người báo..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
          >
            <option value="all">Mức độ: Tất cả</option>
            <option value="critical">🔴 Critical (Khẩn cấp)</option>
            <option value="high">🟠 High (Cao)</option>
            <option value="medium">🟡 Medium (Trung bình)</option>
            <option value="low">🟢 Low (Thấp)</option>
          </select>

          {/* Module filter */}
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none max-w-[180px] truncate"
          >
            <option value="all">Module: Tất cả</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {(search || filterPriority !== 'all' || filterModule !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterPriority('all');
                setFilterModule('all');
                setFilterStatus('all');
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Đang tải dữ liệu QA Bug Tracker..." />
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm my-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Không có Issue / Bug nào phù hợp</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hệ thống hiện tại hoạt động rất mượt mà, hoặc các bộ lọc của bạn không khớp với lỗi nào.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
          >
            <PlusCircle className="w-4 h-4" /> Báo lỗi mới ngay
          </button>
        </div>
      ) : viewMode === 'board' ? (
        /* ===== JIRA KANBAN BOARD VIEW ===== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {STATUS_COLUMNS.map((col) => {
            const colIssues = filteredIssues.filter((item) => item.status === col.key);

            return (
              <div
                key={col.key}
                className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-1.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      {col.label}
                    </h3>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
                    {colIssues.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[75vh] pr-0.5">
                  {colIssues.map((issue) => {
                    const totalMedia =
                      (issue.attachments?.length || 0) + (issue.screenshotUrl ? 1 : 0);
                    return (
                      <div
                        key={issue._id}
                        onClick={() => setSelectedIssue(issue)}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group space-y-2.5"
                      >
                        {/* Top key + priority */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {getTypeIcon(issue.type)}
                            <span className="text-xs font-black text-indigo-600 font-mono">
                              {issue.issueKey}
                            </span>
                          </div>
                          {getPriorityBadge(issue.priority)}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition">
                          {issue.title}
                        </h4>

                        {/* Module Tag & Attachments count */}
                        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
                          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 truncate">
                            <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{issue.module || 'General'}</span>
                          </div>

                          {totalMedia > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold shrink-0">
                              <Paperclip className="w-3 h-3" /> {totalMedia}
                            </span>
                          )}
                        </div>

                        {/* Bottom Footer: Reporter + Comments */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                              {issue.reporter?.username?.[0]?.toUpperCase() || 'QA'}
                            </div>
                            <span className="truncate font-semibold text-slate-600">
                              {issue.reporter?.username || 'QA'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            <span>{issue.comments?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colIssues.length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-400 italic">
                      Trống
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== JIRA LIST / TABLE VIEW ===== */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Key</th>
                  <th className="py-3 px-4">Loại</th>
                  <th className="py-3 px-4">Tiêu đề (Summary)</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Media</th>
                  <th className="py-3 px-4">Mức độ</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Người báo</th>
                  <th className="py-3 px-4">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredIssues.map((issue) => {
                  const mediaCount =
                    (issue.attachments?.length || 0) + (issue.screenshotUrl ? 1 : 0);
                  return (
                    <tr
                      key={issue._id}
                      onClick={() => setSelectedIssue(issue)}
                      className="hover:bg-indigo-50/40 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-black text-indigo-600">
                        {issue.issueKey}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {getTypeIcon(issue.type)}
                          <span className="capitalize">{issue.type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                        {issue.title}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-[140px] truncate">
                        {issue.module}
                      </td>
                      <td className="py-3 px-4">
                        {mediaCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                            <Paperclip className="w-3 h-3" /> {mediaCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getPriorityBadge(issue.priority)}</td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {issue.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {issue.reporter?.username || 'QA'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(issue.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== MODAL: TẠO BUG / ISSUE MỚI (VỚI UPLOAD CLOUD & MULTI MEDIA) ===== */}
      {showCreateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Bug className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Báo lỗi mới (Log Issue / Bug)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hỗ trợ tải lên nhiều hình ảnh, video clip hoặc dán trực tiếp (Ctrl + V)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tiêu đề tóm tắt lỗi (Summary) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: Không lật được thẻ flashcard khi nhấn phím Space trên Safari"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-indigo-600 outline-none"
                />
              </div>

              {/* Grid: Type + Priority + Module */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Loại (Type)
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
                  >
                    <option value="bug">🐞 Bug (Lỗi hệ thống)</option>
                    <option value="improvement">⚡ Improvement (Cải tiến)</option>
                    <option value="task">📋 Task (Nhiệm vụ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mức độ (Priority)
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
                  >
                    <option value="critical">🔴 Critical (Chết luồng)</option>
                    <option value="high">🟠 High (Nghiêm trọng)</option>
                    <option value="medium">🟡 Medium (Trung bình)</option>
                    <option value="low">🟢 Low (Nhẹ/Giao diện)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Module / Tính năng
                  </label>
                  <select
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
                  >
                    {MODULES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Steps to Reproduce */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Các bước tái hiện (Steps to Reproduce)
                </label>
                <textarea
                  rows={3}
                  value={formData.stepsToReproduce}
                  onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                  placeholder={`1. Vào trang Thẻ ghi nhớ...\n2. Bấm phím Space để lật...\n3. Thẻ không phản hồi...`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs leading-relaxed outline-none focus:border-indigo-600 font-mono"
                />
              </div>

              {/* Expected vs Actual Result */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                    Kết quả mong đợi (Expected)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.expectedResult}
                    onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                    placeholder="Thẻ lật 3D mượt mà sang mặt sau"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
                    Kết quả thực tế (Actual)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.actualResult}
                    onChange={(e) => setFormData({ ...formData, actualResult: e.target.value })}
                    placeholder="Thẻ đứng yên, console báo lỗi removeChild..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              {/* Environment Info */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Môi trường thử nghiệm (Browser / Device)
                </label>
                <input
                  type="text"
                  value={formData.browserEnv}
                  onChange={(e) => setFormData({ ...formData, browserEnv: e.target.value })}
                  placeholder="Chrome 130 trên Windows 11"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              {/* ===== UPLOAD CLOUD: HÌNH ẢNH & VIDEO MINH CHỨNG ===== */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    Tải lên hình ảnh & video minh chứng ({formData.attachments.length})
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    {showUrlInput ? 'Ẩn nhập link' : '+ Thêm bằng link URL'}
                  </button>
                </div>

                {/* External URL Input (Optional) */}
                {showUrlInput && (
                  <div className="flex gap-2 mb-3 animate-in fade-in duration-150">
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="Dán link ảnh hoặc video (VD: Loom, Imgur, direct link)..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddExternalUrl}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-black transition"
                    >
                      Thêm
                    </button>
                  </div>
                )}

                {/* Cloud Drag & Drop Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) {
                      processFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${isDragging
                      ? 'border-indigo-600 bg-indigo-50/70 scale-[0.99]'
                      : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 bg-slate-50/50'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => processFiles(e.target.files)}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                    <UploadCloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Kéo thả nhiều hình ảnh & video vào đây, hoặc <span className="text-indigo-600 underline">bấm để chọn</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hỗ trợ JPG, PNG, GIF, WEBP, MP4, WEBM (hoặc nhấn <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-700">Ctrl + V</kbd> để dán ảnh chụp màn hình trực tiếp)
                  </p>
                </div>

                {/* Uploaded Attachments Grid Preview */}
                {formData.attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {formData.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-900 aspect-video flex items-center justify-center shadow-xs"
                      >
                        {att.type === 'video' ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                            <video
                              src={att.url}
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                                <Play className="w-4 h-4 fill-white" />
                              </div>
                            </div>
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <Film className="w-2.5 h-2.5" /> Video
                            </span>
                          </div>
                        ) : (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Top Info Overlay */}
                        <div className="absolute inset-x-0 top-0 p-1.5 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between opacity-90">
                          <span className="text-[10px] font-semibold text-white truncate max-w-[80%]">
                            {att.name || `Tệp ${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAttachment(idx);
                            }}
                            className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Size badge */}
                        {att.size > 0 && (
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                            {formatFileSize(att.size)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Bug className="w-4 h-4" />
                  <span>{creating ? 'Đang tạo Issue...' : 'Tạo Issue (Submit Bug)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: CHỈNH SỬA BUG / ISSUE (EDIT BUG LOG) ===== */}
      {showEditModal && editFormData && selectedIssue && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Chỉnh sửa Bug: <span className="font-mono text-indigo-600">{selectedIssue.issueKey}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cập nhật lại thông tin lỗi, các bước tái hiện hoặc đính kèm thêm ảnh/video
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {editErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tiêu đề tóm tắt lỗi (Summary) *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="VD: Không lật được thẻ flashcard khi nhấn phím Space trên Safari"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-indigo-600 outline-none"
                />
              </div>

              {/* Grid: Type + Priority + Status + Module */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Loại (Type)
                  </label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
                  >
                    <option value="bug">🐞 Bug (Lỗi)</option>
                    <option value="improvement">⚡ Improvement</option>
                    <option value="task">📋 Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mức độ (Priority)
                  </label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
                  >
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng thái (Status)
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
                  >
                    <option value="open">⚪ Open (Mở)</option>
                    <option value="in_progress">🔵 In Progress (Đang xử lý)</option>
                    <option value="resolved">🟣 Resolved (Đã sửa)</option>
                    <option value="ready_for_qa">🟡 Ready for QA (Chờ kiểm thử)</option>
                    <option value="qa_testing">🟠 QA Testing (Đang kiểm thử)</option>
                    <option value="closed">⬛ Closed (Đã đóng)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Module
                  </label>
                  <select
                    value={editFormData.module}
                    onChange={(e) => setEditFormData({ ...editFormData, module: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none truncate"
                  >
                    {MODULES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Steps to Reproduce */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Các bước tái hiện (Steps to Reproduce)
                </label>
                <textarea
                  rows={3}
                  value={editFormData.stepsToReproduce}
                  onChange={(e) => setEditFormData({ ...editFormData, stepsToReproduce: e.target.value })}
                  placeholder={`1. Vào trang Thẻ ghi nhớ...\n2. Bấm phím Space để lật...\n3. Thẻ không phản hồi...`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs leading-relaxed outline-none focus:border-indigo-600 font-mono"
                />
              </div>

              {/* Expected vs Actual Result */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                    Kết quả mong đợi (Expected)
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.expectedResult}
                    onChange={(e) => setEditFormData({ ...editFormData, expectedResult: e.target.value })}
                    placeholder="Thẻ lật 3D mượt mà sang mặt sau"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
                    Kết quả thực tế (Actual)
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.actualResult}
                    onChange={(e) => setEditFormData({ ...editFormData, actualResult: e.target.value })}
                    placeholder="Thẻ đứng yên, console báo lỗi removeChild..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              {/* Environment Info */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Môi trường thử nghiệm (Browser / Device)
                </label>
                <input
                  type="text"
                  value={editFormData.browserEnv}
                  onChange={(e) => setEditFormData({ ...editFormData, browserEnv: e.target.value })}
                  placeholder="Chrome 130 trên Windows 11"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              {/* ===== UPLOAD CLOUD: HÌNH ẢNH & VIDEO TRONG EDIT ===== */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    Hình ảnh & video đính kèm ({editFormData.attachments?.length || 0})
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowEditUrlInput(!showEditUrlInput)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    {showEditUrlInput ? 'Ẩn nhập link' : '+ Thêm bằng link URL'}
                  </button>
                </div>

                {/* External URL Input */}
                {showEditUrlInput && (
                  <div className="flex gap-2 mb-3 animate-in fade-in duration-150">
                    <input
                      type="url"
                      value={editExternalUrl}
                      onChange={(e) => setEditExternalUrl(e.target.value)}
                      placeholder="Dán link ảnh hoặc video ngoài..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddEditExternalUrl}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-black transition"
                    >
                      Thêm
                    </button>
                  </div>
                )}

                {/* Cloud Drag & Drop Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsEditDragging(true);
                  }}
                  onDragLeave={() => setIsEditDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsEditDragging(false);
                    if (e.dataTransfer.files) {
                      processEditFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => editFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${isEditDragging
                      ? 'border-indigo-600 bg-indigo-50/70 scale-[0.99]'
                      : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 bg-slate-50/50'
                    }`}
                >
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => processEditFiles(e.target.files)}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                    <UploadCloud className="w-5 h-5 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Kéo thả thêm tệp vào đây, hoặc <span className="text-indigo-600 underline">bấm để tải lên</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Hỗ trợ dán ảnh chụp màn hình trực tiếp bằng phím <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-700">Ctrl + V</kbd>
                  </p>
                </div>

                {/* Attachments List Preview in Edit */}
                {editFormData.attachments && editFormData.attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {editFormData.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-900 aspect-video flex items-center justify-center shadow-xs"
                      >
                        {att.type === 'video' ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                            <video
                              src={att.url}
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                                <Play className="w-4 h-4 fill-white" />
                              </div>
                            </div>
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <Film className="w-2.5 h-2.5" /> Video
                            </span>
                          </div>
                        ) : (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Top Info Overlay */}
                        <div className="absolute inset-x-0 top-0 p-1.5 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between opacity-90">
                          <span className="text-[10px] font-semibold text-white truncate max-w-[80%]">
                            {att.name || `Tệp ${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveEditAttachment(idx);
                            }}
                            className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Size badge */}
                        {att.size > 0 && (
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                            {formatFileSize(att.size)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{updating ? 'Đang lưu...' : 'Lưu thay đổi (Save Changes)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: CHI TIẾT BUG & TRAO ĐỔI (JIRA ISSUE DETAIL DRAWER) ===== */}
      {selectedIssue && !showEditModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedIssue(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                {getTypeIcon(selectedIssue.type)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-indigo-600">
                      {selectedIssue.issueKey}
                    </span>
                    {getPriorityBadge(selectedIssue.priority)}
                  </div>
                  <h3 className="text-base font-black text-slate-900 line-clamp-1 mt-0.5">
                    {selectedIssue.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Switcher Dropdown */}
                <select
                  value={selectedIssue.status}
                  onChange={(e) => handleStatusChange(selectedIssue._id, e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-slate-300 text-indigo-700 outline-none shadow-2xs"
                >
                  <option value="open">⚪ Mở (Open)</option>
                  <option value="in_progress">🔵 Đang xử lý (In Progress)</option>
                  <option value="resolved">🟣 Đã sửa (Resolved)</option>
                  <option value="ready_for_qa">🟡 Chờ QA Test (Ready for QA)</option>
                  <option value="qa_testing">🟠 Đang kiểm thử (QA Testing)</option>
                  <option value="closed">⬛ Đã đóng (Closed)</option>
                </select>

                {/* Nút Chỉnh sửa Bug Log */}
                <button
                  onClick={() => handleStartEdit(selectedIssue)}
                  title="Chỉnh sửa toàn bộ thông tin Bug"
                  className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 bg-white transition flex items-center gap-1 text-xs font-bold"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sửa</span>
                </button>

                <button
                  onClick={() => handleDeleteIssue(selectedIssue._id)}
                  title="Xóa Issue này"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedIssue(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content & Comments split */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Module</span>
                  <span className="font-bold text-slate-800">{selectedIssue.module || 'General'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Người báo</span>
                  <span className="font-bold text-slate-800">{selectedIssue.reporter?.username || 'QA'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Ngày tạo</span>
                  <span className="font-bold text-slate-800">
                    {new Date(selectedIssue.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Môi trường</span>
                  <span className="font-semibold text-slate-700 truncate block" title={selectedIssue.browserEnv}>
                    {selectedIssue.browserEnv || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Steps to Reproduce */}
              {selectedIssue.stepsToReproduce && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-indigo-600" /> Các bước tái hiện
                  </h4>
                  <pre className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedIssue.stepsToReproduce}
                  </pre>
                </div>
              )}

              {/* Expected vs Actual Result */}
              {(selectedIssue.expectedResult || selectedIssue.actualResult) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {selectedIssue.expectedResult && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <span className="font-bold text-emerald-800 block text-[11px] uppercase mb-1">
                        ✓ Kết quả mong đợi
                      </span>
                      <p className="text-slate-700 leading-relaxed">{selectedIssue.expectedResult}</p>
                    </div>
                  )}
                  {selectedIssue.actualResult && (
                    <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                      <span className="font-bold text-rose-800 block text-[11px] uppercase mb-1">
                        ✗ Kết quả thực tế
                      </span>
                      <p className="text-slate-700 leading-relaxed">{selectedIssue.actualResult}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ===== ATTACHMENTS GALLERY: HÌNH ẢNH & VIDEO MINH CHỨNG ===== */}
              {((selectedIssue.attachments && selectedIssue.attachments.length > 0) || selectedIssue.screenshotUrl) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                      Hình ảnh & Video đính kèm ({selectedIssue.attachments?.length || (selectedIssue.screenshotUrl ? 1 : 0)})
                    </h4>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(selectedIssue)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      + Thêm/Sửa tệp
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Render new attachments format */}
                    {selectedIssue.attachments && selectedIssue.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedIssue.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 shadow-xs"
                          >
                            {att.type === 'video' ? (
                              <div className="p-2 space-y-1.5">
                                <video
                                  controls
                                  preload="metadata"
                                  src={att.url}
                                  className="w-full rounded-xl bg-black max-h-56"
                                />
                                <div className="flex items-center justify-between px-1 text-[11px] text-white">
                                  <span className="truncate max-w-[70%] font-semibold">{att.name || 'Video lỗi'}</span>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-300 hover:text-white flex items-center gap-1 font-bold"
                                  >
                                    Mở rộng <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => setLightboxMedia(att)}
                                className="cursor-pointer group relative aspect-video flex items-center justify-center overflow-hidden"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name || 'Screenshot'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                                  <Maximize2 className="w-4 h-4" /> Bấm để phóng to
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Backwards compatibility for single screenshotUrl */
                      <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-80 bg-slate-900 flex items-center justify-center">
                        <img
                          src={selectedIssue.screenshotUrl}
                          alt="Bug Screenshot"
                          onClick={() => setLightboxMedia({ url: selectedIssue.screenshotUrl, type: 'image' })}
                          className="max-h-80 object-contain cursor-pointer hover:opacity-95 transition"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Discussion Thread (QA & Dev Comments) */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  Trao đổi & Thảo luận ({selectedIssue.comments?.length || 0})
                </h4>

                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                  {selectedIssue.comments?.map((c, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700">
                          {c.author?.username || 'Dev/QA'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString('vi-VN')} {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{c.content}</p>
                    </div>
                  ))}

                  {(!selectedIssue.comments || selectedIssue.comments.length === 0) && (
                    <p className="text-xs text-slate-400 italic">Chưa có bình luận trao đổi nào.</p>
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Viết phản hồi (VD: Đã fix trên commit mới, QA test lại nhé)..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || !commentText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== LIGHTBOX MODAL (XEM ẢNH PHÓNG TO - Z-[9999] NẰM TRÊN TẤT CẢ MODAL) ===== */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
        >
          {/* Top Control Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between pb-3 text-white text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <span className="truncate max-w-md font-bold text-slate-200">
                {lightboxMedia.name || 'Ảnh minh chứng lỗi'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={lightboxMedia.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition"
              >
                <span>Mở tab mới</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setLightboxMedia(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition flex items-center gap-1"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Centered Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[85vh] flex items-center justify-center"
          >
            <img
              src={lightboxMedia.url}
              alt="Full Preview"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Nhấp ra ngoài hoặc nhấn phím <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Esc</kbd> để đóng
          </p>
        </div>
      )}

      {/* ===== FLOATING TOAST NOTIFICATION ===== */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
