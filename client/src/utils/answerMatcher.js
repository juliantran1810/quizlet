/**
 * Chu?n hóa chu?i so kh?p: chuy?n ch? thu?ng, b? kho?ng tr?ng th?a, chu?n hóa d?u
 */
export function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // b? d?u ph? khi so kh?p r?ng
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Phân tách m?t d?nh nghia có nhi?u nghia thành m?ng các nghia d?c l?p
 * Ví d?: "yêu thuong / ái tình; s? quý m?n (tình c?m)"
 * -> ["yêu thuong", "ái tình", "s? quý m?n", ...]
 */
export function extractValidMeanings(rawTarget) {
  if (!rawTarget) return [];
  const results = new Set();
  const rawStr = String(rawTarget).trim();
  if (!rawStr) return [];

  // 1. Toàn b? chu?i nguyên b?n
  results.add(rawStr);

  // 2. Chu?i dã lu?c b? n?i dung trong ngo?c don gi?i thích: "apple (qu? táo)" -> "apple"
  const withoutParens = rawStr.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (withoutParens && withoutParens !== rawStr) {
    results.add(withoutParens);
  }

  // Trích xu?t các n?i dung bên trong d?u ngo?c don: "(qu? táo)" -> "qu? táo"
  const parensMatches = rawStr.match(/\((.*?)\)/g);
  if (parensMatches) {
    parensMatches.forEach((m) => {
      const inside = m.replace(/[()]/g, '').trim();
      if (inside) results.add(inside);
    });
  }

  // 3. Phân tách theo các ký t? phân cách thông d?ng: /, ;, ,, |, newline
  const chunks = rawStr.split(/[,;\/\n|]+/);
  chunks.forEach((chunk) => {
    const trimmed = chunk.trim();
    if (trimmed) {
      results.add(trimmed);
      const chunkNoParen = trimmed.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
      if (chunkNoParen) results.add(chunkNoParen);
    }
  });

  return Array.from(results);
}

/**
 * Ki?m tra xem câu tr? l?i c?a ngu?i dùng có kh?p v?i m?t trong các nghia h?p l? hay không
 */
export function checkAnswerMatch(userInput, targetAnswer, card = null) {
  if (!userInput || !targetAnswer) return false;

  const userRaw = String(userInput).trim().toLowerCase();
  const userNorm = normalizeText(userRaw);
  if (!userNorm) return false;

  // L?y danh sách toàn b? các nghia có th? ch?p nh?n
  const possibleMeanings = extractValidMeanings(targetAnswer);

  for (const meaning of possibleMeanings) {
    const mRaw = meaning.toLowerCase().trim();
    const mNorm = normalizeText(meaning);

    if (userRaw === mRaw || userNorm === mNorm) {
      return true;
    }
  }

  // N?u là card ti?ng Trung, ngu?i dùng gõ dúng Pinyin cung ch?p nh?n
  if (card && card.pinyin) {
    const pyRaw = String(card.pinyin).toLowerCase().trim();
    const pyNorm = normalizeText(pyRaw);
    if (userRaw === pyRaw || userNorm === pyNorm) {
      return true;
    }
  }

  return false;
}
