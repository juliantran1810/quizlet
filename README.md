# 📚 Memora - Nền Tảng Học Flashcard Thông Minh (Web & Mobile)

Hệ sinh thái học tập đa nền tảng (Web + Mobile App) với đầy đủ chế độ Flashcard 3D, Trắc nghiệm (Quiz Mode), Game Ghép từ (Match Game), Học Gõ Từ (Learn Mode), Thuật toán Lặp lại ngắt quãng (Leitner 5 Box) và Chuỗi ngày học liên tục (Daily Streak 🔥).

---

## 🛠 1. Công nghệ Sử dụng (Tech Stack)

- **Mobile App (React Native / Expo):**
  - Expo SDK (Chạy trên iOS & Android qua Expo Go)
  - React Navigation (Native Stack)
  - AsyncStorage (Lưu trữ JWT & phiên đăng nhập)
  - Expo Speech (Phát âm giọng bản xứ Tiếng Trung zh-CN & Tiếng Anh en-US)
  - Axios (Kết nối đồng bộ với Backend)
- **Web Client:**
  - React 18 (Vite)
  - Tailwind CSS (Giao diện chuẩn Memora)
  - Framer Motion (Hiệu ứng 3D xoay lật thẻ)
  - Lucide React & Canvas Confetti
  - Web Speech API
- **Backend:**
  - Node.js & Express.js (ES Modules, Body limit 10MB)
  - JWT (JSON Web Token) & bcryptjs
  - Morgan & CORS
- **Database:**
  - MongoDB & Mongoose ORM

---

## 📁 2. Cấu trúc Thư mục

```text
quizlet/
├── server/
│   ├── src/
│   │   ├── config/db.js             # Kết nối MongoDB
│   │   ├── models/                  # Mongoose Schemas (User, Deck, UserProgress)
│   │   ├── controllers/             # Logic nghiệp vụ (Auth, Deck, Progress)
│   │   ├── middlewares/             # Xác thực JWT (authMiddleware)
│   │   ├── routes/                  # RESTful API Endpoints
│   │   ├── utils/                   # Hàm tạo JWT token
│   │   ├── seeder.js                # Nạp dữ liệu mẫu ban đầu
│   │   └── server.js                # Cổng khởi động Express Server
│   ├── .env                         # Cấu hình PORT, MONGODB_URI, JWT_SECRET
│   └── package.json
└── client/
    ├── src/
    │   ├── components/              # Flashcard3D, Navbar, Footer, Spinner
    │   ├── context/                 # AuthContext (Đăng nhập, Đăng ký, Quản lý Token)
    │   ├── pages/                   # HomePage, Detail, Create/Edit, Flashcards, Quiz, Match
    │   ├── services/api.js          # Cấu hình Axios & API calls
    │   ├── App.jsx                  # React Router v6
    │   └── main.jsx
    ├── index.html
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 3. Hướng dẫn Khởi chạy Dự án

### Bước 1: Khởi động Backend (Server)
1. Mở terminal và chuyển vào thư mục `server`:
   ```bash
   cd server
   npm install
   ```
2. Cấu hình file `.env` (mặc định đã được tạo sẵn):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/quizlet_db
   JWT_SECRET=super_secret_jwt_key_quizlet_clone_2026
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   ```
3. Nạp dữ liệu mẫu (Sample Decks & User):
   ```bash
   npm run seed
   ```
   *Tài khoản mẫu: `demo@quizlet.com` | Mật khẩu: `password123`*

4. Chạy server ở chế độ phát triển:
   ```bash
   npm run dev
   ```
   Server sẽ lắng nghe tại: `http://localhost:5000`

---

### Bước 2: Khởi động Frontend (Client)
1. Mở một cửa sổ terminal mới và chuyển vào thư mục `client`:
   ```bash
   cd client
   npm install
   ```
2. Chạy Vite dev server:
   ```bash
   npm run dev
   ```
3. Truy cập vào trình duyệt: `http://localhost:5173`

---

### Bước 3: Khởi động Ứng Dụng Di Động (Mobile App)
1. Mở một cửa sổ terminal mới và chuyển vào thư mục `mobile`:
   ```bash
   cd mobile
   npx expo start
   ```
2. Mở ứng dụng **Expo Go** trên điện thoại (tải miễn phí trên App Store hoặc Google Play).
3. Quét mã QR hiển thị trong terminal để chạy app trực tiếp trên điện thoại!
   *(Lưu ý: Điện thoại và máy tính kết nối chung mạng Wi-Fi; kiểm tra IP trong `mobile/src/config/api.js`).*

---

## 🎯 4. Các Tính năng Chính Đã Triển khai

1. **Xác thực Người dùng (JWT Auth):**
   - Đăng ký, Đăng nhập, bảo vệ tuyến đường (Private routes).
2. **Quản lý Bộ thẻ (Deck CRUD):**
   - Tạo bộ thẻ mới với dynamic form thêm/xóa thẻ không giới hạn.
   - Hỗ trợ thêm Term, Definition, Hint và Hình ảnh minh họa.
   - Phân loại theo chủ đề (Tiếng Anh, Công nghệ, Y Dược, Khoa học...).
3. **Thẻ Ghi Nhớ 3D (Flashcard Mode):**
   - Hiệu ứng lật thẻ 3D mượt mà qua Framer Motion.
   - Hỗ trợ phím tắt: `Space` (lật thẻ), `←` / `→` (chuyển thẻ trước/sau).
   - Nút loa đọc phát âm tự động thông minh qua `window.speechSynthesis`.
   - Đánh dấu trạng thái "Đã thuộc" (Mastered) hoặc "Học lại" (Still learning) lưu trực tiếp vào cơ sở dữ liệu MongoDB.
4. **Chế độ Trắc nghiệm (Quiz Mode):**
   - Tự động sinh câu hỏi 4 lựa chọn (1 đúng, 3 sai ngẫu nhiên từ bộ thẻ).
   - Chấm điểm realtime, tổng kết tỷ lệ phần trăm và liệt kê chi tiết các câu làm sai.
5. **Game Ghép từ (Match Game):**
   - Lưới thẻ xáo trộn các cặp Term & Definition.
   - Đồng hồ bấm giờ realtime (Timer).
   - Hiệu ứng biến mất khi chọn đúng và rung báo động khi chọn sai.

