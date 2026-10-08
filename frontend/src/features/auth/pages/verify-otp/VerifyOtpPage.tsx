import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { useLocation, useNavigate } from "react-router-dom";

import authHorseImage from "../../../../assets/images/login-horse.jpg";
import "./VerifyOtpPage.css";

const OTP_LENGTH = 6;
const OTP_EXPIRE_TIME = 120;

function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email được truyền từ RegisterPage.
  // Nếu không có thì dùng email mẫu.
  const email =
    (location.state as { email?: string } | null)?.email ??
    "name@example.com";

  const [otp, setOtp] = useState<string[]>(
    Array(OTP_LENGTH).fill("")
  );

  const [timeLeft, setTimeLeft] = useState(
    OTP_EXPIRE_TIME
  );

  const [isVerified, setIsVerified] = useState(false);

  const inputsRef = useRef<
    Array<HTMLInputElement | null>
  >([]);

  /*
   * ===============================
   * COUNTDOWN TIMER
   * ===============================
   */

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((currentTime) => {
        if (currentTime <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return currentTime - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [timeLeft]);

  /*
   * ===============================
   * REDIRECT AFTER SUCCESS
   * ===============================
   */

  useEffect(() => {
    if (!isVerified) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigate("/login");
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isVerified, navigate]);

  /*
   * ===============================
   * FORMAT TIME
   * ===============================
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
   * ===============================
   * KEYBOARD CONTROL
   * ===============================
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
   * ===============================
   * PASTE OTP
   * ===============================
   */

  const handlePaste = (
    event: ClipboardEvent<HTMLInputElement>
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

  const handleVerifyOtp = () => {
    const otpCode = otp.join("");

    if (otpCode.length !== OTP_LENGTH) {
      alert("Vui lòng nhập đủ 6 số OTP.");
      return;
    }

    if (timeLeft === 0) {
      alert(
        "Mã OTP đã hết hạn. Vui lòng gửi lại mã."
      );
      return;
    }

    console.log("Verify OTP:", {
      email,
      otp: otpCode,
    });

    /*
     * DEMO:
     * Tạm thời coi như OTP đúng.
     */
    setIsVerified(true);

    /*
     * Sau này dùng API thật:
     *
     * try {
     *   const response = await verifyOtpApi({
     *     email,
     *     otp: otpCode,
     *   });
     *
     *   if (response.success) {
     *     setIsVerified(true);
     *   }
     * } catch (error) {
     *   alert("Mã OTP không chính xác.");
     * }
     */
  };

  /*
   * ===============================
   * RESEND OTP
   * ===============================
   */

  const handleResendOtp = () => {
    console.log("Resend OTP to:", email);

    setOtp(Array(OTP_LENGTH).fill(""));

    setTimeLeft(OTP_EXPIRE_TIME);

    inputsRef.current[0]?.focus();

    /*
     * Sau này:
     *
     * await resendOtpApi(email);
     */
  };

  /*
   * ===============================
   * CHANGE EMAIL
   * ===============================
   */

  const handleChangeEmail = () => {
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
              <div className="otp-brand-icon">♞</div>

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
            {isVerified ? (
              /*
               * ===============================
               * SUCCESS STATE
               * ===============================
               */

              <div className="otp-success-state">
                <div className="otp-success-icon">✓</div>

                <h2>Xác thực email thành công!</h2>

                <p className="otp-success-description">
                  Tài khoản của bạn đã được tạo.
                  <br />
                  Bạn sẽ được chuyển đến trang đăng nhập
                  ngay bây giờ.
                </p>

                <div className="otp-redirect-box">
                  <div className="otp-loading-circle" />

                  <div className="otp-redirect-content">
                    <strong>
                      Đang chuyển đến trang đăng nhập...
                    </strong>

                    <span>Vui lòng chờ trong giây lát.</span>
                  </div>
                </div>
              </div>
            ) : (
              /*
               * ===============================
               * OTP FORM
               * ===============================
               */

              <>
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
                    timeLeft === 0 ? "otp-expired" : ""
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

                  <button type="button" onClick={handleResendOtp}>
                    Gửi lại
                  </button>
                </p>

                {/* VERIFY */}

                <button
                  type="button"
                  className="otp-submit-button"
                  onClick={handleVerifyOtp}
                  disabled={timeLeft === 0}
                >
                  Xác nhận OTP
                </button>

                {/* CHANGE EMAIL */}

                <button
                  type="button"
                  className="change-email-button"
                  onClick={handleChangeEmail}
                >
                  Thay đổi email
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default VerifyOtpPage;