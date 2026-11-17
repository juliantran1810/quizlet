// Gửi email OTP: Hỗ trợ 2 phương thức:
// 1. Resend API qua HTTPS (cổng 443) - Khuyến nghị cho Render Free, Vercel, Railway vì không bao giờ bị chặn cổng.
// 2. Nodemailer SMTP (Gmail, Outlook, v.v.) - Thích hợp cho môi trường local hoặc server mở cổng 465/587.

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.SMTP_HOST);

// Cho phép trả mã OTP trong response khi:
// - Ở môi trường dev/local và email chưa gửi được qua mạng thật
// - HOẶC khi quản trị viên cố ý bật cờ ALLOW_DEV_OTP=true trên hosting để kiểm thử / cấp cứu tài khoản
export const shouldExposeDevOtp = (emailSent) =>
  process.env.ALLOW_DEV_OTP === 'true' ||
  (!emailSent && process.env.NODE_ENV !== 'production');

export const sendOtpEmail = async ({ to, otp, subject, heading }) => {
  const emailText = `${heading}\n\nMã OTP của bạn: ${otp}\nMã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
      <h2 style="color:#4f46e5;margin:0 0 8px">Memora</h2>
      <p style="color:#334155">${heading}</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#0f172a;text-align:center;margin:24px 0">${otp}</p>
      <p style="color:#64748b;font-size:13px">Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>`;

  // 1. Ưu tiên gửi qua Resend HTTP API (Port 443 HTTPS - Hoạt động 100% trên Render Free)
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const from = process.env.RESEND_FROM?.trim() || 'Memora <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text: emailText,
          html: emailHtml,
        }),
      });

      if (res.ok) {
        console.log(`[EMAIL-RESEND] Đã gửi OTP thành công đến ${to}`);
        return true;
      }

      const errBody = await res.json().catch(() => ({}));
      console.error('[EMAIL-RESEND] Gửi qua Resend API thất bại:', errBody);
    } catch (err) {
      console.error('[EMAIL-RESEND] Lỗi kết nối Resend:', err.message);
    }
  }

  // 2. Gửi qua SendGrid HTTP API (Port 443 HTTPS)
  const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim();
  if (sendgridApiKey) {
    try {
      const fromEmail = process.env.SENDGRID_FROM?.trim() || process.env.SMTP_USER?.trim() || 'dinhtrieu1810@gmail.com';
      const fromName = 'Memora';
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [
            { type: 'text/plain', value: emailText },
            { type: 'text/html', value: emailHtml },
          ],
        }),
      });

      if (res.status >= 200 && res.status < 300) {
        console.log(`[EMAIL-SENDGRID] Đã gửi OTP thành công đến ${to}`);
        return true;
      }

      const errBody = await res.json().catch(() => ({}));
      console.error('[EMAIL-SENDGRID] Gửi qua SendGrid API thất bại:', errBody);
    } catch (err) {
      console.error('[EMAIL-SENDGRID] Lỗi kết nối SendGrid:', err.message);
    }
  }

  // 3. Gửi qua Nodemailer SMTP nếu có cấu hình SMTP_HOST
  if (process.env.SMTP_HOST) {
    try {
      const { default: nodemailer } = await import('nodemailer');

      const host = process.env.SMTP_HOST?.trim();
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE !== undefined
        ? String(process.env.SMTP_SECURE).trim().toLowerCase() === 'true'
        : port === 465;

      const user = process.env.SMTP_USER?.trim();
      let pass = (process.env.SMTP_PASS || process.env.SMIP_PASS || '').trim();
      if (host?.includes('gmail') && pass.includes(' ')) {
        pass = pass.replace(/\s+/g, '');
      }

      // Chuẩn hóa fromAddress hợp lệ theo chuẩn RFC 5322 (vd: "Memora <email@gmail.com>")
      let fromAddress = process.env.SMTP_FROM?.trim() || `Memora <${user}>`;
      if (fromAddress && !fromAddress.includes('<')) {
        const parts = fromAddress.split(/\s+/);
        const emailPart = parts.find((p) => p.includes('@'));
        if (emailPart) {
          const namePart = parts.filter((p) => p !== emailPart).join(' ') || 'Memora';
          fromAddress = `"${namePart}" <${emailPart}>`;
        } else if (user) {
          fromAddress = `"${fromAddress}" <${user}>`;
        }
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      });

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

      console.log(`[EMAIL-SMTP] Đã gửi OTP thành công qua SMTP đến ${to}`);
      return true;
    } catch (err) {
      console.error('[EMAIL-SMTP] Gửi OTP thất bại:', err.message);
      if (err.code === 'EAUTH') {
        console.error(
          '[EMAIL-SMTP] Lỗi xác thực tài khoản SMTP (EAUTH). Lưu ý: Nếu dùng Gmail, BẮT BUỘC dùng "Mật khẩu ứng dụng" (App Password 16 ký tự), không dùng mật khẩu Gmail chính.'
        );
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
        console.error(
          '[EMAIL-SMTP] Cổng SMTP bị chặn kết nối (Thường xảy ra trên gói Render Free vì Render chặn cổng 25, 465, 587). Khuyến nghị chuyển sang dùng RESEND_API_KEY (cổng 443 HTTPS).'
        );
      }
    }
  }

  return false;
};
