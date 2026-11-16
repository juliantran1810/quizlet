// Danh sách các bộ mẫu Avatar sinh động và đa dạng chủ đề cho người dùng Memora

export const AVATAR_CATEGORIES = [
  { id: 'all', labelKey: 'account.avatar_cat_all', icon: 'Sparkles', defaultLabel: 'Tất cả' },
  { id: 'characters', labelKey: 'account.avatar_cat_characters', icon: 'User', defaultLabel: 'Nhân vật & Anime' },
  { id: 'robots', labelKey: 'account.avatar_cat_robots', icon: 'Bot', defaultLabel: 'Robot & Tương lai' },
  { id: 'emoji', labelKey: 'account.avatar_cat_emoji', icon: 'Smile', defaultLabel: 'Emoji & Vui vẻ' },
  { id: 'intellectual', labelKey: 'account.avatar_cat_intellectual', icon: 'BookOpen', defaultLabel: 'Tri thức & Nghệ thuật' },
  { id: 'memes', labelKey: 'account.avatar_cat_memes', icon: 'Laugh', defaultLabel: 'Meme Bất Hủ' },
];

// Bộ màu nền pastel sinh động
const PASTEL_BG = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

export const PRESET_AVATARS = [
  // --- NHÂN VẬT & ANIME (Characters) ---
  {
    id: 'char-luna',
    category: 'characters',
    name: 'Luna',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc',
  },
  {
    id: 'char-felix',
    category: 'characters',
    name: 'Felix',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4',
  },
  {
    id: 'char-pepper',
    category: 'characters',
    name: 'Pepper',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Pepper&backgroundColor=ffdfbf',
  },
  {
    id: 'char-whiskers',
    category: 'characters',
    name: 'Whiskers',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Whiskers&backgroundColor=c0aede',
  },
  {
    id: 'char-mimi',
    category: 'characters',
    name: 'Mimi',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Mimi&backgroundColor=ffd5dc',
  },
  {
    id: 'char-kenji',
    category: 'characters',
    name: 'Kenji',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Kenji&backgroundColor=d1d4f9',
  },
  {
    id: 'char-sakura',
    category: 'characters',
    name: 'Sakura',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sakura&backgroundColor=ffdfbf',
  },
  {
    id: 'char-sam',
    category: 'characters',
    name: 'Sam',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=b6e3f4',
  },
  {
    id: 'char-alex',
    category: 'characters',
    name: 'Alex',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=c0aede',
  },

  // --- ROBOT & TƯƠNG LAI (Robots) ---
  {
    id: 'bot-cosmo',
    category: 'robots',
    name: 'Cosmo',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo&backgroundColor=b6e3f4',
  },
  {
    id: 'bot-sparky',
    category: 'robots',
    name: 'Sparky',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky&backgroundColor=ffd5dc',
  },
  {
    id: 'bot-aneka',
    category: 'robots',
    name: 'Aneka',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=d1d4f9',
  },
  {
    id: 'bot-gizmo',
    category: 'robots',
    name: 'Gizmo',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo&backgroundColor=ffdfbf',
  },
  {
    id: 'bot-echo',
    category: 'robots',
    name: 'Echo',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Echo&backgroundColor=c0aede',
  },
  {
    id: 'bot-pixel',
    category: 'robots',
    name: 'Pixel',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel&backgroundColor=b6e3f4',
  },
  {
    id: 'bot-titan',
    category: 'robots',
    name: 'Titan',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Titan&backgroundColor=d1d4f9',
  },
  {
    id: 'bot-bolt',
    category: 'robots',
    name: 'Bolt',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bolt&backgroundColor=ffdfbf',
  },

  // --- EMOJI & VUI VẺ (Emoji & Fun) ---
  {
    id: 'emo-star',
    category: 'emoji',
    name: 'Ngôi sao',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star&backgroundColor=ffdfbf',
  },
  {
    id: 'emo-spark',
    category: 'emoji',
    name: 'Tia chớp',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Spark&backgroundColor=ffd5dc',
  },
  {
    id: 'emo-happy',
    category: 'emoji',
    name: 'Hạnh phúc',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy&backgroundColor=b6e3f4',
  },
  {
    id: 'emo-cookie',
    category: 'emoji',
    name: 'Bánh Cookie',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cookie&backgroundColor=ffdfbf',
  },
  {
    id: 'emo-sunny',
    category: 'emoji',
    name: 'Ánh dương',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sunny&backgroundColor=c0aede',
  },
  {
    id: 'emo-daisy',
    category: 'emoji',
    name: 'Rạng rỡ',
    url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Daisy&backgroundColor=ffd5dc',
  },
  {
    id: 'emo-leo',
    category: 'emoji',
    name: 'Nụ cười',
    url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Leo&backgroundColor=b6e3f4',
  },
  {
    id: 'emo-joy',
    category: 'emoji',
    name: 'Niềm vui',
    url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Joy&backgroundColor=d1d4f9',
  },

  // --- TRI THỨC & NGHỆ THUẬT (Intellectual & Minimal) ---
  {
    id: 'notion-oliver',
    category: 'intellectual',
    name: 'Oliver',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Oliver&backgroundColor=e8e8e8',
  },
  {
    id: 'notion-milo',
    category: 'intellectual',
    name: 'Milo',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Milo&backgroundColor=ffd5dc',
  },
  {
    id: 'notion-lucas',
    category: 'intellectual',
    name: 'Lucas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Lucas&backgroundColor=b6e3f4',
  },
  {
    id: 'notion-chloe',
    category: 'intellectual',
    name: 'Chloe',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Chloe&backgroundColor=c0aede',
  },
  {
    id: 'art-micah',
    category: 'intellectual',
    name: 'Micah',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=Micah&backgroundColor=ffdfbf',
  },
  {
    id: 'art-zoe',
    category: 'intellectual',
    name: 'Zoe',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=Zoe&backgroundColor=d1d4f9',
  },
  {
    id: 'art-maya',
    category: 'intellectual',
    name: 'Maya',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=Maya&backgroundColor=ffd5dc',
  },
  {
    id: 'art-leo',
    category: 'intellectual',
    name: 'Leo',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=Leo&backgroundColor=b6e3f4',
  },

  // --- MEME BẤT HỦ (Iconic Memes) ---
  {
    id: 'meme-doge',
    category: 'memes',
    name: 'Doge',
    url: 'https://i.imgflip.com/4t0m5.jpg',
  },
  {
    id: 'meme-cheems',
    category: 'memes',
    name: 'Buff Doge vs Cheems',
    url: 'https://i.imgflip.com/43a45p.png',
  },
  {
    id: 'meme-harold',
    category: 'memes',
    name: 'Hide the Pain Harold',
    url: 'https://i.imgflip.com/gk5el.jpg',
  },
  {
    id: 'meme-rollsafe',
    category: 'memes',
    name: 'Roll Safe (IQ 200)',
    url: 'https://i.imgflip.com/1h7in3.jpg',
  },
  {
    id: 'meme-disaster-girl',
    category: 'memes',
    name: 'Disaster Girl',
    url: 'https://i.imgflip.com/23ls.jpg',
  },
  {
    id: 'meme-this-is-fine',
    category: 'memes',
    name: 'This Is Fine',
    url: 'https://i.imgflip.com/wxica.jpg',
  },
  {
    id: 'meme-monkey-puppet',
    category: 'memes',
    name: 'Monkey Puppet',
    url: 'https://i.imgflip.com/2gnnjh.jpg',
  },
  {
    id: 'meme-pikachu',
    category: 'memes',
    name: 'Surprised Pikachu',
    url: 'https://i.imgflip.com/2kbn1e.jpg',
  },
  {
    id: 'meme-spongebob',
    category: 'memes',
    name: 'Mocking Spongebob',
    url: 'https://i.imgflip.com/1otk96.jpg',
  },
  {
    id: 'meme-smudge-cat',
    category: 'memes',
    name: 'Smudge the Cat',
    url: 'https://i.imgflip.com/345v97.jpg',
  },
  {
    id: 'meme-tuxedo-pooh',
    category: 'memes',
    name: 'Tuxedo Pooh',
    url: 'https://i.imgflip.com/2ybua0.png',
  },
  {
    id: 'meme-megamind',
    category: 'memes',
    name: 'Megamind (No Bitches?)',
    url: 'https://i.imgflip.com/64sz4u.png',
  },
  {
    id: 'meme-success-kid',
    category: 'memes',
    name: 'Success Kid',
    url: 'https://i.imgflip.com/1bhk.jpg',
  },
  {
    id: 'meme-clown',
    category: 'memes',
    name: 'Clown Makeup',
    url: 'https://i.imgflip.com/38el31.jpg',
  },
  {
    id: 'meme-panik',
    category: 'memes',
    name: 'Panik Kalm Panik',
    url: 'https://i.imgflip.com/3qqcim.png',
  },
  {
    id: 'meme-cinema',
    category: 'memes',
    name: 'Absolute Cinema',
    url: 'https://i.imgflip.com/8d317n.png',
  },
  {
    id: 'meme-sad-pablo',
    category: 'memes',
    name: 'Sad Pablo Escobar',
    url: 'https://i.imgflip.com/1c1uej.jpg',
  },
  {
    id: 'meme-evil-kermit',
    category: 'memes',
    name: 'Evil Kermit',
    url: 'https://i.imgflip.com/1e7ql7.jpg',
  },
  {
    id: 'meme-expanding-brain',
    category: 'memes',
    name: 'Expanding Brain',
    url: 'https://i.imgflip.com/1jwhww.jpg',
  },
  {
    id: 'meme-drake',
    category: 'memes',
    name: 'Drake Hotline Bling',
    url: 'https://i.imgflip.com/30b1gx.jpg',
  },
  {
    id: 'meme-distracted-bf',
    category: 'memes',
    name: 'Distracted Boyfriend',
    url: 'https://i.imgflip.com/1ur9b0.jpg',
  },
  {
    id: 'meme-bernie',
    category: 'memes',
    name: 'Bernie Sanders',
    url: 'https://i.imgflip.com/3oevdk.jpg',
  },
  {
    id: 'meme-aliens',
    category: 'memes',
    name: 'Ancient Aliens',
    url: 'https://i.imgflip.com/26am.jpg',
  },
];

// Hàm tạo ngẫu nhiên một bộ avatar sinh động mới (để người dùng nhấn nút Đổi ngẫu nhiên 🎲)
export const generateRandomAvatars = (count = 8) => {
  const styles = ['adventurer', 'lorelei', 'bottts', 'fun-emoji', 'big-smile', 'notionists', 'micah'];
  const generated = [];

  for (let i = 0; i < count; i++) {
    const style = styles[Math.floor(Math.random() * styles.length)];
    const seed = Math.random().toString(36).substring(2, 9);
    const bg = PASTEL_BG[Math.floor(Math.random() * PASTEL_BG.length)];
    generated.push({
      id: `random-${style}-${seed}`,
      category: 'random',
      name: `Mẫu #${i + 1}`,
      url: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${bg}`,
    });
  }

  return generated;
};
