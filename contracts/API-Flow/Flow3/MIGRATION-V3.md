# Chuyển Flow 3 từ v2 sang v3

Ngày chốt: 30/10/2026. Chỉ thay contract thiết kế, không đổi DB/backend/giao diện ở bước này.

| Phần | v2 | v3 |
|---|---|---|
| Phương thức | Có thể chưa ghi nhận | Bắt buộc lấy từ hợp đồng có hiệu lực, không chọn ở Flow 3 |
| Ngày/giờ nhận | Nhập plannedDepart | Khách chốt pickupDate; Coordinator nhập pickupAt; server tính plannedDepart sau bàn giao |
| Tuyến bắt đầu | Chưa tách rõ điều xe | effectivePickup, không phải bãi xe |
| Điểm y tế/cách ly | Có mô tả bắt buộc cơ sở QUARANTINE khi đổi nơi nhận | Điểm tập kết phù hợp; không tự ép y tế/cách ly |
| Đổi điểm nhận | Manager ghi nhận consent thay khách | Coordinator J30 → Manager J31 → Manager J56 gửi → Customer J57 xem/J32 quyết định |
| Khách từ chối/chưa trả lời | Chưa tách bước gửi | Giữ effectivePickup cũ, đề xuất lại khi bị từ chối |
| Vượt hạn giao/lệch ngày nhận | Chặn Coordinator submit | Cho gửi reviewWarnings; Manager trả lại hoặc xử lý cam kết qua Flow 1; không approve vượt cam kết |

## Thay đổi wire payload

- Context thêm contractVersion, modeSource=CONTRACT, pickupDate, effectivePickup, effectivePickupRelocationId. `mode` không nullable trong v3.
- PlanDraftInput bắt buộc pickupAt; bỏ plannedDepart input. Không nhận mode/deadline/geometry/actor.
- Plan thêm pickupAt và reviewWarnings; Validation thêm warnings.
- PickupRelocation thêm proposalVersion, snapshot ảnh hưởng/trách nhiệm và sentAt/sentBy; trạng thái AWAITING_CUSTOMER, CUSTOMER_REJECTED, RETURNED, SUPERSEDED.
- J32 cũ `/manager/trips/{tripId}/pickup-relocation/customer-consent` retired với CONTRACT_SUPERSEDED.
- J32 mới `/customer/trips/{tripId}/pickup-relocation/decision`: body relocationId, proposalVersion, decision=ACCEPT|REJECT, note, acknowledged; không có actor hoặc timestamp client. REJECT cần note ít nhất 5 ký tự.
- J56 `/manager/trips/{tripId}/pickup-relocation/send`: expectedVersion, relocationId, proposalVersion.
- J57 GET `/customer/trips/{tripId}/pickup-relocation`: chỉ projection công khai của bản Manager đã gửi.
- Consent chỉ do Customer có quyền tạo từ quyết định của chính mình. Các bằng chứng PHONE/EMAIL/WRITTEN cũ chỉ là lịch sử; không tự nâng lên consent v3.

## Thứ tự triển khai sau khi contract được duyệt

1. Backend lưu proposal snapshot/version/trạng thái, actor, audit, idempotency; kiểm ownership và invalidation nguyên tử.
2. DTO/API v3 và bộ kiểm thử chuyển trạng thái, phiên bản, bảo mật projection, lịch trình.
3. Manager gửi đề xuất; portal Customer xem/chấp nhận/từ chối; Coordinator chờ và tính lại tuyến.
4. Đổi SDK/import và mirror runtime sang v3 đồng thời. Không dùng v3 để validate phản hồi backend v2.

Giữ bản hợp đồng/pickup gốc và lịch sử cũ. Không sửa hợp đồng đã ký hoặc dữ liệu thật chỉ bằng việc cập nhật contract API. Hợp đồng cũ thiếu mode cần workflow Flow 1 thích hợp trước khi dùng gate v3.
