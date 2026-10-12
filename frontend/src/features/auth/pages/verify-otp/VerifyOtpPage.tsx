import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { useNavigate } from "react-router-dom";
import { registrationErrorMessage, resendRegistrationOtp, verifyRegistrationOtp } from "../../api/registrationApi";
import { clearRegistrationSession, loadRegistrationSession, saveRegistrationSession } from "../../api/registrationSession";

import authHorseImage from "../../../../assets/images/login-horse.jpg";
import "./VerifyOtpPage.css";

const OTP_LENGTH = 6;

function VerifyOtpPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(loadRegistrationSession);
  const email = session?.email ?? "";
  const [now, setNow] = useState(Date.now);
  const [action, setAction] = useState<"verify" | "resend" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const actionRef = useRef(false);

  const [otp, setOtp] = useState<string[]>(
    Array(OTP_LENGTH).fill("")
  );

  const timeLeft = Math.max(0, Math.ceil(((session?.otpExpiresAt ?? now) - now) / 1000));
  const resendWait = Math.max(0, Math.ceil(((session?.resendAvailableAt ?? now) - now) / 1000));

  const inputsRef = useRef<
    Array<HTMLInputElement | null>
  >([]);

  /*
   * ===============================
   * COUNTDOWN TIMER
   * ===============================
   */

  useEffect(() => {
    if (!session) navigate("/register", { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /*
   * 120 seconds
   * ->
   * 02:00
   */

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  /*
   * ===============================
   * OTP INPUT
   * ===============================
   */

  const handleOtpChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;

    // Chỉ cho nhập số
    if (!/^\d*$/.test(value)) {
      return;
    }

    const digit = value.slice(-1);

    const newOtp = [...otp];

    newOtp[index] = digit;

    setOtp(newOtp);

    // Tự động chuyển sang ô tiếp theo
    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  /*
   * Backspace:
   *
   * Nếu ô hiện tại trống
   * -> quay lại ô phía trước.
   */

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      inputsRef.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      inputsRef.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  /*
   * Cho phép paste:
   *
   * 123456
   */

  const handlePaste = (
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    event.preventDefault();

    const pastedValue = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pastedValue) {
      return;
    }

    const newOtp = Array(OTP_LENGTH).fill("");

    pastedValue.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);

    const nextIndex = Math.min(
      pastedValue.length,
      OTP_LENGTH - 1
    );

    inputsRef.current[nextIndex]?.focus();
  };

  /*
   * ===============================
   * VERIFY OTP
   * ===============================
   */

  const handleVerifyOtp = async () => {
    if (!session || actionRef.current) return;
    setError("");
    setMessage("");
    const otpCode = otp.join("");

    if (otpCode.length !== OTP_LENGTH) {
      setError("Vui lòng nhập đủ 6 số OTP.");
      return;
    }

    if (timeLeft === 0) {
      setError(
        "Mã OTP đã hết hạn. Vui lòng gửi lại mã."
      );
      return;
    }

    actionRef.current = true;
    setAction("verify");
    try {
      await verifyRegistrationOtp(session.registrationToken, otpCode);
      clearRegistrationSession();
      navigate("/login", { replace: true });
    } catch (error) {
      setError(registrationErrorMessage(error));
    } finally {
      actionRef.current = false;
      setAction(null);
    }
  };

  /*
   * ===============================
   * RESEND OTP
   * ===============================
   */

  const handleResendOtp = async () => {
    if (!session || actionRef.current || resendWait > 0) return;
    actionRef.current = true;
    setAction("resend");
    setError("");
    setMessage("");
    try {
      const data = await resendRegistrationOtp(session.registrationToken);
      const currentTime = Date.now();
      const updated = { ...session, otpExpiresAt: currentTime + data.expiresIn * 1000,
        resendAvailableAt: currentTime + data.resendAfterSeconds * 1000 };
      saveRegistrationSession(updated);
      setSession(updated);
      setNow(currentTime);
      setOtp(Array(OTP_LENGTH).fill(""));
      setMessage("Đã gửi lại mã xác minh.");
      inputsRef.current[0]?.focus();
    } catch (error) {
      setError(registrationErrorMessage(error));
    } finally {
      actionRef.current = false;
      setAction(null);
    }
  };

  /*
   * ===============================
   * CHANGE EMAIL
   * ===============================
   */

  const handleChangeEmail = () => {
    clearRegistrationSession();
    navigate("/register");
  };

  return (
    <div className="verify-otp-page auth-page">
      <div className="verify-otp-container">

        {/* ================= LEFT ================= */}

        <section
          className="otp-hero"
          style={{
            backgroundImage: `url(${authHorseImage})`,
          }}
        >
          <div className="otp-hero-overlay" />

          <div className="otp-hero-content">

            <div className="otp-brand">
              <div className="otp-brand-icon">
                ♞
              </div>

              <span>CNB Transport</span>
            </div>

            <div className="otp-hero-bottom">

              <div className="otp-hero-label">
                <span className="otp-hero-line" />

                AN TOÀN TRÊN MỌI HÀNH TRÌNH
              </div>

              <h1>
                Đồng hành cùng ngựa trên mọi
                <br />
                chặng đường
              </h1>

              <p>
                Quản lý hành trình vận chuyển an toàn
                và chuyên nghiệp.
              </p>

              <div className="otp-hero-badge">
                <span>✓</span>

                Chuyên biệt • An toàn • Đúng giờ
              </div>

            </div>

          </div>
        </section>

        {/* ================= RIGHT ================= */}

        <section className="otp-form-section">

          <div className="otp-form-wrapper">

            {/* STEP INDICATOR */}

            <div className="otp-steps">

              <div className="otp-step">
                <span>1</span>

                Thông tin tài khoản
              </div>

              <div className="otp-step otp-step-active">
                <span>2</span>

                Xác minh OTP
              </div>

            </div>

            <div className="otp-title-line" />

            <h2>Xác thực email</h2>
            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}

            <p className="otp-description">
              Chúng tôi đã gửi mã xác thực đến{" "}
              <strong>{email}</strong>
            </p>

            {/* OTP INPUT */}

            <div className="otp-input-group">

              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  disabled={action !== null}
                  value={digit}
                  onChange={(event) =>
                    handleOtpChange(index, event)
                  }
                  onKeyDown={(event) =>
                    handleKeyDown(index, event)
                  }
                  onPaste={handlePaste}
                  aria-label={`OTP digit ${
                    index + 1
                  }`}
                />
              ))}

            </div>

            {/* COUNTDOWN */}

            <p
              className={`otp-expire-text ${
                timeLeft === 0
                  ? "otp-expired"
                  : ""
              }`}
            >
              {timeLeft > 0 ? (
                <>
                  Mã hết hạn sau{" "}
                  <strong>
                    {formatTime(timeLeft)}
                  </strong>
                </>
              ) : (
                <>
                  Mã OTP đã hết hạn
                </>
              )}
            </p>

            {/* RESEND */}

            <p className="otp-resend-text">
              Không nhận được mã?{" "}

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={action !== null || resendWait > 0 || !session}
              >
                {action === "resend" ? "Đang gửi…" : resendWait > 0 ? `Gửi lại sau ${resendWait}s` : "Gửi lại"}
              </button>
            </p>

            {/* VERIFY */}

            <button
              type="button"
              className="otp-submit-button"
              onClick={handleVerifyOtp}
              disabled={action !== null || timeLeft === 0 || !session}
            >
              {action === "verify" ? "Đang xác minh…" : "Xác nhận OTP"}
            </button>

            {/* CHANGE EMAIL */}

            <button
              type="button"
              className="change-email-button"
              onClick={handleChangeEmail}
              disabled={action !== null}
            >
              Thay đổi email
            </button>

          </div>

        </section>

      </div>
    </div>
  );
}

export default VerifyOtpPage;
