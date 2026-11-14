import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkEmailAvailability,
  registrationErrorMessage,
  requestRegistrationOtp,
  validateEmailExistence,
} from "../../api/registrationApi";
import { saveRegistrationSession } from "../../api/registrationSession";
import AuthLayout from "../../../../shared/layouts/AuthLayout/AuthLayout";
import "./RegisterPage.css";

/**
 * Kiểm tra định dạng cú pháp email (RFC 5322) và cảnh báo các lỗi gõ nhầm phổ biến
 */
function checkEmailFormat(rawEmail: string): string | null {
  const email = rawEmail.trim();
  if (!email) {
    return "Vui lòng nhập địa chỉ email.";
  }
  if (email.length > 100) {
    return "Email không được vượt quá 100 ký tự.";
  }
  if (/[\u0080-\uFFFF]/.test(email)) {
    return "Email không được chứa ký tự có dấu hoặc ký tự đặc biệt.";
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return "Định dạng email chưa đúng (phải có dạng ten@tenmien.com).";
  }

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) {
    return "Định dạng email chưa đúng (thiếu tên tài khoản hoặc tên miền).";
  }

  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    return "Tên tài khoản email không hợp lệ (không chứa dấu chấm ở đầu, cuối hoặc liên tiếp).";
  }

  if (!domainPart.includes(".")) {
    return "Tên miền email phải có phần mở rộng (ví dụ: .com, .vn).";
  }

  if (domainPart.startsWith(".") || domainPart.endsWith(".") || domainPart.includes("..")) {
    return "Tên miền email không hợp lệ.";
  }

  const lastDotIndex = domainPart.lastIndexOf(".");
  const tld = domainPart.substring(lastDotIndex + 1).toLowerCase();

  // Phát hiện lỗi gõ nhầm đuôi tên miền phổ biến
  if (tld === "con") {
    return "Định dạng tên miền không hợp lệ (đuôi .con không tồn tại, bạn có muốn gõ .com?).";
  }
  if (tld === "cmo" || tld === "cpm" || tld === "cno") {
    return "Định dạng tên miền không hợp lệ (có thể bạn muốn gõ .com?).";
  }

  if (!/^[a-zA-Z]{2,63}$/.test(tld)) {
    return `Phần mở rộng tên miền (.${tld}) không hợp lệ.`;
  }

  const domainLower = domainPart.toLowerCase();
  if (["gmai.com", "gamil.com", "gmial.com", "gmaill.com"].includes(domainLower)) {
    return "Tên miền không hợp lệ (có thể bạn muốn gõ gmail.com?).";
  }
  if (["yaho.com", "yahooo.com", "yaho.com.vn"].includes(domainLower)) {
    return "Tên miền không hợp lệ (có thể bạn muốn gõ yahoo.com?).";
  }
  if (["hotmial.com", "hotmai.com"].includes(domainLower)) {
    return "Tên miền không hợp lệ (có thể bạn muốn gõ hotmail.com?).";
  }

  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return "Định dạng email chưa đúng.";
  }

  return null;
}

