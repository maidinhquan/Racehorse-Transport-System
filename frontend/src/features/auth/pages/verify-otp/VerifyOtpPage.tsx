import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

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
const OTP_EXPIRE_SECONDS = 300;

/* =========================
   REGISTER STATE
========================= */

interface RegisterState {
  mode?: "demo" | "real";

  email?: string;

  registrationToken?: string;

  expiresIn?: number;
}

function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  /* =========================
     DATA FROM REGISTER PAGE
  ========================= */

  const registerState =
    location.state as RegisterState | null;

  const email =
    registerState?.email ??
    "name@example.com";

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

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(
    registerState?.expiresIn ??
      OTP_EXPIRE_SECONDS
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

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
    if (!isSuccess) {
      return;
    }

    if (redirectSeconds <= 0) {
      navigate("/login");
      return;
    }

    const timer = window.setTimeout(() => {
      setRedirectSeconds(
        (current) => current - 1
      );
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isSuccess,
    redirectSeconds,
    navigate,
  ]);

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

    if (!isOtpComplete) {
      setErrorMessage(
        "Vui lòng nhập đầy đủ mã OTP."
      );

      return;
    }

    setIsLoading(true);

    try {
      /* =========================
         DEMO FLOW
      ========================= */

      if (isDemo) {
        /*
          Giả lập thời gian xử lý.
        */
        await new Promise((resolve) =>
          setTimeout(resolve, 600)
        );

        /*
          Kiểm tra OTP demo.
        */
        if (otpValue !== demoOtp) {
          setErrorMessage(
            "Mã OTP không chính xác."
          );

          return;
        }

        /*
          OTP demo đúng
          → đăng ký thành công.
        */
        setIsSuccess(true);
        setRedirectSeconds(5);

        return;
      }

      /* =========================
         REAL BACKEND FLOW
      ========================= */

      /*
        Nếu không phải demo thì bắt buộc
        phải có registrationToken
        do Backend trả từ RegisterPage.
      */
      if (!registrationToken) {
        setErrorMessage(
          "Phiên đăng ký không hợp lệ. Vui lòng đăng ký lại."
        );

        return;
      }

      /*
        API CONTRACT:

        POST
        /api/auth/register/verify-otp

        {
          registrationToken,
          otp
        }
      */
      await verifyRegisterOtp({
        registrationToken,
        otp: otpValue,
      });

      /*
        Backend xác minh thành công.
      */
      setIsSuccess(true);
      setRedirectSeconds(5);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
            "Không thể xác minh mã OTP."
        );
      } else {
        setErrorMessage(
          "Đã xảy ra lỗi. Vui lòng thử lại."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================
     RESEND OTP
  ========================= */

  const handleResendOtp = async () => {
    setErrorMessage("");
    setIsResending(true);

    try {
      /* =========================
         DEMO
      ========================= */

      if (isDemo) {
        /*
          Giả lập gửi lại OTP.
        */
        await new Promise((resolve) =>
          setTimeout(resolve, 400)
        );

        setOtp(
          Array(OTP_LENGTH).fill("")
        );

        setRemainingSeconds(
          OTP_EXPIRE_SECONDS
        );

        inputRefs.current[0]?.focus();

        return;
      }

      /* =========================
         REAL BACKEND
      ========================= */

      if (!registrationToken) {
        setErrorMessage(
          "Phiên đăng ký không hợp lệ. Vui lòng đăng ký lại."
        );

        return;
      }

      /*
        API CONTRACT:

        POST
        /api/auth/register/resend-otp

        {
          registrationToken
        }
      */
      const response =
        await resendRegisterOtp({
          registrationToken,
        });

      /*
        Xóa OTP cũ.
      */
      setOtp(
        Array(OTP_LENGTH).fill("")
      );

      /*
        Lấy thời gian OTP mới từ Backend.

        Nếu BE không gửi expiresIn
        → mặc định 300 giây.
      */
      setRemainingSeconds(
        response.data?.expiresIn ??
          OTP_EXPIRE_SECONDS
      );

      inputRefs.current[0]?.focus();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
            "Không thể gửi lại mã OTP."
        );
      } else {
        setErrorMessage(
          "Đã xảy ra lỗi. Vui lòng thử lại."
        );
      }
    } finally {
      setIsResending(false);
    }
  };

  /* =========================
     FORMAT TIMER
  ========================= */

  const formatTime = (
    seconds: number
  ) => {
    const minutes =
      Math.floor(seconds / 60);

    const secs =
      seconds % 60;

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
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

        <h2>
          Xác thực email
        </h2>

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
                  value={value}
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
                  aria-label={`OTP digit ${
                    index + 1
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
            className="verify-otp-resend-button"
            onClick={handleResendOtp}
            disabled={
              isResending ||
              isLoading
            }
          >
            {isResending
              ? "Đang gửi lại..."
              : "Gửi lại mã"}
          </button>

          {/* =====================
              VERIFY OTP
          ===================== */}

          <button
            type="submit"
            className="verify-otp-submit-button"
            disabled={
              !isOtpComplete ||
              isExpired ||
              isLoading ||
              isResending
            }
          >
            {isLoading
              ? "Đang xác nhận..."
              : "Xác nhận OTP"}
          </button>

        </form>

        {/* =====================
            CHANGE EMAIL
        ===================== */}

        <button
          type="button"
          className="verify-otp-change-email"
          onClick={() =>
            navigate("/register")
          }
        >
          Thay đổi email
        </button>

      </div>
    </AuthLayout>
  );
}

export default VerifyOtpPage;