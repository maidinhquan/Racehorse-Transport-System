import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  public handleClearAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#f8fafc",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "560px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              border: "1px solid #fee2e2",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: "24px",
                marginBottom: "16px",
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 8px 0",
              }}
            >
              Đã xảy ra lỗi khi tải giao diện
            </h2>

            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                lineHeight: "1.5",
                margin: "0 0 16px 0",
              }}
            >
              Trình duyệt gặp lỗi khi xử lý dữ liệu. Vui lòng bấm nút bên dưới để đặt lại bộ nhớ tạm và tải lại hệ thống.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#dc2626",
                  marginBottom: "20px",
                  overflowX: "auto",
                  maxHeight: "120px",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                style={{
                  padding: "10px 18px",
                  background: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Xóa cache &amp; Tải lại trang
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                style={{
                  padding: "10px 18px",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