function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState("");
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleEmailBlur = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    // BƯỚC 1: Check format
    const formatMsg = checkEmailFormat(trimmedEmail);
    if (formatMsg) {
      setEmailValidation({ isValid: false, message: formatMsg });
      return;
    }

    // BƯỚC 2: Check trùng trong hệ thống
    try {
      const avail = await checkEmailAvailability(trimmedEmail);
      if (!avail.isAvailable || avail.existsInSystem) {
        setEmailValidation({
          isValid: false,
          message: avail.message || "Email này đã được sử dụng trong hệ thống.",
        });
        return;
      }

      // BƯỚC 3: Check mail có tồn tại hay không
      const exist = await validateEmailExistence(trimmedEmail);
      if (!exist.isValid) {
        setEmailValidation({
          isValid: false,
          message: exist.message || "Tên miền email không tồn tại hoặc không thể nhận thư.",
        });
        return;
      }

      setEmailValidation({
        isValid: true,
        message: "Email hợp lệ và có thể nhận mã xác nhận.",
      });
    } catch {
      // Bỏ qua lỗi kết nối khi blur để người dùng vẫn tiếp tục điền form
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError("");
    setEmailValidation(null);

    const trimmedEmail = email.trim().toLowerCase();

    // =========================================================================
    // TRÌNH TỰ KIỂM TRA EMAIL THEO YÊU CẦU:
    // BƯỚC 1: Check mail có đúng format không?
    //         -> Nếu SAI: dừng ngay, KHỎI check trùng, KHỎI check tồn tại.
    // =========================================================================
    const formatMsg = checkEmailFormat(trimmedEmail);
    if (formatMsg) {
      setEmailValidation({
        isValid: false,
        message: formatMsg,
      });
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // =========================================================================
      // BƯỚC 2: Check mail có trùng trong hệ thống không?
      //         -> Nếu TRÙNG: dừng ngay, KHỎI check tồn tại.
      // =========================================================================
      setSubmitStatusText("Đang kiểm tra trùng lặp email…");
      const availResult = await checkEmailAvailability(trimmedEmail);
      if (!availResult.isAvailable || availResult.existsInSystem) {
        const dupMsg =
          availResult.message ||
          "Email này đã được sử dụng trong hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.";
        setEmailValidation({
          isValid: false,
          message: dupMsg,
        });
        return;
      }

      // =========================================================================
      // BƯỚC 3: Check mail có tồn tại hay không? (DNS / MX / Khả năng nhận thư)
      //         -> Nếu KHÔNG TỒN TẠI: dừng ngay, KHÔNG gửi.
      // =========================================================================
      setSubmitStatusText("Đang kiểm tra sự tồn tại của email…");
      const checkResult = await validateEmailExistence(trimmedEmail);
      if (!checkResult.isValid) {
        const existMsg =
          checkResult.message ||
          "Địa chỉ email không tồn tại trên thực tế hoặc không thể nhận thư.";
        setEmailValidation({
          isValid: false,
          message: existMsg,
        });
        return;
      }

      // =========================================================================
      // BƯỚC 4: Gửi mã OTP
      // =========================================================================
      setEmailValidation({
        isValid: true,
        message: checkResult.message || "Email hợp lệ và có thể nhận thư.",
      });
      setSubmitStatusText("Đang gửi mã xác nhận…");

      const data = await requestRegistrationOtp({
        fullName: fullName.trim(),
        email: trimmedEmail,
        phoneNumber: phone.trim(),
        password,
      });

      const session = {
        email: trimmedEmail,
        registrationToken: data.registrationToken,
        otpExpiresAt: Date.now() + data.expiresIn * 1000,
        resendAvailableAt: Date.now() + data.resendAfterSeconds * 1000,
      };

      saveRegistrationSession(session);
      setPassword("");
      setConfirmPassword("");
      navigate("/verify-otp", { state: session });
    } catch (err) {
      const errMsg = registrationErrorMessage(err);
      setError(errMsg);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setSubmitStatusText("");
    }
  };

  return (
    <AuthLayout>
      <div className="register-form-wrapper">
        {/* STEP INDICATOR */}
        <div className="register-steps">
          <div className="register-step active">
            <span className="register-step-number">1</span>
            <span>Thông tin tài khoản</span>
          </div>

          <div className="register-step">
            <span className="register-step-number">2</span>
            <span>Xác minh OTP</span>
          </div>
        </div>

        <div className="register-title-line" />

        <h2>Đăng ký</h2>

        <p className="register-description">
          Tạo tài khoản để bắt đầu quản lý vận chuyển.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (!emailValidation || error !== emailValidation.message) && (
            <p className="register-error-message" role="alert">
              {error}
            </p>
          )}

          {/* FULL NAME */}
          <div className="register-form-group">
            <label htmlFor="fullName">Họ và tên</label>
            <input
              id="fullName"
              maxLength={100}
              type="text"
              placeholder="Nhập họ và tên"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>

          {/* EMAIL */}
          <div className="register-form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              maxLength={100}
              type="email"
              placeholder="Nhập địa chỉ email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailValidation) setEmailValidation(null);
                if (error) setError("");
              }}
              onBlur={handleEmailBlur}
              autoComplete="email"
              required
            />
            {emailValidation && (
              <div
                className={`register-email-feedback ${
                  emailValidation.isValid ? "success" : "error"
                }`}
                role="alert"
              >
                {emailValidation.isValid ? "✓ " : "⚠️ "}
                {emailValidation.message}
              </div>
            )}
          </div>

          {/* PHONE */}
          <div className="register-form-group">
            <label htmlFor="phone">Số điện thoại</label>
            <input
              id="phone"
              maxLength={40}
              type="tel"
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="register-form-group">
            <label htmlFor="registerPassword">Mật khẩu</label>
            <div className="register-password-wrapper">
              <input
                id="registerPassword"
                minLength={6}
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Tạo mật khẩu"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="register-form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <div className="register-password-wrapper">
              <input
                id="confirmPassword"
                autoComplete="new-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showConfirmPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="register-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (submitStatusText || "Đang xử lý…") : "Gửi mã xác nhận"}
          </button>
        </form>

        <p className="register-login-text">
          Đã có tài khoản?{" "}
          <button type="button" onClick={() => navigate("/login")}>
            Đăng nhập
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}

export default RegisterPage;

