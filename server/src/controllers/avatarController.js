import Avatar from '../models/Avatar.js';

// Danh sách bộ mẫu avatar ban đầu đầy đủ (Characters, Robots, Emoji, Intellectual, Memes)
export const DEFAULT_AVATARS = [
  // --- NHÂN VẬT & ANIME (Characters) ---
  { name: 'Luna', category: 'characters', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc', order: 1 },
  { name: 'Felix', category: 'characters', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4', order: 2 },
  { name: 'Pepper', category: 'characters', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Pepper&backgroundColor=ffdfbf', order: 3 },
  { name: 'Whiskers', category: 'characters', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Whiskers&backgroundColor=c0aede', order: 4 },
  { name: 'Mimi', category: 'characters', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Mimi&backgroundColor=ffd5dc', order: 5 },
  { name: 'Kenji', category: 'characters', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Kenji&backgroundColor=d1d4f9', order: 6 },
  { name: 'Sakura', category: 'characters', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sakura&backgroundColor=ffdfbf', order: 7 },
  { name: 'Sam', category: 'characters', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=b6e3f4', order: 8 },
  { name: 'Alex', category: 'characters', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=c0aede', order: 9 },

  // --- ROBOT & TƯƠNG LAI (Robots) ---
  { name: 'Cosmo', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo&backgroundColor=b6e3f4', order: 10 },
  { name: 'Sparky', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky&backgroundColor=ffd5dc', order: 11 },
  { name: 'Aneka', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=d1d4f9', order: 12 },
  { name: 'Gizmo', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo&backgroundColor=ffdfbf', order: 13 },
  { name: 'Echo', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Echo&backgroundColor=c0aede', order: 14 },
  { name: 'Pixel', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel&backgroundColor=b6e3f4', order: 15 },
  { name: 'Titan', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Titan&backgroundColor=d1d4f9', order: 16 },
  { name: 'Bolt', category: 'robots', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bolt&backgroundColor=ffdfbf', order: 17 },

  // --- EMOJI & VUI VẺ (Emoji & Fun) ---
  { name: 'Ngôi sao', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star&backgroundColor=ffdfbf', order: 18 },
  { name: 'Tia chớp', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Spark&backgroundColor=ffd5dc', order: 19 },
  { name: 'Hạnh phúc', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy&backgroundColor=b6e3f4', order: 20 },
  { name: 'Bánh Cookie', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cookie&backgroundColor=ffdfbf', order: 21 },
  { name: 'Ánh dương', category: 'emoji', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sunny&backgroundColor=c0aede', order: 22 },
  { name: 'Rạng rỡ', category: 'emoji', url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Daisy&backgroundColor=ffd5dc', order: 23 },
  { name: 'Nụ cười', category: 'emoji', url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Leo&backgroundColor=b6e3f4', order: 24 },
  { name: 'Niềm vui', category: 'emoji', url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Joy&backgroundColor=d1d4f9', order: 25 },

  // --- TRI THỨC & NGHỆ THUẬT (Intellectual & Minimal) ---
  { name: 'Oliver', category: 'intellectual', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Oliver&backgroundColor=e8e8e8', order: 26 },
  { name: 'Milo', category: 'intellectual', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Milo&backgroundColor=ffd5dc', order: 27 },
  { name: 'Lucas', category: 'intellectual', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Lucas&backgroundColor=b6e3f4', order: 28 },
  { name: 'Chloe', category: 'intellectual', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Chloe&backgroundColor=c0aede', order: 29 },
  { name: 'Micah', category: 'intellectual', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Micah&backgroundColor=ffdfbf', order: 30 },
  { name: 'Zoe', category: 'intellectual', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Zoe&backgroundColor=d1d4f9', order: 31 },
  { name: 'Maya', category: 'intellectual', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Maya&backgroundColor=ffd5dc', order: 32 },
  { name: 'Leo', category: 'intellectual', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Leo&backgroundColor=b6e3f4', order: 33 },

  // --- MEME BẤT HỦ (Iconic Memes) ---
  { name: 'Doge', category: 'memes', url: 'https://i.imgflip.com/4t0m5.jpg', order: 34 },
  { name: 'Buff Doge vs Cheems', category: 'memes', url: 'https://i.imgflip.com/43a45p.png', order: 35 },
  { name: 'Hide the Pain Harold', category: 'memes', url: 'https://i.imgflip.com/gk5el.jpg', order: 36 },
  { name: 'Roll Safe (IQ 200)', category: 'memes', url: 'https://i.imgflip.com/1h7in3.jpg', order: 37 },
  { name: 'Disaster Girl', category: 'memes', url: 'https://i.imgflip.com/23ls.jpg', order: 38 },
  { name: 'This Is Fine', category: 'memes', url: 'https://i.imgflip.com/wxica.jpg', order: 39 },
  { name: 'Monkey Puppet', category: 'memes', url: 'https://i.imgflip.com/2gnnjh.jpg', order: 40 },
  { name: 'Surprised Pikachu', category: 'memes', url: 'https://i.imgflip.com/2kbn1e.jpg', order: 41 },
  { name: 'Mocking Spongebob', category: 'memes', url: 'https://i.imgflip.com/1otk96.jpg', order: 42 },
  { name: 'Smudge the Cat', category: 'memes', url: 'https://i.imgflip.com/345v97.jpg', order: 43 },
  { name: 'Tuxedo Pooh', category: 'memes', url: 'https://i.imgflip.com/2ybua0.png', order: 44 },
  { name: 'Megamind (No Bitches?)', category: 'memes', url: 'https://i.imgflip.com/64sz4u.png', order: 45 },
  { name: 'Success Kid', category: 'memes', url: 'https://i.imgflip.com/1bhk.jpg', order: 46 },
  { name: 'Clown Makeup', category: 'memes', url: 'https://i.imgflip.com/38el31.jpg', order: 47 },
  { name: 'Panik Kalm Panik', category: 'memes', url: 'https://i.imgflip.com/3qqcim.png', order: 48 },
  { name: 'Absolute Cinema', category: 'memes', url: 'https://i.imgflip.com/8d317n.png', order: 49 },
  { name: 'Sad Pablo Escobar', category: 'memes', url: 'https://i.imgflip.com/1c1uej.jpg', order: 50 },
  { name: 'Evil Kermit', category: 'memes', url: 'https://i.imgflip.com/1e7ql7.jpg', order: 51 },
  { name: 'Expanding Brain', category: 'memes', url: 'https://i.imgflip.com/1jwhww.jpg', order: 52 },
  { name: 'Drake Hotline Bling', category: 'memes', url: 'https://i.imgflip.com/30b1gx.jpg', order: 53 },
  { name: 'Distracted Boyfriend', category: 'memes', url: 'https://i.imgflip.com/1ur9b0.jpg', order: 54 },
  { name: 'Bernie Sanders', category: 'memes', url: 'https://i.imgflip.com/3oevdk.jpg', order: 55 },
  { name: 'Ancient Aliens', category: 'memes', url: 'https://i.imgflip.com/26am.jpg', order: 56 },
];

// @desc    Lấy danh sách avatar công khai cho người dùng chọn (isActive: true)
// @route   GET /api/avatars
// @access  Public
export const getPublicAvatars = async (req, res) => {
  try {
    let avatars = await Avatar.find({ isActive: true }).sort({ order: 1, createdAt: -1 });

    // Tự động nạp mẫu mặc định nếu DB chưa có bản ghi nào
    if (avatars.length === 0) {
      const count = await Avatar.countDocuments();
      if (count === 0) {
        await Avatar.insertMany(DEFAULT_AVATARS);
        avatars = await Avatar.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
      }
    }

    res.status(200).json({
      status: 'success',
      results: avatars.length,
      data: { avatars },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Lấy toàn bộ danh sách avatar cho Admin (cả ẩn và hiện)
// @route   GET /api/admin/avatars
// @access  Admin
export const getAdminAvatars = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const avatars = await Avatar.find(filter).sort({ order: 1, createdAt: -1 });

    // Thống kê nhanh
    const total = await Avatar.countDocuments();
    const activeCount = await Avatar.countDocuments({ isActive: true });
    const categoryStats = await Avatar.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: 'success',
      results: avatars.length,
      data: {
        avatars,
        stats: {
          total,
          activeCount,
          inactiveCount: total - activeCount,
          categoryStats,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Thêm mới avatar (Admin)
// @route   POST /api/admin/avatars
// @access  Admin
export const createAvatar = async (req, res) => {
  try {
    const { name, category, url, isActive, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'fail', message: 'Vui lòng cung cấp tên avatar' });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({ status: 'fail', message: 'Vui lòng cung cấp đường dẫn ảnh (URL hoặc Data URI)' });
    }

    const newAvatar = await Avatar.create({
      name: name.trim(),
      category: category ? category.trim() : 'characters',
      url: url.trim(),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      order: Number(order) || 0,
    });

    res.status(201).json({
      status: 'success',
      message: 'Thêm avatar mới thành công',
      data: { avatar: newAvatar },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Cập nhật thông tin avatar (Admin)
// @route   PUT /api/admin/avatars/:id
// @access  Admin
export const updateAvatar = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, url, isActive, order } = req.body;

    const avatar = await Avatar.findById(id);
    if (!avatar) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy avatar' });
    }

    if (name !== undefined) avatar.name = name.trim();
    if (category !== undefined) avatar.category = category.trim();
    if (url !== undefined) avatar.url = url.trim();
    if (isActive !== undefined) avatar.isActive = Boolean(isActive);
    if (order !== undefined) avatar.order = Number(order);

    await avatar.save();

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật avatar thành công',
      data: { avatar },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Xóa avatar (Admin)
// @route   DELETE /api/admin/avatars/:id
// @access  Admin
export const deleteAvatar = async (req, res) => {
  try {
    const { id } = req.params;
    const avatar = await Avatar.findByIdAndDelete(id);

    if (!avatar) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy avatar để xóa' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Đã xóa avatar khỏi bộ sưu tập',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Nạp lại / Khôi phục toàn bộ 57+ avatar mẫu kinh điển (Admin)
// @route   POST /api/admin/avatars/seed-defaults
// @access  Admin
export const seedDefaultAvatars = async (req, res) => {
  try {
    const { mode } = req.body; // 'reset' (xóa hết nạp lại) hoặc 'append' (thêm cái chưa có)

    if (mode === 'reset') {
      await Avatar.deleteMany({});
      await Avatar.insertMany(DEFAULT_AVATARS);
    } else {
      // Append: chỉ thêm những avatar chưa có theo name
      for (const item of DEFAULT_AVATARS) {
        const exist = await Avatar.findOne({ name: item.name });
        if (!exist) {
          await Avatar.create(item);
        }
      }
    }

    const all = await Avatar.find().sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      status: 'success',
      message: 'Đã nạp thành công bộ sưu tập avatar mẫu vào hệ thống',
      results: all.length,
      data: { avatars: all },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
