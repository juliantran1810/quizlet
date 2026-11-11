// Cache kết quả dò model theo API key để các lần quét sau chạy NGAY LẬP TỨC (không tốn thêm 1-2s gọi ListModels)
const modelCache = new Map();

// Controller xử lý quét ảnh bằng AI Vision (Google Gemini Flash)
export const scanVocabularyImage = async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', apiKey: clientApiKey } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        status: 'fail',
        message: 'Vui lòng cung cấp dữ liệu hình ảnh (imageBase64).',
      });
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({
        status: 'fail',
        code: 'MISSING_API_KEY',
        message:
          'Chưa có Google Gemini API Key. Vui lòng cấu hình GEMINI_API_KEY trong file .env hoặc nhập API Key miễn phí từ https://aistudio.google.com/',
      });
    }

    // Làm sạch chuỗi base64 nếu có tiền tố data:image/...;base64,
    let cleanBase64 = imageBase64;
    let detectedMime = mimeType;
    if (imageBase64.includes('base64,')) {
      const parts = imageBase64.split('base64,');
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch) {
        detectedMime = mimeMatch[1];
      }
    }

    const promptText = `
Bạn là một chuyên gia OCR và xử lý tài liệu học ngôn ngữ (đặc biệt là tiếng Trung, tiếng Anh, tiếng Việt).
Bức ảnh này có thể là trang sách giáo trình, từ điển, bài tập, flashcard hoặc bảng từ vựng chụp từ sách. Ảnh có thể chụp nghiêng, xoay 90 độ, mép cong hoặc ánh sáng không đều.

Nhiệm vụ của bạn:
1. Đọc và bóc tách TOÀN BỘ các mục từ vựng trong ảnh.
2. Với mỗi từ vựng, trích xuất cấu trúc chuẩn gồm 3 trường:
   - "term": Thuật ngữ gốc (ví dụ chữ Hán: 学, 英语, 明天; hoặc từ vựng tiếng Anh/ngoại ngữ khác). 
     LƯU Ý QUAN TRỌNG: Loại bỏ số thứ tự (1, 2, 3...), loại bỏ từ loại như (动), (名), (形), (phó), (tin)... khỏi "term".
   - "pinyin": Phiên âm Pinyin kèm dấu thanh điệu chuẩn (ví dụ: xué, Yīngyǔ, míngtiān) nếu là tiếng Trung; hoặc phiên âm IPA/phát âm nếu có.
   - "definition": Nghĩa tiếng Việt chuẩn xác và đầy đủ. Nếu bảng có cột tiếng Anh và tiếng Việt, ưu tiên giữ tiếng Việt (hoặc kết hợp tiếng Việt kèm tiếng Anh).
3. Trả về kết quả DUY NHẤT một mảng JSON thuần túy trong khối \`\`\`json ... \`\`\` theo định dạng:
\`\`\`json
[
  { "term": "学", "pinyin": "xué", "definition": "học (to learn, to study)" },
  { "term": "英语", "pinyin": "Yīngyǔ", "definition": "tiếng Anh (English)" }
]
\`\`\`
Tuyệt đối KHÔNG thêm bất kỳ câu giải thích, lời chào hay định dạng nào khác ngoài khối json.
`.trim();

    // 1. Dò tìm model (có cache)
    let availableModels = [];
    let apiVer = 'v1beta';
    let listDebugInfo = '';
    const cacheKey = apiKey.trim().slice(-10); // Lấy 10 ký tự cuối làm key

    if (modelCache.has(cacheKey)) {
      const cached = modelCache.get(cacheKey);
      availableModels = cached.availableModels;
      apiVer = cached.apiVer;
    } else {
      for (const ver of ['v1beta', 'v1']) {
        try {
          const listRes = await fetch(
            `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey.trim()}`,
            {
              headers: { 'x-goog-api-key': apiKey.trim() },
              signal: AbortSignal.timeout(8000),
            }
          );

          if (listRes.ok) {
            const listData = await listRes.json();
            const models = (listData.models || [])
              .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
              .map((m) => m.name.replace(/^models\//, ''));

            if (models.length > 0) {
              availableModels = models;
              apiVer = ver;
              modelCache.set(cacheKey, { availableModels, apiVer });
              try {
                const fs = await import('fs');
                fs.writeFileSync(
                  'ai-debug.log',
                  JSON.stringify({ ver, count: models.length, models }, null, 2)
                );
              } catch (e) {}
              break;
            }
          } else {
            const errText = await listRes.text();
            listDebugInfo += `[${ver} status ${listRes.status}: ${errText}] `;
            if (listRes.status === 400 && errText.includes('API_KEY_INVALID')) {
              return res.status(400).json({
                status: 'fail',
                code: 'INVALID_API_KEY',
                message: 'Google Gemini API Key không hợp lệ. Vui lòng kiểm tra lại key của bạn tại https://aistudio.google.com/',
              });
            }
          }
        } catch (e) {
          listDebugInfo += `[${ver} err: ${e.message}] `;
        }
      }
    }

    // 2. Chọn các model TỐC ĐỘ CAO & ĐANG HOẠT ĐỘNG (Đã kiểm chứng thực tế: gemini-3-flash-preview, gemini-3.5-flash)
    const priorities = [
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-pro-preview',
      'gemini-pro-latest',
      'gemini-3.0-pro',
    ];

    // Xây dựng danh sách thử tuần tự các model khả dụng để đảm bảo nếu 1 model bị 503 (quá tải) thì tự động nhảy sang model khác ngay lập tức!
    const cachedWorkingModel = modelCache.get(cacheKey)?.workingModel;
    const modelsToTry = [];

    if (cachedWorkingModel && availableModels.includes(cachedWorkingModel)) {
      modelsToTry.push(cachedWorkingModel);
    }

    for (const p of priorities) {
      if (availableModels.includes(p) && !modelsToTry.includes(p)) {
        modelsToTry.push(p);
      }
    }

    // Bổ sung các model khác trong tài khoản nếu có (loại trừ model âm thanh tts, robotics, model đã bị deprecate như 2.5)
    for (const m of availableModels) {
      if (
        !modelsToTry.includes(m) &&
        !m.includes('2.5-') &&
        !m.includes('tts') &&
        !m.includes('preview-tts') &&
        !m.includes('transcribe') &&
        !m.includes('clip') &&
        !m.includes('banana') &&
        !m.includes('robotics') &&
        !m.includes('computer-use') &&
        (m.includes('flash') || m.includes('pro') || m.includes('gemini'))
      ) {
        modelsToTry.push(m);
      }
    }

    if (modelsToTry.length === 0) {
      modelsToTry.push('gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.6-flash');
    }

    let responseData = null;
    let lastError = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey.trim()}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim(),
          },
          signal: AbortSignal.timeout(45000), // Timeout 45 giây cho mỗi lượt thử
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType: detectedMime,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              topK: 32,
              topP: 0.95,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (response.ok) {
          responseData = await response.json();
          // Ghi nhận model này hoạt động tốt vào cache để lần sau gọi thẳng model này!
          modelCache.set(cacheKey, { workingModel: model, availableModels, apiVer });
          break;
        } else {
          const errBody = await response.text();
          lastError = new Error(`Model ${model} [${apiVer}] (HTTP ${response.status}): ${errBody}`);

          // Nếu Google gợi ý rõ model mới thay thế trong message, tự động đẩy vào vị trí kế tiếp để thử ngay
          const recommendMatch = errBody.match(/Please update your code to use models\/([a-zA-Z0-9.-]+)/);
          if (recommendMatch && recommendMatch[1]) {
            const recommendedModel = recommendMatch[1];
            if (!modelsToTry.includes(recommendedModel) && !recommendedModel.includes('2.5-')) {
              modelsToTry.splice(i + 1, 0, recommendedModel);
            }
          }

          if (response.status === 400 && errBody.includes('API_KEY_INVALID')) {
            return res.status(400).json({
              status: 'fail',
              code: 'INVALID_API_KEY',
              message: 'Google Gemini API Key không hợp lệ. Vui lòng kiểm tra lại key của bạn tại https://aistudio.google.com/',
            });
          }
          // Nếu gặp 503 (overload), 429 (quota), hoặc 404 (deprecated), vòng lặp tự động chuyển sang model tiếp theo!
          continue;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!responseData) {
      throw lastError || new Error('Không thể nhận phản hồi từ Gemini Vision API trong thời gian chờ.');
    }

    const candidate = responseData.candidates?.[0];
    const textOutput = candidate?.content?.parts?.[0]?.text;

    if (!textOutput) {
      return res.status(422).json({
        status: 'fail',
        message: 'AI không nhận diện được văn bản hoặc không trích xuất được từ vựng từ bức ảnh này.',
      });
    }

    // Bóc tách JSON từ khối markdown ```json ... ```
    let jsonStr = textOutput.trim();
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }
    }

    let parsedCards = [];
    try {
      parsedCards = JSON.parse(jsonStr);
    } catch (e) {
      // Thử tìm mảng [ ... ] trong văn bản
      const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        parsedCards = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error('Dữ liệu AI trả về không đúng định dạng JSON: ' + textOutput.substring(0, 200));
      }
    }

    if (!Array.isArray(parsedCards) || parsedCards.length === 0) {
      return res.status(422).json({
        status: 'fail',
        message: 'Không tìm thấy từ vựng hợp lệ nào trong ảnh. Hãy chụp rõ nét hơn hoặc chụp gần bảng từ mới.',
      });
    }

    // Chuẩn hóa và làm sạch từng thẻ
    const sanitizedCards = parsedCards
      .filter((c) => c && (c.term || c.definition))
      .map((c) => ({
        term: String(c.term || '').trim(),
        pinyin: String(c.pinyin || '').trim(),
        definition: String(c.definition || '').trim(),
        hint: String(c.hint || '').trim(),
        imageUrl: '',
      }));

    return res.status(200).json({
      status: 'success',
      data: {
        total: sanitizedCards.length,
        cards: sanitizedCards,
      },
    });
  } catch (error) {
    console.error('Lỗi scanVocabularyImage:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Đã có lỗi xảy ra khi xử lý ảnh bằng AI.',
    });
  }
};
