# Backend Flow 6

Nhánh `Flow6-Backend`, tạo từ `main` tại `983c28e`. Phạm vi: backend Flow 6; frontend và hợp đồng của các flow khác không được sửa.

## Căn cứ triển khai

Quyết định đã thống nhất trong chat, `data/ID_NAME_RULE_Reviewed.md`, `data/DATABASE_STATUS_CONVENTION.md`, SQL `HorseTransportDB/HorseTransportDB_Reviewed.sql` và bộ hướng dẫn `contracts/API-Flow/Flow6_MyDraft_2026-10-29`.

**Không triển khai bản Flow6 1.1 trên main**: bản đó vẫn yêu cầu ảnh chữ ký, Customer nghiệm thu riêng và Request UNDER_RESOLUTION. Backend dùng 47 API `/operations/flow6`, `/customer/flow6`, `/manager/flow6` của bộ hướng dẫn chuẩn. Frontend `/aftercare` cũ cần chuyển contract khi tích hợp; không có adapter tự giả nghiệm thu hoặc chữ ký.

Luồng đã triển khai: DRAFT → AWAITING_OTP → CONFIRMED; Trip COMPLETED, Request DELIVERED, Contract vẫn EFFECTIVE. Confirm tạo hoặc lấy settlement DRAFT ngay trong giao dịch để khách có thể báo vấn đề trước trả đủ tiền. Sau hóa đơn và tiền đủ, Manager tất toán sang SETTLED, mở thời hạn FEEDBACK_WINDOW_HOURS. Khiếu nại OPEN → IN_PROGRESS → RESOLVED do Manager phản hồi. Hết mọi khiếu nại và nghĩa vụ tiền thì mở lại đủ thời hạn, retry không reset tiếp. Đóng sau thời hạn và hết nghĩa vụ; SUPPORT sau CLOSED không mở lại hồ sơ. Một đánh giá 1–5 sao cho mỗi settlement.

Quy tắc đặt tên và cấu trúc: [Naming.md](Naming.md). Bộ OpenAPI của backend: [openapi.json](openapi.json).

## File và trách nhiệm

| Đường dẫn trong backend | Trách nhiệm |
|---|---|
| `Application/Flow6/Services/AftercareService.cs` | Điều phối, quyền DB và tài nguyên, idempotency, chính sách theo nước → hình thức → toàn cục |
| `Application/Flow6/Services/AftercareService.Delivery.cs` | Đối chiếu tập ngựa, snapshot danh tính, biên bản/revision, OTP, từ chối và giao lại, thông báo |
| `Application/Flow6/Services/AftercareService.Settlement.cs` | Số dư từ snapshot đã ký và tiền SUCCESS, hồ sơ, khiếu nại, đánh giá, thời hạn, đóng |
| `Application/Flow6/Services/AftercareService.Billing.cs` | Điều chỉnh, phát hành/thay hóa đơn, phiên VNPay, ghi nhận IPN, nghĩa vụ hoàn tiền |
| `Application/Flow6/Services/AftercareService.Reconciliation.cs` | Query giao dịch FINAL_SETTLEMENT bị thiếu IPN; chỉ ghi kết quả đã xác minh |
| `Application/Flow6/Services/AftercareService.Closure.cs` | Đóng đến hạn bằng cùng guard với API Manager |
| `Application/Flow6/Contracts/ApiContract.cs`, `ApiContract.Validation.cs` | Schema cố định từ bộ chuẩn; kiểm required, field lạ, enum, giới hạn SQL, ngày UTC, email, ID |
| `Infrastructure/Flow6/Data/SqlStore.cs` | SQL có tham số, giao dịch SERIALIZABLE, khóa dùng chung với Flow 1 |
| `Infrastructure/Flow6/Data/DepositSession.cs` | Cách ly PAYMENT của FINAL_SETTLEMENT khỏi dịch vụ/worker tiền cọc cũ, ngăn query/cancel theo reference Flow 1 |
| `Infrastructure/Flow6/Email/DeliveryOtpSender.cs` | Email bàn giao riêng, không log mã; hash dùng bảo mật HMAC hiện có |
| `Infrastructure/Flow6/Documents/DeliveryRenderer.cs` | PDF từ toàn bộ revision snapshot, hỗ trợ Unicode qua LibreOffice; không tạo PDF giả khi chưa có renderer |
| `Infrastructure/Flow6/Payments/UnavailableRefundVerifier.cs` | Chặn ghi hoàn tiền thành công nếu chưa có adapter xác minh |
| `WebApi/Controllers/Flow6/AftercareController.cs` | 47 route, JWT role, envelope JSON, binary và lỗi an toàn |
| `WebApi/Extensions/Flow6` | DI, Swagger có schema cụ thể, lọc IPN tại URL cũ và hai worker |
| `Infrastructure/Flow6/Runtime/MemoryGuards.cs` | Bộ nhớ có giới hạn trong một tiến trình cho gửi lại thao tác và giới hạn OTP; không dùng SQL/Redis |
| `tests/Flow6` | Test HTTP + SQL thật trên database dùng một lần và test dữ liệu sai |

