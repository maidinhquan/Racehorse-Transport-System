# API Flow 1 theo frontend

Đọc [FLOW1-FRONTEND-CONTRACT.md](FLOW1-FRONTEND-CONTRACT.md) trước. Bộ này giữ đúng endpoint, payload và GET data shape của Customer/Manager hiện tại, với luồng **DRAFT → submit → hợp đồng → cọc → OTP → kích hoạt → phân công**.

- [43 thao tác API](ENDPOINTS.md).
- [OpenAPI 3.1.0](flow1.frontend.openapi.json) để import vào công cụ hỗ trợ OpenAPI 3.1.
- [Types Customer](customer.types.snapshot.ts), [types Manager](manager.types.snapshot.ts).
- [Manifest hàm API](operations.json).

Đây là contract `frontend-first` 1.0.0-draft, không phải backend đã implement. Response data của mutation được đề xuất vì frontend hiện chỉ dùng boolean success. Những thiếu hụt về file bytes, xác minh tiền, đồng bộ state và khác biệt với baseline v2.5 được ghi trong contract.
