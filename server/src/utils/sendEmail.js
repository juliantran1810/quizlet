// Gửi email OTP qua SMTP (nodemailer). Nếu chưa cấu hình SMTP_HOST thì bỏ qua và trả về false,
// khi đó môi trường dev sẽ nhận mã OTP trực tiếp trong response (xem shouldExposeDevOtp).

export const isEmailConfigured = () => Boolean(process.env.SMTP_HOST);

// Chỉ trả mã OTP trong response khi KHÔNG chạy production và email chưa được gửi thật.
// Tuyệt đối không bật ở production: nếu không ai biết email người khác cũng có thể đặt lại mật khẩu.
export const shouldExposeDevOtp = (emailSent) =>
  !emailSent && process.env.NODE_ENV !== 'production';

export const sendOtpEmail = async ({ to, otp, subject, heading }) => {
  if (!isEmailConfigured()) return false;

  try {
    const { default: nodemailer } = await import('nodemailer');

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).trim().toLowerCase() === 'true'
      : port === 465;

    const user = process.env.SMTP_USER?.trim();
    // Hỗ trợ cả trường hợp người dùng gõ nhầm SMIP_PASS trên dashboard hosting
    let pass = (process.env.SMTP_PASS || process.env.SMIP_PASS || '').trim();
    // Nếu dùng mật khẩu ứng dụng Gmail 16 ký tự có khoảng trắng (vd: abcd efgh ijkl mnop), bỏ khoảng trắng
    if (host?.includes('gmail') && pass.includes(' ')) {
      pass = pass.replace(/\s+/g, '');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });

    const fromAddress = process.env.SMTP_FROM?.trim() || `Memora <${user}>`;

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: `${heading}\n\nMã OTP của bạn: ${otp}\nMã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
          <h2 style="color:#4f46e5;margin:0 0 8px">Memora</h2>
          <p style="color:#334155">${heading}</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#0f172a;text-align:center;margin:24px 0">${otp}</p>
          <p style="color:#64748b;font-size:13px">Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        </div>`,
    });
    return true;
  } catch (err) {
    console.error('[EMAIL] Gửi OTP thất bại:', err.message);
    if (err.code === 'EAUTH') {
      console.error('[EMAIL] Lỗi xác thực tài khoản SMTP (EAUTH). Lưu ý: Nếu dùng Gmail, BẮT BUỘC dùng "Mật khẩu ứng dụng" (App Password 16 ký tự), không dùng mật khẩu Gmail chính.');
    }
    return false;
  }
};