`WebApi/Program.cs` chỉ thêm namespace/module Flow 6; thay lần đăng ký Flow 1 bị lặp bằng đăng ký Flow 6. Lần đăng ký bị lặp gây lỗi trùng rate-limit policy khi khởi động. Không sửa service/controller Flow 1.

## Database và cấu hình

1. Dùng database đã có cấu trúc Reviewed, bao gồm năm bảng Flow 6, HANDOVER/ITEM, sequences và triggers. **Không chạy lại script reset Reviewed lên database đang hoạt động.**
2. Không có migration bổ sung cho Flow 6. Không tạo bảng kỹ thuật, không dùng Redis; backend chạy trên cấu trúc Reviewed hiện có. Script tạo hai bảng kỹ thuật trước đây đã được bỏ khỏi triển khai và khỏi bộ kiểm thử. Không chạy lệnh xóa bảng trên database đang dùng.
3. Kết nối lấy `ConnectionStrings:Flow6`, nếu thiếu dùng `Flow1`, rồi `DefaultConnection`. **Phải trỏ cùng database nghiệp vụ với Flow 1** để IPN và khóa giao dịch có tác dụng chung; không cấu hình hai bản sao độc lập.
4. Không thêm bảng/cột và không chỉnh rule/status gốc. Giữ khóa giao dịch SQL và các ràng buộc duy nhất hiện có để bảo vệ trạng thái, đánh giá, hóa đơn và tiền.

### Chống gửi lại và giới hạn OTP không thêm bảng

Theo quyết định ngày 02/11/2026, `IRuntimeGuards`/`MemoryGuards` là singleton trong backend:

- Các lệnh tạo phiên bản giao lại, điều chỉnh, khiếu nại và đánh giá vẫn nhận `Idempotency-Key`. Kết quả được nhớ sau khi giao dịch SQL commit; gửi lại trong cùng tiến trình trả bản sao kết quả đã nhớ, kiểm lại quyền từ database. Cùng key khác tài nguyên hoặc nội dung trả 409. Lệnh lỗi/rollback không được ghi vào bộ nhớ. Khóa cục bộ ngăn hai lần gửi đồng thời dùng cùng key tạo trùng trong một tiến trình.
- Kết quả nhớ tối đa 24 giờ, có thể bị loại sớm khi bộ nhớ đầy. Cache dùng chung hạn mức 10.000 mục cho kết quả thao tác và giới hạn OTP, không lưu plaintext OTP.
- Gửi/hủy OTP bị giới hạn theo biên bản và người thao tác trong bộ nhớ (tối đa 20 lần mỗi giờ). Gửi lại còn kiểm `HANDOVER_REVISION.OtpSentAtUtc` với policy cooldown. Hạn mã và số lần sai vẫn nằm trong các cột OTP hiện có, được lưu qua khởi động lại. Gửi lại mã không reset số lần sai.
- Bộ nhớ mất khi khởi động lại, không dùng chung giữa nhiều máy và không nguyên tử với SQL commit. Nếu cache đã mất hoặc tiến trình dừng sau commit trước khi nhớ kết quả, yêu cầu tạo khiếu nại/điều chỉnh có thể được xử lý như thao tác mới. Giới hạn xuyên lần hủy/tạo phiên bản OTP cũng chỉ bảo đảm trong tiến trình đang chạy. Không cam kết chống trùng xuyên khởi động lại hoặc giới hạn toàn cụm.
- Dữ liệu nghiệp vụ đã lưu vẫn được bảo vệ bằng trạng thái/ràng buộc và khóa SQL: một đánh giá/settlement; xác nhận giao, tất toán, đóng và IPN lặp không tự nhân đôi tiền hoặc chuyển trạng thái lần nữa. Không tự so nội dung để gộp hai khiếu nại hợp lệ.

