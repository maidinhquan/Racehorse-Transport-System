import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { useNavigate } from "react-router-dom";
import { registrationErrorMessage, resendRegistrationOtp, verifyRegistrationOtp } from "../../api/registrationApi";
import { clearRegistrationSession, loadRegistrationSession, saveRegistrationSession } from "../../api/registrationSession";

import axios from "axios";

import {
  verifyRegisterOtp,
  resendRegisterOtp,
} from "../../api/authApi";

import AuthLayout from "../../../../shared/layouts/AuthLayout/AuthLayout";

import "./VerifyOtpPage.css";

/* =========================
   CONSTANTS
========================= */

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

  const registrationToken =
    registerState?.registrationToken ?? "";

  /*
    Demo chỉ được phép hoạt động
    khi đang chạy development.
  */
  const isDemo =
    import.meta.env.DEV &&
    registerState?.mode === "demo";

  /*
    OTP demo lấy từ .env.development

    Nếu chưa khai báo thì mặc định:
    123456
  */
  const demoOtp =
    import.meta.env.VITE_DEMO_OTP ??
    "123456";

  /* =========================
     STATES
  ========================= */

  const [otp, setOtp] = useState<string[]>(
    Array(OTP_LENGTH).fill("")
  );

  const timeLeft = Math.max(0, Math.ceil(((session?.otpExpiresAt ?? now) - now) / 1000));
  const resendWait = Math.max(0, Math.ceil(((session?.resendAvailableAt ?? now) - now) / 1000));

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isResending,
    setIsResending,
  ] = useState(false);

  /*
    Khi xác minh OTP thành công
  */
  const [
    isSuccess,
    setIsSuccess,
  ] = useState(false);

  /*
    Countdown về Login
  */
  const [
    redirectSeconds,
    setRedirectSeconds,
  ] = useState(5);

  /* =========================
     OTP INPUT REFS
  ========================= */

  const inputRefs = useRef<
    Array<HTMLInputElement | null>
  >([]);

  /* =========================
     COMPUTED VALUES
  ========================= */

  const isExpired =
    remainingSeconds <= 0;

  const otpValue =
    otp.join("");

  const isOtpComplete =
    otpValue.length === OTP_LENGTH;

  /* =========================
     OTP COUNTDOWN
  ========================= */

  useEffect(() => {
    if (
      isSuccess ||
      remainingSeconds <= 0
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRemainingSeconds(
        (current) =>
          Math.max(current - 1, 0)
      );
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    remainingSeconds,
    isSuccess,
  ]);

  /* =========================
     SUCCESS COUNTDOWN

     5 → 4 → 3 → 2 → 1 → Login
  ========================= */

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

  /* =========================
     OTP INPUT CHANGE
  ========================= */

  const handleOtpChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(-1);

    const nextOtp = [...otp];

    nextOtp[index] = value;

    setOtp(nextOtp);
    setErrorMessage("");

    /*
      Tự focus sang ô tiếp theo
    */
    if (
      value &&
      index < OTP_LENGTH - 1
    ) {
      inputRefs.current[
        index + 1
      ]?.focus();
    }
  };

  /* =========================
     BACKSPACE
  ========================= */

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    /*
      Nếu ô hiện tại rỗng và bấm Backspace
      → quay về ô trước.
    */
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      inputRefs.current[
        index - 1
      ]?.focus();
    }
  };

  /* =========================
     VERIFY OTP
  ========================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");

    /* =========================
       VALIDATION
    ========================= */

    if (isExpired) {
      setErrorMessage(
        "Mã đã hết hạn. Vui lòng gửi lại mã mới để tiếp tục."
      );

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
      const updated = {
        ...session, otpExpiresAt: currentTime + data.expiresIn * 1000,
        resendAvailableAt: currentTime + data.resendAfterSeconds * 1000
      };
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

  /* =========================
     FORMAT TIMER
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

          <div className="register-success-icon">
            ✓
          </div>

          <h2>
            Đăng ký thành công!
          </h2>

          <p>
            Chúc mừng bạn đã tạo tài khoản
            CNB Transport thành công.
          </p>

          <p className="register-success-redirect">
            Bạn sẽ được chuyển đến trang
            đăng nhập trong{" "}
            <strong>
              {redirectSeconds}
            </strong>{" "}
            giây.
          </p>

          <button
            type="button"
            className="register-success-button"
            onClick={() =>
              navigate("/login")
            }
          >
            Đăng nhập ngay
          </button>

        </div>
      </AuthLayout>
    );
  }

  /* =========================
     VERIFY OTP SCREEN
  ========================= */

  return (
    <AuthLayout>
      <div className="verify-otp-form-wrapper">

        {/* =====================
            STEP INDICATOR
        ===================== */}

        <div className="verify-otp-steps">

          <div className="verify-otp-step completed">

            <span className="verify-otp-step-number">
              1
            </span>

            <span>
              Thông tin tài khoản
            </span>

          </div>

          <div className="verify-otp-step active">

            <span className="verify-otp-step-number">
              2
            </span>

            <span>
              Xác minh OTP
            </span>

          </div>

        </div>

        {/* =====================
            TITLE
        ===================== */}

        <div className="verify-otp-title-line" />

        <h2>Xác thực email</h2>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

        <p className="verify-otp-description">
          Chúng tôi đã gửi mã xác thực đến{" "}
          <strong>
            {email}
          </strong>
        </p>

        {/* =====================
            OTP FORM
        ===================== */}

        <form onSubmit={handleSubmit}>

          <div className="verify-otp-inputs">

            {otp.map(
              (value, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[
                      index
                    ] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                  maxLength={1}
                  disabled={action !== null}
                  value={digit}
                  onChange={(event) =>
                    handleOtpChange(
                      index,
                      event
                    )
                  }
                  onKeyDown={(event) =>
                    handleKeyDown(
                      index,
                      event
                    )
                  }
                  aria-label={`OTP digit ${index + 1
                    }`}
                />
              )
            )}

          </div>

          {/* =====================
              OTP TIMER
          ===================== */}

          {isExpired ? (
            <p className="verify-otp-expired">
              Mã đã hết hạn. Vui lòng
              gửi lại mã mới để tiếp tục.
            </p>
          ) : (
            <p className="verify-otp-countdown">
              Mã có hiệu lực trong{" "}
              <strong>
                {formatTime(
                  remainingSeconds
                )}
              </strong>
            </p>
          )}

          {/* =====================
              ERROR
          ===================== */}

          {errorMessage && (
            <p className="verify-otp-error">
              {errorMessage}
            </p>
          )}

          {/* =====================
              RESEND OTP
          ===================== */}

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={action !== null || resendWait > 0 || !session}
          >
            {action === "resend" ? "Đang gửi…" : resendWait > 0 ? `Gửi lại sau ${resendWait}s` : "Gửi lại"}
          </button>
        </p>

        {/* =====================
              VERIFY OTP
          ===================== */}

        <button
          type="button"
          className="otp-submit-button"
          onClick={handleVerifyOtp}
          disabled={action !== null || timeLeft === 0 || !session}
        >
          {action === "verify" ? "Đang xác minh…" : "Xác nhận OTP"}
        </button>

      </form>

      {/* =====================
            CHANGE EMAIL
        ===================== */}

      <button
        type="button"
        className="change-email-button"
        onClick={handleChangeEmail}
        disabled={action !== null}
      >
        Thay đổi email
      </button>

    </div>
    </AuthLayout >
  );
}

export default VerifyOtpPage;
