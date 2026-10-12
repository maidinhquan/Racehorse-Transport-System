import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  type FormEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  registrationErrorMessage,
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from "../../api/registrationApi";
import {
  clearRegistrationSession,
  loadRegistrationSession,
  saveRegistrationSession,
  type RegistrationSession,
} from "../../api/registrationSession";
import AuthLayout from "../../../../shared/layouts/AuthLayout/AuthLayout";
import "./VerifyOtpPage.css";

const OTP_LENGTH = 6;

function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState<RegistrationSession | null>(() => {
    const stateSession = location.state as RegistrationSession | null;
    if (stateSession?.registrationToken && stateSession?.email) {
      return stateSession;
    }
    return loadRegistrationSession();
  });

  const [now, setNow] = useState(Date.now);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(5);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const actionRef = useRef(false);

  /* =========================
     SESSION CHECK
  ========================= */

  useEffect(() => {
    if (!session) {
      navigate("/register", { replace: true });
    }
  }, [session, navigate]);

  /* =========================
     INTERVAL TIMER
  ========================= */

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /* =========================
     COMPUTED TIMERS
  ========================= */

  const timeLeft = Math.max(
    0,
    Math.ceil(((session?.otpExpiresAt ?? now) - now) / 1000)
  );

  const resendWait = Math.max(
    0,
    Math.ceil(((session?.resendAvailableAt ?? now) - now) / 1000)
  );

  const isExpired = timeLeft <= 0;
  const otpValue = otp.join("");
  const isOtpComplete = otpValue.length === OTP_LENGTH;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  /* =========================
     SUCCESS COUNTDOWN
  ========================= */

  useEffect(() => {
    if (!isSuccess) return;

    if (redirectSeconds <= 0) {
      navigate("/login", { replace: true });
      return;
    }

    const timer = window.setTimeout(() => {
      setRedirectSeconds((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isSuccess, redirectSeconds, navigate]);

  /* =========================
     OTP INPUT HANDLERS
  ========================= */

  const handleOtpChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    setErrorMessage("");
    setInfoMessage("");

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    const nextOtp = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((digit, i) => {
      nextOtp[i] = digit;
    });

    setOtp(nextOtp);
    setErrorMessage("");
    setInfoMessage("");

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  /* =========================
     SUBMIT / VERIFY
  ========================= */

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || actionRef.current) return;
    setErrorMessage("");
    setInfoMessage("");

    if (otpValue.length !== OTP_LENGTH) {
      setErrorMessage("Vui lòng nhập đủ 6 số OTP.");
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage("Mã OTP đã hết hạn. Vui lòng gửi lại mã mới để tiếp tục.");
      return;
    }

    actionRef.current = true;
    setIsVerifying(true);
    try {
      await verifyRegistrationOtp(session.registrationToken, otpValue);
      clearRegistrationSession();
      setIsSuccess(true);
      setRedirectSeconds(5);
    } catch (err) {
      setErrorMessage(registrationErrorMessage(err));
    } finally {
      actionRef.current = false;
      setIsVerifying(false);
    }
  };

  /* =========================
     RESEND OTP
  ========================= */

  const handleResendOtp = async () => {
    if (!session || actionRef.current || resendWait > 0) return;
    actionRef.current = true;
    setIsResending(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const data = await resendRegistrationOtp(session.registrationToken);
      const currentTime = Date.now();
      const updated: RegistrationSession = {
        ...session,
        otpExpiresAt: currentTime + data.expiresIn * 1000,
        resendAvailableAt: currentTime + data.resendAfterSeconds * 1000,
      };
      saveRegistrationSession(updated);
      setSession(updated);
      setNow(currentTime);
      setOtp(Array(OTP_LENGTH).fill(""));
      setInfoMessage("Đã gửi lại mã xác minh.");
      inputRefs.current[0]?.focus();
    } catch (err) {
      setErrorMessage(registrationErrorMessage(err));
    } finally {
      actionRef.current = false;
      setIsResending(false);
    }
  };

  /* =========================
     CHANGE EMAIL
  ========================= */

  const handleChangeEmail = () => {
    clearRegistrationSession();
    navigate("/register");
  };

  /* =========================
     SUCCESS SCREEN
  ========================= */

  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="register-success-wrapper">
          <div className="register-success-icon">✓</div>
          <h2>Đăng ký thành công!</h2>
          <p>Chúc mừng bạn đã tạo tài khoản CNB Transport thành công.</p>
          <p className="register-success-redirect">
            Bạn sẽ được chuyển đến trang đăng nhập trong{" "}
            <strong>{redirectSeconds}</strong> giây.
          </p>
          <button
            type="button"
            className="register-success-button"
            onClick={() => navigate("/login", { replace: true })}
          >
            Đăng nhập ngay
          </button>
        </div>
      </AuthLayout>
    );
  }

  /* =========================
     VERIFY SCREEN
  ========================= */

  return (
    <AuthLayout>
      <div className="verify-otp-form-wrapper">
        <div className="verify-otp-steps">
          <div className="verify-otp-step completed">
            <span className="verify-otp-step-number">1</span>
            <span>Thông tin tài khoản</span>
          </div>

          <div className="verify-otp-step active">
            <span className="verify-otp-step-number">2</span>
            <span>Xác minh OTP</span>
          </div>
        </div>

        <div className="verify-otp-title-line" />

        <h2>Xác thực email</h2>

        <p className="verify-otp-description">
          Chúng tôi đã gửi mã xác thực đến{" "}
          <strong>{session?.email || ""}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="verify-otp-inputs">
            {otp.map((value, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={value}
                disabled={isVerifying || isResending}
                onChange={(event) => handleOtpChange(index, event)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>

          {isExpired ? (
            <p className="verify-otp-expired">
              Mã đã hết hạn. Vui lòng gửi lại mã mới để tiếp tục.
            </p>
          ) : (
            <p className="verify-otp-countdown">
              Mã có hiệu lực trong <strong>{formatTime(timeLeft)}</strong>
            </p>
          )}

          {errorMessage && (
            <p className="verify-otp-error" role="alert">
              {errorMessage}
            </p>
          )}

          {infoMessage && (
            <p
              className="verify-otp-countdown"
              role="status"
              style={{ color: "#16a34a" }}
            >
              {infoMessage}
            </p>
          )}

          <button
            type="button"
            className="verify-otp-resend-button"
            onClick={handleResendOtp}
            disabled={
              isResending ||
              isVerifying ||
              resendWait > 0 ||
              !session
            }
          >
            {isResending
              ? "Đang gửi lại..."
              : resendWait > 0
                ? `Gửi lại sau ${resendWait}s`
                : "Gửi lại mã"}
          </button>

          <button
            type="submit"
            className="verify-otp-submit-button"
            disabled={
              !isOtpComplete ||
              isExpired ||
              isVerifying ||
              isResending ||
              !session
            }
          >
            {isVerifying ? "Đang xác nhận..." : "Xác nhận OTP"}
          </button>
        </form>

        <button
          type="button"
          className="verify-otp-change-email"
          onClick={handleChangeEmail}
          disabled={isVerifying || isResending}
        >
          Thay đổi email
        </button>
      </div>
    </AuthLayout>
  );
}

export default VerifyOtpPage;