Các tài liệu nguồn trong `contracts/` được giữ nguyên; mô tả idempotency bền vững trong bản nguồn là thiết kế trước quyết định này. Bản OpenAPI đi kèm tại đây và backend hiện tại ghi rõ bảo đảm có giới hạn trong bộ nhớ.

Ví dụ cấu hình, không chứa bí mật:

```json
{
  "Flow6": {
    "EnableClosureWorker": true,
    "EnablePaymentReconciliation": true,
    "LibreOfficeExecutable": "C:/Program Files/LibreOffice/program/soffice.exe",
    "Email": {
      "Smtp": {
        "Host": "smtp.example.invalid",
        "Port": 587,
        "EnableSsl": true,
        "From": "delivery@example.invalid"
      }
    }
  }
}
```

Thông tin SMTP xác thực lấy từ cấu hình riêng/environment (`Flow6__Email__Smtp__Username`, `Password`). Hai worker chỉ chạy khi được bật. VNPay và khóa HMAC tiếp tục dùng cấu hình provider dùng chung `Flow1:Vnpay`, `Flow1:Contracts:OtpHmacKey`. Không có mã OTP mặc định. Policy TTL/cooldown/max attempts/feedback lấy BUSINESS_POLICY; không hardcode thời lượng từ ví dụ.

IPN vẫn **GET `/api/payments/vnpay/ipn`**. Filter chỉ tiếp nhận reference `F6PAYMENT…T…`, kiểm provider trước ghi nhận. Giao dịch cọc đi tiếp handler cũ. Return của trình duyệt không ghi tiền. IPN sai số tiền/merchant/chữ ký không tăng PaidAmount. IPN lặp không ghi trùng; tiền đến muộn được giữ SUCCESS kèm FinancialReviewRequired và thông báo, chặn tất toán/đóng. Query chưa rõ kết quả giữ pending, không tự kết luận không bị trừ tiền.

## Điểm tích hợp cần biết

- Đến đích được kiểm từ ROUTE_SEGMENT DESTINATION có COMPLETED và ActualTime. ETA không đủ. Nếu backend Flow 4 mới dùng kho milestone riêng thì cần nối nguồn xác nhận thực tế này; không suy đoán từ Trip IN_TRANSIT. Không sửa Flow 4 trong nhánh này.
- Quyền người thực hiện dựa TRIP_VEHICLE_ASSIGNMENT.DriverID/EscortID đúng Trip theo schema chuẩn. Bảng này chưa biểu diễn phân công theo chặng; khi triển khai AIR phân công riêng đầu đến, module nguồn phải cung cấp ánh xạ có thẩm quyền, không suy từ crewDuty trên client.
- Snapshot giá bán hỗ trợ cấu trúc thực của SnapshotBuilder hiện tại: `commercial.totalPrice`. Snapshot demo/legacy thiếu cấu trúc này trả lỗi rõ, không lấy báo giá hiện tại thay giá đã ký. Biên bản demo cũ không có snapshot hoàn chỉnh cũng không được dựng lại từ master rồi coi là chứng cứ đã đóng băng.
- Sau SETTLED chỉ cho REFUND, không tái định giá bằng CHARGE/DISCOUNT. Giảm giá không được xóa tiền đã nhận. Thay hóa đơn chỉ khi hóa đơn cũ chưa có tiền, phiên pending hoặc đối soát; hủy hóa đơn cũ và phát hành mới cùng transaction, phù hợp unique index.
- OTP gửi qua SMTP trước khi ghi chuyển trạng thái và commit, dưới khóa giao dịch; gửi lỗi rollback. Nếu mail đã gửi nhưng commit lỗi, mã đó không có hiệu lực. Provider SMTP cần timeout ngắn; cách hiện tại ưu tiên nhất quán, chưa có outbox email riêng. Thông báo nghiệp vụ dùng bảng NOTIFICATION hiện có.
- Các PDF cần cấu hình LibreOffice; không có executable trả 501, không trả PDF giả. Môi trường kiểm thử hiện không cài LibreOffice nên chưa chứng nhận render PDF thực tế.
- J28 dùng `IRefundVerifier` để xác minh giao dịch hoàn đã thực hiện, không tự chuyển tiền. **Chưa có quy trình/provider hoàn tiền được cấp trong repo; verifier mặc định trả 501**. Cần cung cấp adapter đã được tổ chức cho phép trước khi sử dụng J28 thật; reference do client gửi không đủ để tự ghi COMPLETED. J27 vẫn ghi nghĩa vụ PROCESSING và chặn đóng.
- Tiền thừa hoặc giao dịch cần FinancialReviewRequired tiếp tục chặn đóng cho đến khi được đối soát thực sự; không tự xóa cờ hoặc bịa tiền hoàn. Chưa có API công khai để Manager tùy ý bỏ cờ đối soát.
- Khi build Docker, đã sửa dấu phẩy bị thiếu, loại khóa JSON trùng (giữ giá trị cuối) trong `WebApi/appsettings.json` và khai báo volume trùng trong `compose.yaml` để ứng dụng khởi động được. Không thay giá trị cấu hình. Test host vẫn dùng cấu hình riêng cho database tạm.

## Kiểm thử và phạm vi xác nhận

```powershell
dotnet build backend/WebApi/WebApi.csproj --no-restore
dotnet test backend/tests/Flow6/Aftercare.Tests.csproj
```

Test dùng SQL Server `.\SQLEXPRESS` với Windows authentication; có thể đặt `FLOW1_TEST_SQL` để đổi máy chủ test. Fixture chỉ tạo/xóa database có tên ngẫu nhiên và prefix kiểm soát. Không tác động database đang dùng. SMTP được capture trong bộ nhớ; IPN được ký bằng secret test, không phải chuyển tiền thật.

Đã kiểm tra luồng chính, quyền ngoài chủ/phân công, JSON sai, OTP sai vẫn ghi counter, xác nhận giao trước trả số dư, callback giả/sai tiền/trùng/muộn, chống retry trùng, thay hóa đơn, khóa hóa đơn có phiên pending, tạo draft đồng thời, revision từ chối bất biến, phản hồi/khiếu nại sau SETTLED, reset không lặp, đóng qua worker và SUPPORT sau CLOSED. Swagger kiểm đủ 47 operation và schema body rõ.

Không đồng nghĩa chứng nhận E2E với frontend, SMTP thật, VNPay công khai, query API nhà cung cấp thật hoặc PDF thực. Không commit/push/deploy trong lượt này.

Cập nhật kiểm thử 02/11/2026: **33/33 đạt** sau khi bỏ hoàn toàn migration bổ sung. Test xác nhận chỉ có 37 bảng trong schema Reviewed; thêm kiểm tra retry đồng thời, lỗi không lưu cache, kiểm quyền khi replay, cache mất sau khởi động lại, cooldown OTP và bộ đếm sai từ revision hiện có.

Swagger chia 47 API thành 11 nhóm theo hành trình nghiệp vụ, có thứ tự `x-flow-order` dùng lại bộ sắp xếp giao diện của Flow 1. Nhánh khiếu nại được mô tả rõ là dùng được ngay sau bàn giao; số nhóm không bắt buộc gọi tuần tự tất cả API. Cách chia nhóm nằm ở `WebApi/Extensions/Flow6/JourneyOrder.cs`.

Trường context biên bản giao cuối dùng `deliveryHandoverId` (thay `deliveryId`) để cùng cách đặt tên với `pickupHandoverIds`. Giá trị vẫn là HANDOVER.HandoverID của Type=DELIVERY, null trước khi tạo biên bản; không đổi tên cột database.
