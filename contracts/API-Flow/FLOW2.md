# FLOW 02 – API CONTRACT v1.2: Quản lý hồ sơ pháp lý, kiểm dịch và thông quan

> **Dự án:** SWP391 – Cross-Border Racehorse Transport System (CBN Transport)  
> **Phạm vi:** VN→VN (nội địa) và VN→JP (Việt Nam xuất sang Nhật Bản), **không** JP→VN/VN→TH/quá cảnh quốc gia thứ ba trong demo.  
> **Vai trò chính:** `TRANSPORT_SPECIALIST`; phối hợp `CUSTOMER`, `LOGISTICS_MANAGER`, `FLEET_COORDINATOR`, `DRIVER`/`ESCORT`.  
> **Use Case:** `UC-TS-01` (quy định), `UC-TS-02` (checklist & review), `UC-TS-03` (kiểm dịch/thông quan), `UC-TS-04` (xuất bộ hồ sơ), `UC-CUST-04` (Customer Documents), hỗ trợ `UC-LM-04`.  
> **Phụ thuộc:** `00-conventions.md`, `01-shared-api.md`, `02-customer-api.md`, Specialist Role API hiện lưu dưới tên `Markdown đã dán (1)(5).md`, `04-manager-api.md`, Coordinator Role API và Flow 1 v2.3.  
> **Trạng thái:** v1.2 – demo Customer PER_HORSE + Insurance confirmation + Documents READY theo Flow 3 v1.2. API Contract thiết kế chi tiết, **chưa xác nhận đã implement hoặc đã xác minh đầy đủ các thủ tục pháp lý thực tế**. Những loại giấy tờ/thời hạn do cơ quan có thẩm quyền yêu cầu phải lấy từ Regulation Catalog đã được chuyên viên kiểm tra, không hardcode theo ví dụ.  
> **Quy ước đường dẫn:** Các route bên dưới đặt sau `/api` (ví dụ `GET /specialist/trips` = `GET /api/specialist/trips`).

---

## 1. Mục tiêu, ranh giới và điểm bàn giao

Flow 2 quản lý yêu cầu giấy tờ theo tuyến, thu nhận/chuyên viên thẩm định hồ sơ, thực hiện hoặc phối hợp hoàn thiện phần thủ tục thuộc trách nhiệm công ty **bao gồm chứng từ bảo hiểm vận chuyển ngựa**, theo dõi tính hợp lệ theo thời gian, **xác nhận Documents READY** theo snapshot và chuẩn bị gói hồ sơ xuất trình/ghi nhận kết quả kiểm dịch–thông quan tại các điểm kiểm soát thực tế.

**Đầu vào đã có từ Flow 1:** Customer đã gửi Request với đầy đủ hồ sơ `CUSTOMER` bắt buộc tại `REQUEST_SUBMISSION`; Request đã `ACTIVATED`, Trip đã `PLANNING`, hợp đồng `EFFECTIVE`, và Manager xác nhận deployment để các bộ phận triển khai. Hồ sơ ngựa đã upload từ wizard **được tái sử dụng**, không yêu cầu Customer nộp lại. Có thể xem checklist `PRELIMINARY` từ kế hoạch sơ bộ trước khi Trip tồn tại, nhưng checklist theo Trip chỉ được kích hoạt khi có Trip và quyền triển khai phù hợp.

**Giao với Flow 3:** Coordinator tạo/chỉnh route, flight/stop/checkpoint, phân công nguồn lực VN/JP và xác nhận `Operations READY`; Specialist cập nhật checklist khi route đổi, quản lý/xác minh hồ sơ bảo hiểm do công ty thu xếp và xác nhận `Documents READY`. Hai bộ phận xác nhận **độc lập trên snapshot phiên bản hiện hành**. Manager phê duyệt Route Version; Backend tự tổng hợp `ROUTE_APPROVED + OPERATIONS_CONFIRMED + DOCUMENTS_CONFIRMED` cùng các điều kiện còn hiệu lực trước khi chuyển Trip sang `READY_TO_DEPART`. Flow 2 **không** phê duyệt Route hoặc trực tiếp sửa TripStatus.

**Giao với Flow 4:** Khi `IN_TRANSIT`, Driver/Escort báo đến/rời checkpoint bằng milestone **thủ công**, Specialist ghi nhận riêng kết quả pháp lý chính thức. `PASSED_CHECKPOINT` do Driver báo **không đồng nghĩa** hải quan/kiểm dịch đã `PASSED`. Không có API GPS hoặc vị trí tự động trong Flow 2.

**Giao với Flow 5:** Clearance `HELD`/`FAILED` phải đưa ra cảnh báo và liên kết xử lý sự cố. Việc xử lý, phê duyệt phương án thay lộ trình hoặc chi phí nằm trong Flow 5; không tự tạo điều kiện vượt kiểm dịch từ UI.

### 1.1 Luồng chuẩn

```text
Flow 1: Hồ sơ Customer trước Submit → Request ACTIVATED + Trip PLANNING
  → Manager CONFIRM deployment
  → Specialist nhận nhiệm vụ, xem route sơ bộ, danh sách ngựa
  → BE tạo/đồng bộ checklist PRELIMINARY từ quy định có hiệu lực
  → Specialist yêu cầu Customer bổ sung / chuẩn bị hồ sơ do COMPANY đảm nhiệm
  → Customer upload/replace + Specialist APPROVE/REJECT phiên bản tài liệu
  → Flow 3: Coordinator submit Route Version
  → BE đối chiếu tuyến, điểm kiểm soát, ETA → checklist FINAL cho route version
  → Công ty thu xếp mua bảo hiểm ngựa ngoài hệ thống; Specialist lưu policy thực tế
  → Specialist xác minh insured horses/phạm vi tuyến/thời gian/điểm dừng của policy
  → Checklist READY khi mọi mục bắt buộc áp dụng được duyệt và đủ hiệu lực
  → Specialist xem Documents Readiness và xác nhận DOCUMENTS READY theo snapshot
  → Flow 3: Coordinator phân công xe/người/booking từng chặng VN, JP và xác nhận OPERATIONS READY
  → Manager APPROVE Route Version hiện hành (độc lập với hai xác nhận)
  → BE recheck cả 2 xác nhận + Route APPROVED + điều kiện hợp lệ
  → Trip READY_TO_DEPART → IN_TRANSIT (Flow 3/4)
  → Specialist ghi nhận kết quả kiểm dịch/thông quan tại checkpoint thực tế
  → PASSED / HELD / FAILED + lịch sử kết quả, hồ sơ kèm theo, thông báo
```

### 1.2 Những điều **không** có trong demo

- Không có hành trình VN→TH, JP→VN hoặc quá cảnh KH; không tạo thủ tục giả định cho nước khác.
- Không coi hệ thống là cổng điện tử của cơ quan thú y/hải quan; **ghi nhận hồ sơ, trạng thái và bằng chứng** do người có thẩm quyền cung cấp/xác nhận, không giả lập cấp giấy phép.
- Không giả định một tài liệu bắt buộc cho mọi tuyến hoặc đặt thời hạn pháp lý cố định từ ví dụ.
- Không thay thế quyền phê duyệt lộ trình của Manager bằng quyền của Specialist.
- Không bán/mua bảo hiểm trực tuyến trong hệ thống và không xử lý yêu cầu bồi thường trong demo; công ty thu xếp với đơn vị bảo hiểm ngoài hệ thống rồi Specialist ghi nhận chứng từ.

---

## 2. Business Rules và bất biến

| Mã | Quy tắc Backend bắt buộc |
|---|---|
| `F02-BR-01` | Chỉ VN→VN và VN→JP; mode/checkpoints phải là tuyến thực tế được BE cấu hình hỗ trợ. |
| `F02-BR-02` | Dùng một nguồn Regulation/Requirement Catalog cho API trước Submit của Flow 1 và checklist Flow 2. |
| `F02-BR-03` | Mỗi requirement chỉ rõ `responsibleParty` (`CUSTOMER`/`COMPANY`), `requiredAt` và `scope` (`PER_HORSE`/`PER_TRIP`). |
| `F02-BR-04` | `CUSTOMER + REQUEST_SUBMISSION` là nhóm BE kiểm tra trước khi tạo Request; `COMPANY` không được chặn Submit chỉ vì chưa được làm xong. |
| `F02-BR-05` | Document `SUBMITTED` chứng minh đã nộp; **không** đồng nghĩa `APPROVED`; Specialist thẩm định tính hợp lệ chuyên môn riêng. |
| `F02-BR-06` | Document đã duyệt có thể không đủ hiệu lực ở thời điểm departure/arrival; readiness phải re-evaluate theo ETA và quy định áp dụng. |
| `F02-BR-07` | Chỉ `TRANSPORT_SPECIALIST` có quyền duyệt/từ chối tài liệu; BE kiểm tra phân công và phạm vi truy cập. |
| `F02-BR-08` | Giấy tờ công ty thực hiện được lưu vào Document và checklist, có actor/nguồn gốc và bằng chứng; không tự phê duyệt mặc định. |
| `F02-BR-09` | Mỗi Document replacement tạo phiên bản mới và giữ phiên bản cũ/audit; không ghi đè tệp/bằng chứng đã duyệt. |
| `F02-BR-10` | Checklist tái đánh giá khi đổi route, thời gian, danh sách ngựa, document, regulation; không xóa item không còn áp dụng khỏi lịch sử. |
| `F02-BR-11` | `READY` chỉ khi tất cả requirement bắt buộc áp dụng đều đạt điều kiện; `READY` không tự có nghĩa Trip được phép khởi hành. |
| `F02-BR-12` | `PRELIMINARY` chỉ để chuẩn bị; `FINAL` gắn route version phù hợp, checkpoint và ETA đã biết; chưa có tuyến hoàn chỉnh không kết luận READY chính thức. |
| `F02-BR-13` | Mọi thay đổi regulation có version và hiệu lực theo thời gian; thay đổi phải đánh dấu checklist chịu ảnh hưởng để re-evaluate. |
| `F02-BR-14` | Customer chỉ xem/sửa tài liệu thuộc Horse/Request của họ và các thông tin được phép công bố; Manager xem giám sát, không tự duyệt thay Specialist. |
| `F02-BR-15` | Driver milestone và Specialist clearance là **hai nguồn dữ liệu khác nhau**; kết quả pháp lý không thể suy ra từ milestone. |
| `F02-BR-16` | Clearance result là log bất biến; muốn cập nhật tình hình phải ghi result mới kèm bằng chứng, không sửa bản cũ. |
| `F02-BR-17` | `HELD`/`FAILED` phải cảnh báo liên quan; khi kích hoạt Incident phải idempotent, không tự tạo trùng do retry. |
| `F02-BR-18` | Bảo hiểm vận chuyển ngựa là điều kiện hồ sơ bắt buộc của demo do **COMPANY** thu xếp ngoài hệ thống. Specialist lưu và xác minh policy thực tế; khoản phí bảo hiểm đã tính trong Draft Contract (Flow 1) **không** chứng minh bảo hiểm đã mua hay có hiệu lực. |
| `F02-BR-19` | Các file pháp lý/y tế chỉ tải qua cơ chế có xác thực và kiểm tra quyền; tránh URL công khai, cache hoặc log dữ liệu nhạy cảm. |
| `F02-BR-20` | Audit tất cả thao tác upload, duyệt, từ chối, đổi quy định, tái sinh checklist, xuất package, ghi clearance. |
| `F02-BR-21` | Các API thay đổi dữ liệu có kiểm tra concurrency/version/idempotency phù hợp; phát SignalR **sau commit**. |
| `F02-BR-22` | Không tự khai báo đã thông quan, kiểm dịch thành công hoặc đạt chuẩn pháp luật khi chưa có bằng chứng/cơ quan có thẩm quyền xác nhận. |
| `F02-BR-23` | Chỉ Specialist đủ quyền được upload, thay thế và xác minh **chứng từ bảo hiểm**; Manager chỉ xem trạng thái/chứng từ trong phạm vi được phép, Coordinator không có quyền upload hoặc duyệt policy. |
| `F02-BR-24` | Chỉ xác minh `InsuranceVerificationStatus=VERIFIED` khi chứng từ insurer đã phát hành, danh sách ngựa, tuyến/chặng ROAD–AIR, phạm vi và thời hạn áp dụng phù hợp; không tự suy luận mọi rủi ro/chi phí phát sinh đều được bảo hiểm. |
| `F02-BR-25` | Specialist xác nhận `Documents READY` chỉ khi checklist `FINAL` của Route Version hiện hành là `READY`, policy thực tế `VERIFIED` và còn phù hợp, không có hồ sơ bắt buộc đang thiếu/hết hiệu lực; xác nhận được lưu theo snapshot, không làm thay Coordinator. |
| `F02-BR-26` | `Documents READY` và `Operations READY` là hai xác nhận độc lập, **không thêm TripStatus**. Route Manager `APPROVED` là điều kiện riêng; chỉ Backend tổng hợp các nguồn đã xác thực để đưa Trip `PLANNING → READY_TO_DEPART`. |
| `F02-BR-27` | Khi regulation/document/policy/horse/route/ETA/điểm dừng thay đổi ảnh hưởng điều kiện, Backend thu hồi **hiệu lực hiện hành** của Documents confirmation và đánh giá lại; giữ audit/snapshot lịch sử; không tự thu hồi Operations confirmation nếu dữ liệu điều phối không bị ảnh hưởng. |
| `F02-BR-28` | Customer không phải tự mua/upload policy bảo hiểm. Không mặc định yêu cầu giấy ủy quyền hay upload giấy tờ chung Customer trong demo; hồ sơ pháp lý `PER_TRIP` do công ty thực hiện nằm ở Flow 2, còn giấy tờ từng ngựa thuộc trách nhiệm Customer phải có theo checklist trước Submit. |
| `F02-BR-29` | Demo không có Customer `PER_TRIP` API/Requirement tại Request Creation/Revision; `F02-C11/C12` là deferred. COMPANY/Specialist quản lý hồ sơ chung, Customer vẫn phải cung cấp PER_HORSE bắt buộc. |
| `F02-BR-30` | Checkbox UI “bảo hiểm OK” chỉ hiển thị policy đã VERIFIED thực tế; Backend không nhận boolean tự khai để xác nhận chứng từ. Documents READY cần cả checklist hợp lệ và policy verified, snapshot còn hiệu lực. |

---

## 3. Quy ước API, quyền và trạng thái

**Base URL:** `/api`. **Header:** `Authorization: Bearer <accessToken>`, `Accept: application/json`, `Content-Type: application/json` cho JSON. Upload dùng `multipart/form-data` với `payload` JSON string + `files` (không set Content-Type thủ công trên FE). Date-only `YYYY-MM-DD`; timestamp ISO 8601 UTC có `Z` hoặc offset. Phân trang `page=1&pageSize=20`, `pageSize<=100`.

**Success envelope:**

```json
{ "success": true, "message": "OK", "data": {} }
```

**Error envelope:**

```json
{
  "success": false,
  "message": "Required customer document is missing",
  "errorCode": "REQUIRED_CUSTOMER_DOCUMENT_MISSING",
  "data": null,
  "errors": [{ "field": "horseIds[0]", "message": "Missing required passport scan" }]
}
```

`errors[]` chỉ dành cho lỗi validation từng trường theo `00-conventions.md`; lỗi nghiệp vụ sử dụng `errorCode` ổn định. File binary từ `GET /files/{fileId}` không bọc envelope.

### 3.1 Enum kế thừa nguyên dạng từ conventions

| Enum | Giá trị |
|---|---|
| `DocumentStatus` | `SUBMITTED`, `APPROVED`, `REJECTED`, `EXPIRED`, `SUPERSEDED` |
| `DocumentGroup` | `MEDICAL`, `QUARANTINE`, `CUSTOMS` |
| `DocumentScope` | `PER_HORSE`, `PER_TRIP` |
| `ChecklistItemStatus` | `NOT_SUBMITTED`, `SUBMITTED`, `APPROVED`, `REJECTED`, `EXPIRED` |
| `ChecklistStatus` | `NOT_READY`, `READY` |
| `RegulationDirection` | `EXPORT`, `IMPORT`, `TRANSIT`, `DOMESTIC` |
| `ClearanceResult` | `PASSED`, `HELD`, `FAILED` |
| `RouteStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `RETURNED` |
| `TripStatus` | `PLANNING`, `READY_TO_DEPART`, `IN_TRANSIT`, `COMPLETED` |
| `InsuranceVerificationStatus` | `PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED` |

### 3.2 Metadata Flow 2 bổ sung để đồng bộ Flow 1

| Field | Giá trị | Ý nghĩa |
|---|---|---|
| `responsibleParty` | `CUSTOMER`, `COMPANY` | Bên có trách nhiệm chuẩn bị/nộp nguồn hồ sơ |
| `requiredAt` | `REQUEST_SUBMISSION`, `BEFORE_DEPARTURE` | Mốc phải sẵn có; mốc chuyên môn khác do catalog cấu hình, không mặc định |
| `stage` | `PRELIMINARY`, `FINAL` | Checklist sơ bộ hoặc theo route version |
| `isApplicable` | boolean | Item có còn áp dụng với kế hoạch hiện hành |
| `regulationChanged` | boolean | Có thay đổi regulation cần Specialist rà soát |

**Lưu ý:** Đây là các metadata trong payload, không thay `DocumentStatus`, không thêm `RequestStatus` hoặc `TripStatus`. `REQUEST_SUBMISSION` là mốc kiểm tra Customer đã nộp, **không có nghĩa Specialist phải duyệt xong tại Submit**.

### 3.3 Phạm vi truy cập

- `CUSTOMER`: chỉ tài liệu của Horse thuộc mình, Request của mình, checklist được công bố; Customer không approve, không tự tạo kết quả clearance.
- `TRANSPORT_SPECIALIST`: đọc danh mục phù hợp; sửa dữ liệu chuyên môn, **quản lý và xác minh bảo hiểm**, xác nhận `Documents READY` trên Trip được phân công hoặc thuộc phạm vi nghiệp vụ được BE cấp. Không coi role là quyền tự động vào tất cả Trip.
- `LOGISTICS_MANAGER`: đọc overview/checklist/departure-conditions, xem bảo hiểm để giám sát, phân công Specialist và duyệt route; **không** verify policy thay Specialist.
- `FLEET_COORDINATOR`: tra checkpoint đã công bố, gửi route, xem **badge Documents READY** để phối hợp, không đọc/duyệt policy bảo hiểm, không sửa clearance/result; xác nhận Operations READY tại Flow 3.
- `DRIVER`/`ESCORT`: truy cập bộ tài liệu đi đường đã duyệt được chia sẻ theo Trip/chặng, cập nhật milestone thủ công ở Flow 4, không tự ghi `PASSED` pháp lý.

---

## 4. Data Contract: Regulation Requirement, Document, Checklist, Clearance, Insurance

### 4.1 `RequirementDefinition` – một nguồn cho Flow 1 và Flow 2

```json
{
  "requirementId": 501,
  "documentTypeId": 3,
  "documentTypeCode": "EQUINE_PASSPORT",
  "group": "CUSTOMS",
  "scope": "PER_HORSE",
  "responsibleParty": "CUSTOMER",
  "requiredAt": "REQUEST_SUBMISSION",
  "isMandatory": true,
  "appliesTo": { "originCountry": "VN", "destinationCountry": "JP", "mode": null, "checkpointId": null },
  "applicableHorseId": 31,
  "regulationIds": [21],
  "regulationVersionIds": [47],
  "notes": "Ví dụ cấu trúc, không phải danh mục pháp lý được xác nhận"
}
```

- `documentTypeCode` và `group` lấy Catalog, **không** hardcode mọi passport thuộc `CUSTOMS` theo ví dụ.
- Bộ máy áp dụng quy tắc phân biệt cặp nước, tuyến nội địa/quốc tế, mode, Horse, thời điểm hiệu lực, checkpoint đã chọn và các điều kiện thực tế được cấu hình.
- Catalog có thể có tài liệu `COMPANY/PER_HORSE` (ví dụ công ty phối hợp khám/xét nghiệm từng ngựa), **không giới hạn COMPANY thành PER_TRIP**.
- Requirement definition version/snapshot gắn vào checklist để khi thay đổi catalog có thể audit.

### 4.2 `Document` – một phiên bản tệp/tài liệu

```json
{
  "documentId": 470,
  "documentType": { "documentTypeId": 3, "code": "EQUINE_PASSPORT", "name": "Equine Passport", "group": "CUSTOMS" },
  "scope": "PER_HORSE",
  "horseId": 31,
  "tripId": null,
  "documentNumber": "EQ-VN-00123",
  "issuingAuthority": "Issuing authority on document",
  "issueDate": "2025-01-01",
  "expiryDate": "2029-01-01",
  "status": "SUBMITTED",
  "files": [{ "fileId": 950, "fileName": "passport.pdf", "contentType": "application/pdf", "sizeBytes": 512000, "url": "/api/files/950" }],
  "uploadedBy": { "userId": 12, "role": "CUSTOMER" },
  "uploadedAt": "2026-10-13T03:00:00Z",
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewNote": null,
  "rejectReason": null,
  "replacedDocumentId": null,
  "linkedChecklistItemIds": [1201],
  "allowedActions": ["VIEW", "REPLACE"]
}
```

`horseId` tồn tại khi scope `PER_HORSE`; tài liệu `PER_TRIP` gắn `tripId`, hoặc gắn vào Request tại thời điểm Submit theo contract Flow 1 rồi liên kết Trip sau activation. Một document có thể phục vụ nhiều Trip khi phạm vi/hiệu lực phù hợp, nhưng **mỗi Trip vẫn có đánh giá checklist riêng**.

### 4.3 `Checklist` – đánh giá theo Trip và route version

```json
{
  "tripId": 9,
  "stage": "FINAL",
  "routeVersionId": 120,
  "routeVersion": 3,
  "checklistStatus": "NOT_READY",
  "readyAt": null,
  "regulationChanged": false,
  "lastEvaluatedAt": "2026-10-16T03:00:00Z",
  "progress": {
    "total": 4, "approved": 2, "submitted": 1,
    "notSubmitted": 1, "rejected": 0, "expired": 0,
    "notApplicable": 0
  },
  "blockingReasons": [{ "checklistItemId": 1202, "code": "DOCUMENT_NOT_APPROVED", "message": "Document is pending review" }],
  "items": [
    {
      "checklistItemId": 1201,
      "requirementId": 501,
      "documentType": { "documentTypeId": 3, "code": "EQUINE_PASSPORT", "name": "Equine Passport", "group": "CUSTOMS" },
      "scope": "PER_HORSE",
      "responsibleParty": "CUSTOMER",
      "requiredAt": "REQUEST_SUBMISSION",
      "isMandatory": true,
      "horse": { "horseId": 31, "name": "Thunder Bolt", "microchipId": "985141000123456" },
      "checkpointPointId": null,
      "requiredBy": [{ "regulationId": 21, "regulationVersionId": 47, "country": "VN", "direction": "EXPORT" }],
      "status": "SUBMITTED",
      "isApplicable": true,
      "document": { "documentId": 470, "status": "SUBMITTED", "expiryDate": "2029-01-01" },
      "validUntilArrival": true,
      "openDocumentRequest": null
    }
  ],
  "allowedActions": ["REQUEST_DOCUMENTS", "REGENERATE_CHECKLIST"]
}
```

**`ChecklistItemStatus` tính toán:** `NOT_SUBMITTED` nếu thiếu bản ứng viên; `SUBMITTED` nếu bản ứng viên đang chờ Specialist; `REJECTED` nếu bản mới nhất bị từ chối và chưa có bản mới phù hợp; `APPROVED` nếu có bản duyệt còn hiệu lực và đúng requirement; `EXPIRED` nếu không đủ hiệu lực hoặc đã hết hạn. `isApplicable=false` thì **không đóng góp điều kiện readiness** (không cần thêm enum `NOT_APPLICABLE`).

### 4.4 `ClearanceResult` – kết quả cơ quan, không phải milestone

```json
{
  "clearanceResultId": 91,
  "tripId": 9,
  "checkpointPointId": 3,
  "result": "PASSED",
  "resultAt": "2026-11-20T05:00:00Z",
  "authorityNote": "Quy trình kiểm tra hoàn tất theo tài liệu nhận được",
  "attachments": [{ "fileId": 2000, "fileName": "evidence.pdf", "url": "/api/files/2000" }],
  "recordedBy": { "userId": 5, "role": "TRANSPORT_SPECIALIST" },
  "recordedAt": "2026-11-20T05:05:00Z",
  "incidentId": null
}
```

Dữ liệu `result` do Specialist **ghi nhận từ bằng chứng thực tế**; không biến Specialist thành cơ quan có thẩm quyền cấp giấy phép. Kết quả của nhiều loại thủ tục tại cùng một điểm có thể cần chứng từ riêng; checklist và catalog xác định thủ tục nào phải có, không suy diễn rằng một `PASSED` mặc định bao phủ tất cả.

---

### 4.5 `InsurancePolicy` – chứng từ bảo hiểm vận chuyển ngựa do COMPANY thu xếp

Hồ sơ này **khác** khoản phí bảo hiểm đã có trong Contract Flow 1. Không ghi `VERIFIED` theo việc Customer đã trả tiền; chỉ có chứng từ thực tế từ doanh nghiệp bảo hiểm mới được xem xét. Đây là thực thể nghiệp vụ gắn Trip, không phải tính năng mua bảo hiểm hoặc yêu cầu bồi thường.

```json
{
  "policyId": 8,
  "tripId": 9,
  "policyVersion": 2,
  "insurer": "Example equine insurer",
  "policyNumber": "DEMO-EQUINE-008",
  "insuredHorseIds": [31, 32],
  "coverageStartAt": "2026-11-20T00:00:00Z",
  "coverageEndAt": "2026-11-23T23:59:59Z",
  "includesPickupToHandover": true,
  "stableStopCovered": true,
  "policyFileId": 902,
  "verificationStatus": "PENDING",
  "verifiedBy": null,
  "verifiedAt": null,
  "submittedAt": "2026-11-10T10:00:00Z",
  "allowedActions": ["VIEW", "VERIFY"]
}
```

- Tên doanh nghiệp, số policy, ngựa và thời hạn chỉ là ví dụ; các cờ `includesPickupToHandover`, `stableStopCovered` phải **được đối chiếu điều khoản bảo hiểm thực tế**, không tự lấy giá trị `true` do FE gửi làm bằng chứng. Có thể bổ sung metadata giới hạn/trường hợp loại trừ khi chứng từ thực tế có.
- `InsuranceVerificationStatus` kế thừa `00-conventions.md`: `PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED`. Policy thay phiên bản phải lưu lịch sử và yêu cầu đánh giá lại; **không dùng** `DocumentStatus` để thay `InsuranceVerificationStatus`. Policy là đối tượng nghiệp vụ riêng, không tạo thêm giá trị `INSURANCE` trong `DocumentGroup` chỉ để lưu policy.
- Dữ liệu `premium`/chi phí mua thực tế (nếu lưu) thuộc phạm vi nội bộ, không mặc nhiên bằng hạng mục bảo hiểm trong Contract; không expose cho Customer hoặc Coordinator chỉ để hiển thị readiness.
- Quyền file private theo `GET /files/{fileId}`, kiểm tra quyền tài liệu/Trip; không cung cấp URL công khai.

---

## 5. Checklist trước Submit Request – API phụ thuộc Flow 1

### F02-C01. `GET /customer/requests/document-requirements`

**Role:** `CUSTOMER`; **query:** `originCountry`, `destinationCountry`, `horseIds` (CSV), `preferredTransportMode` (nếu có). **Không tạo Request/Trip.** Đây là **cùng endpoint** với `F01-C05E`, không có hai source logic khác nhau.

```http
GET /api/customer/requests/document-requirements?originCountry=VN&destinationCountry=JP&horseIds=31,32&preferredTransportMode=AIR
```

**200 data:**

```json
{
  "originCountry": "VN", "destinationCountry": "JP",
  "stage": "PRELIMINARY",
  "checklistVersion": "cfg-v1",
  "requirements": [
    {
      "requirementId": 501, "documentTypeId": 3,
      "documentTypeCode": "EQUINE_PASSPORT",
      "scope": "PER_HORSE", "horseId": 31,
      "responsibleParty": "CUSTOMER", "requiredAt": "REQUEST_SUBMISSION",
      "isMandatory": true, "isUploaded": true, "documentStatus": "SUBMITTED",
      "missing": false
    },
    {
      "requirementId": 730, "documentTypeId": 14,
      "documentTypeCode": "COMPANY_PROCEDURE_EXAMPLE",
      "scope": "PER_TRIP", "horseId": null,
      "responsibleParty": "COMPANY", "requiredAt": "BEFORE_DEPARTURE",
      "isMandatory": true, "isUploaded": false, "documentStatus": null,
      "missing": true
    }
  ],
  "missingCustomerDocuments": [],
  "companyActionsPending": 1
}
```

**Validation:** BE lấy `customerId` từ token, Horse phải thuộc Customer; unsupported pair → `400 UNSUPPORTED_ROUTE`; sai mode → `400 TRANSPORT_MODE_UNAVAILABLE`; Horse người khác → `404 NOT_FOUND`. `COMPANY_PROCEDURE_EXAMPLE` **chỉ minh họa schema**, không khẳng định tồn tại thủ tục pháp lý tên đó.

**Rule:** `missing=true` ở nhóm COMPANY không cản Submit. Khi `POST /customer/requests`, Backend **tự kiểm tra lại** requirements và `missingCustomerDocuments` ở đúng phiên bản config; FE không thể qua mặt bằng cách chỉ ẩn một checkbox.

### F02-C02. `GET /public/regulations/lookup`

**Public**, query `originCountry`, `destinationCountry`; nội dung tra cứu tổng quan theo quốc gia, không phải giấy phép/đảm bảo thông quan. Nội dung và response envelope theo `01-shared-api.md`, **sửa ví dụ VN→TH thành VN→JP**. Không bắt buộc Customer vào menu Regulation Lookup riêng; có thể nhúng vào wizard theo quyết định UI trước đây.

---

## 6. Specialist Dashboard, Trip Assignment và Overview

### F02-S01. `GET /specialist/dashboard`

**200:**

```json
{
  "success": true, "message": "OK",
  "data": {
    "counters": {
      "documentsPendingReview": 8,
      "checklistsNotReady": 5,
      "tripsDepartingIn7DaysNotReady": 2,
      "documentsExpiringBeforeArrival": 3,
      "clearancesPending": 1,
      "checklistsWithRegulationChange": 1,
      "openTasks": 12,
      "overdueTasks": 2
    },
    "urgentTrips": [{
      "tripId": 9, "tripCode": "TRP-20261120-0003",
      "originCountry": "VN", "destinationCountry": "JP",
      "plannedDepartureAt": "2026-11-20T01:00:00Z",
      "checklistProgress": { "approved": 7, "total": 10 },
      "missingItems": 2, "rejectedItems": 1
    }],
    "reviewQueuePreview": [{ "documentId": 470, "documentTypeName": "Equine Passport", "uploadedAt": "2026-11-14T03:00:00Z" }],
    "expiringDocuments": []
  }
}
```

Counters chỉ lấy dữ liệu Specialist có quyền xem; `tripsDepartingIn7DaysNotReady` là **tên cửa sổ lọc dashboard** (7 ngày minh họa cấu hình xem trước), **không phải** lead time, deadline pháp lý hoặc BR tự động hủy.

### F02-S02. `GET /specialist/trips`

**Query:** `assignedTo=me|all`, `tripStatus`, `checklistStatus`, `deploymentStatus`, `departureFrom`, `departureTo`, `originCountry`, `destinationCountry`, `q`, `page`, `pageSize`. `assignedTo=all` chỉ khi quyền/phạm vi cho phép; không trả mọi Trip cho mọi Specialist theo mặc định. Sort mặc định theo departure gần nhất.

**200 data:**

```json
{
  "items": [{
    "tripId": 9, "tripCode": "TRP-20261120-0003",
    "requestId": 15, "requestCode": "REQ-20261020-0001",
    "tripStatus": "PLANNING", "deploymentStatus": "CONFIRMED",
    "originCountry": "VN", "destinationCountry": "JP",
    "plannedDepartureAt": "2026-11-20T01:00:00Z",
    "expectedArrivalAt": "2026-11-21T09:00:00Z",
    "horseCount": 2,
    "routeVersionId": 120, "routeStatus": "PENDING_APPROVAL",
    "checklistStatus": "NOT_READY",
    "checklistProgress": { "total": 10, "approved": 7 },
    "regulationChanged": false,
    "assignedSpecialist": { "userId": 5, "fullName": "Tran B" },
    "allowedActions": ["VIEW", "REVIEW_DOCUMENTS"]
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

### F02-S03. `GET /specialist/trips/{tripId}`

**200 data:**

```json
{
  "tripId": 9, "tripCode": "TRP-20261120-0003",
  "tripStatus": "PLANNING", "deploymentStatus": "CONFIRMED",
  "request": { "requestId": 15, "requestCode": "REQ-20261020-0001", "specialRequirements": "Horse needs special feed" },
  "customer": { "customerId": 12, "fullName": "Nguyen Van A", "organizationName": "Saigon Racing Club" },
  "originCountry": "VN", "destinationCountry": "JP",
  "desiredDepartureDate": "2026-11-20", "deliveryDeadline": "2026-11-23",
  "route": {
    "routeVersionId": 120, "version": 3, "status": "PENDING_APPROVAL",
    "points": [
      { "pointId": 3, "type": "AIRPORT", "checkpointId": 11, "name": "Departure airport", "country": "VN", "plannedArrivalAt": "2026-11-20T03:00:00Z" },
      { "pointId": 4, "type": "AIRPORT", "checkpointId": 12, "name": "Arrival airport", "country": "JP", "plannedArrivalAt": "2026-11-21T07:00:00Z" }
    ]
  },
  "horses": [{ "horseId": 31, "name": "Thunder Bolt", "microchipId": "985141000123456", "ownerName": "Saigon Racing Club", "photoUrl": "/api/files/120" }],
  "checklistStatus": "NOT_READY",
  "checklistProgress": { "approved": 7, "total": 10 },
  "allowedActions": ["VIEW_CHECKLIST", "REQUEST_DOCUMENTS"]
}
```

`route` có thể `null` khi chưa gửi plan; FE vẫn được xem Trip và checklist `PRELIMINARY` (không hiển thị READY chính thức).

### F02-M01. `POST /manager/trips/{tripId}/specialist`

**Role:** `LOGISTICS_MANAGER`. Request:

```json
{ "specialistId": 5, "note": "Phụ trách checklist, hồ sơ và clearance" }
```

**200 data:**

```json
{
  "tripId": 9,
  "assignedSpecialist": { "userId": 5, "role": "TRANSPORT_SPECIALIST" },
  "assignedAt": "2026-11-10T04:00:00Z"
}
```

Manager phân công sau activation và theo điều kiện deployment ở Flow 1; BE ghi lịch sử đổi người, phát `AssignmentUpdated`. Đang xử lý hồ sơ thì thay người không làm mất lịch sử người đã duyệt.

---

## 7. Checklist Generation, Review và Regeneration

### 7.1 Trigger hệ thống – **không có REST `POST create-checklist`**

1. **Trước Request/Trip:** API `document-requirements` đọc catalog để Customer biết và nộp đủ phần của mình; không lưu Trip checklist.
2. **Sau Flow 1 handoff:** có `Trip PLANNING + deployment CONFIRMED`; hệ thống đồng bộ checklist `PRELIMINARY` từ Request/Horse, rule catalog và kế hoạch sơ bộ, không yêu cầu route đã submit để bắt đầu chuẩn bị.
3. **Khi Coordinator submit Route Version:** BE tính requirements theo điểm kiểm soát và ETA cụ thể → checklist `FINAL` gắn với `routeVersionId`; lưu snapshot và các thay đổi so với sơ bộ.
4. **Route được trả lại/chỉnh/version mới, thời gian, ngựa hoặc regulation thay đổi:** đánh dấu các mục ảnh hưởng; auto re-evaluate hoặc Specialist kích hoạt regenerate; không tạo cùng một bộ checklist trùng lặp khi retry.
5. **Document APPROVED/REJECTED/REPLACED/EXPIRED:** BE tính lại các item liên kết và `ChecklistStatus`, notify các actor có quyền.

`FINAL` không có nghĩa route đã `APPROVED`; trạng thái `READY` cuối cùng để đánh giá khởi hành chỉ được sử dụng với route version hiện hành đã qua đủ điều kiện Flow 3. Nếu route đang `RETURNED` hoặc đổi version, BE không được dựa trên READY của bản route cũ để cho xuất phát.

### F02-S04. `GET /specialist/trips/{tripId}/checklist`

**Query:** `groupBy=horse|checkpoint|group`, `status`, `includeNotApplicable=false`, `stage=PRELIMINARY|FINAL` (nếu muốn xem lịch sử). Trả Checklist theo mục 4.3. Nếu chưa có quyền/trip → `404`; Trip hợp lệ nhưng chưa sinh checklist → `data:null` và FE có thể chờ điều kiện handoff.

**Rule:** `status=APPROVED` của một item chỉ khi document valid đối với requirement/timeline áp dụng; expired + pending regulation change có thể làm `checklistStatus=NOT_READY` dù trước đó READY.

### F02-S05. `POST /specialist/trips/{tripId}/checklist/regenerate`

**Role:** Specialist có phân công. **Body:**

```json
{ "expectedRouteVersionId": 120, "reason": "Re-evaluate after updated document requirement" }
```

`expectedRouteVersionId` cho `FINAL`, `null` khi `PRELIMINARY`. Backend kiểm tra request không dùng version route đã thay thế; có thể bỏ `reason` nếu regenerate tự động do config.

**200 data:**

```json
{
  "tripId": 9,
  "stage": "FINAL",
  "routeVersionId": 120,
  "added": 2,
  "retainedApproved": 6,
  "markedNotApplicable": 1,
  "checklistStatus": "NOT_READY",
  "regulationChanged": false,
  "evaluatedAt": "2026-11-14T03:00:00Z"
}
```

Không xóa audit hoặc tạo document trùng. Lỗi `409 ROUTE_VERSION_CONFLICT`, `409 INVALID_STATE`. Nếu không có thay đổi, lệnh idempotent về kết quả.

### F02-S06. `POST /specialist/trips/{tripId}/checklist/acknowledge-change`

```json
{ "note": "Đã đối chiếu phiên bản quy định mới, không ảnh hưởng chuyến hiện hành" }
```

**200 data:** `{"tripId":9,"regulationChanged":false,"acknowledgedAt":"2026-11-14T03:30:00Z"}`.

Chỉ cho acknowledge khi BE xác nhận thay đổi **không làm phát sinh requirement cần tái đánh giá**; nếu có mục mới/biến động điều kiện, bắt buộc regenerate/đối chiếu. Acknowledge không được dùng để bỏ qua giấy tờ bắt buộc.

### F02-S07. `GET /specialist/documents/review-queue`

**Query:** `status=SUBMITTED`, `tripId`, `documentTypeId`, `group`, `departureBefore`, `assignedTo=me|all` (theo quyền), `page`, `pageSize`. Sắp xếp Trip gần xuất phát rồi thời điểm nộp.

**200 data:**

```json
{
  "items": [{
    "documentId": 470, "status": "SUBMITTED",
    "documentType": { "documentTypeId": 3, "name": "Equine Passport", "group": "CUSTOMS" },
    "horse": { "horseId": 31, "name": "Thunder Bolt", "microchipId": "985141000123456" },
    "uploadedBy": { "userId": 12, "role": "CUSTOMER" },
    "trips": [{ "tripId": 9, "tripCode": "TRP-20261120-0003", "checklistItemId": 1201 }],
    "uploadedAt": "2026-11-14T02:00:00Z",
    "isResubmission": false
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

### F02-S08. `GET /specialist/documents/{documentId}`

**200 data:** Document schema mục 4.2 + `linkedChecklistItems`, `previousVersions`, `reviewHistory`, `validityEvaluations`, `allowedActions`. Mỗi attachment tải qua `GET /files/{fileId}`. Document có thể được nộp trước khi Trip tồn tại; Specialist được cấp nhiệm vụ xem và duyệt theo quyền nghiệp vụ, không được tự truy cập toàn bộ dữ liệu Horse của người khác ngoài phạm vi.

### F02-S09. `POST /specialist/documents/{documentId}/approve`

**Body:**

```json
{ "note": "Đã đối chiếu hồ sơ nguồn và thời hạn theo checklist", "expectedStatus": "SUBMITTED" }
```

**200:**

```json
{
  "success": true,
  "message": "Document approved",
  "data": {
    "documentId": 470,
    "status": "APPROVED",
    "reviewedBy": { "userId": 5, "role": "TRANSPORT_SPECIALIST" },
    "reviewedAt": "2026-11-14T04:00:00Z",
    "affectedTrips": [{ "tripId": 9, "checklistStatus": "NOT_READY", "becameReady": false }]
  }
}
```

**Guard:** Document hiện hành `SUBMITTED`, đúng quy định, tệp truy cập được, thông tin số/ngày/cơ quan cấp phù hợp loại tài liệu, không có version mới hơn chờ review, giấy tờ đủ hiệu lực theo yêu cầu của Trip bị ảnh hưởng. Nếu không đủ điều kiện `409 DOCUMENT_NOT_VALID_UNTIL_ARRIVAL` hoặc `409 DOCUMENT_INVALID_FOR_REQUIREMENT`; `409 INVALID_STATE` nếu đã duyệt/từ chối. Nếu một Document dùng cho nhiều Trip có yêu cầu khác nhau, trạng thái review toàn cục không tự vượt quá điều kiện từng Trip: mỗi checklist phải tự đánh giá validity.

### F02-S10. `POST /specialist/documents/{documentId}/reject`

**Body:**

```json
{ "reason": "Bản scan không đọc được thông tin", "expectedStatus": "SUBMITTED" }
```

**200 data:** `{"documentId":470,"status":"REJECTED","rejectReason":"Bản scan không đọc được thông tin","reviewedAt":"2026-11-14T04:20:00Z","affectedTripIds":[9]}`.

Thiếu `reason` → `400 VALIDATION_ERROR`. Backend notify Customer, cập nhật action-required và checklist; không xóa bản đã từ chối.

### F02-S11. `GET /specialist/documents/expiring`

**Query:** `withinDays` (lọc để hiển thị, ví dụ 30), `tripId`, `page`, `pageSize`.

**200 data:**

```json
{
  "items": [{
    "documentId": 460, "horseId": 31,
    "documentTypeName": "Medical certificate",
    "expiryDate": "2026-11-20",
    "tripId": 9, "tripCode": "TRP-20261120-0003",
    "expectedArrivalAt": "2026-11-21T09:00:00Z",
    "expiresBeforeArrival": true
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

Job định kỳ và mỗi lần kiểm tra readiness phải phát hiện expiration; không chỉ đợi job mới chuyển checklist về NOT_READY.

---

## 8. Customer Document Management – Dùng chung Horse/Request

### F02-C03. `GET /customer/horses/{horseId}/documents`

**Role:** Customer sở hữu Horse. **Query:** `includeHistory`, `group`, `status`. Trả danh sách document version thuộc Horse, bao gồm scan passport đã nộp trong Flow 1. Không cần API upload scan passport lần nữa nếu Horse creation đã lưu.

**200 data:**

```json
{
  "items": [{
    "documentId": 470, "documentType": { "documentTypeId": 3, "name": "Equine Passport", "group": "CUSTOMS" },
    "horseId": 31, "status": "SUBMITTED", "documentNumber": "EQ-VN-00123",
    "files": [{ "fileId": 950, "fileName": "passport.pdf", "url": "/api/files/950" }],
    "rejectReason": null, "allowedActions": ["VIEW"]
  }]
}
```

### F02-C04. `POST /customer/horses/{horseId}/documents`

**Content-Type:** multipart. Field `payload` JSON string:

```json
{
  "documentTypeId": 8,
  "documentNumber": "VAC-001",
  "issuingAuthority": "Authority shown on the document",
  "issueDate": "2026-08-01",
  "expiryDate": "2027-02-01"
}
```

Files parts `files` (1–10 tệp, MIME PDF/JPEG/PNG, tối đa 10 MB/tệp, giới hạn có thể cấu hình). `documentTypeId` phải có `scope=PER_HORSE`, Customer phải sở hữu Horse. Bản nộp `SUBMITTED`, không auto `APPROVED`.

**201 data:** `{"documentId":471,"horseId":31,"status":"SUBMITTED","documentTypeId":8,"fileIds":[951],"uploadedAt":"2026-11-14T02:00:00Z"}`.

**Errors:** `400 VALIDATION_ERROR`, `400 FILE_TOO_LARGE`, `400 FILE_TYPE_NOT_ALLOWED`, `404 NOT_FOUND`, `409 DOCUMENT_CONFLICT`.

### F02-C05. `GET /customer/documents/{documentId}`

Trả chi tiết Document, `reviewHistory`, `previousVersions`, `allowedActions`; không expose tài liệu của Customer khác. Tải file riêng qua Shared API.

### F02-C06. `POST /customer/documents/{documentId}/replace`

Multipart `payload` JSON (metadata mới) + `files[]`, bắt buộc tham chiếu phiên bản Document cũ. Khi thành công tạo `documentId` mới, đặt `replacedDocumentId` và bảo toàn history/audit; document mới `SUBMITTED`.

**201 data:**

```json
{
  "documentId": 472,
  "replacedDocumentId": 470,
  "status": "SUBMITTED",
  "linkedChecklistItemIds": [1201],
  "updatedAt": "2026-11-14T05:00:00Z"
}
```

Bản cũ có thể được đánh dấu `SUPERSEDED` khi thay thế hợp lệ; BE không xóa các file/version cũ. Nếu tài liệu đang dùng làm bằng chứng lịch sử của clearance thì vẫn lưu bản gốc trong lịch sử pháp lý. `409 DOCUMENT_NOT_REPLACEABLE` nếu điều kiện không cho phép.

### F02-C07. `GET /customer/documents/action-required`

**Query:** `requestId`, `tripId`, `reason`, `page`, `pageSize`. `reason` ví dụ `MISSING`, `REJECTED`, `EXPIRING`, `REQUESTED_BY_SPECIALIST`; là **lý do action**, không phải enum `DocumentStatus` mới.

**200 data:**

```json
{
  "items": [{
    "reason": "REQUESTED_BY_SPECIALIST",
    "requestId": 15,
    "tripId": 9,
    "horseId": 31,
    "checklistItemId": 1201,
    "documentTypeId": 8,
    "documentId": null,
    "message": "Vui lòng bổ sung chứng từ y tế theo checklist đã được cập nhật",
    "dueAt": null,
    "responsibleParty": "CUSTOMER",
    "allowedActions": ["UPLOAD_DOCUMENT"]
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

### F02-C08. `GET /customer/requests/{requestId}/checklist`

**200 data:** checklist đã lọc theo quyền Customer:

```json
{
  "requestId": 15,
  "tripId": 9,
  "stage": "FINAL",
  "checklistStatus": "NOT_READY",
  "progress": { "approved": 7, "total": 10 },
  "items": [{
    "checklistItemId": 1201, "horseId": 31,
    "documentTypeCode": "EQUINE_PASSPORT",
    "responsibleParty": "CUSTOMER",
    "requiredAt": "REQUEST_SUBMISSION",
    "status": "SUBMITTED",
    "rejectReason": null,
    "allowedActions": ["VIEW_DOCUMENT"]
  }]
}
```

Nếu Request đã tạo nhưng Trip chưa có, có thể trả checklist `PRELIMINARY` (nếu tồn tại) hoặc `data:null` theo thiết kế Flow 1. Không trả đầy đủ giấy tờ nội bộ hoặc thông tin nhạy cảm của nhân sự công ty.

### F02-C09. `GET /files/{fileId}` / `GET /files/{fileId}?download=true`

Shared API; binary file download với Bearer token + ownership/assignment check. Không bọc envelope và không expose public URL. FE hiển thị bằng Blob/object URL có xác thực; không nhúng token vào query để render file.

### F02-C10–C12. Customer `PER_TRIP` – **KHÔNG TRIỂN KHAI TRONG DEMO HIỆN TẠI**

**Quy tắc chốt:** Customer chỉ nộp hồ sơ bắt buộc theo từng Horse (`PER_HORSE`) trước khi Submit/Revision. Không dùng `POST /customer/requests` multipart để upload hồ sơ chung `PER_TRIP`; không bắt giấy ủy quyền trong Wizard demo. Những chứng từ hành chính/quarantine/customs theo từng chuyến được COMPANY/Transport Specialist chuẩn bị tại Flow 2. Không có bước Customer PER_TRIP mặc định phát sinh từ Requirement Catalog cho phạm vi sản phẩm đã chốt.

Các endpoint sau là **deferred/legacy, không thuộc danh mục API hoạt động của demo**:

```http
GET  /customer/requests/{requestId}/documents
POST /customer/requests/{requestId}/documents
```

Giữ mã `F02-C10`, `F02-C11`, `F02-C12` làm tham chiếu lịch sử, **không** coi chúng là endpoint cần implement. Nếu tương lai Customer phải cung cấp giấy tờ chung theo yêu cầu pháp luật cụ thể thì thực hiện scope change qua SRS/Regulation Catalog và API Contract riêng; bản demo hiện tại không được ngầm tái kích hoạt những API này. Khi Specialist cần thêm thông tin, dùng info/document-request phù hợp cho Horse; COMPANY tự xử lý chứng từ chung.

---

## 9. Specialist upload COMPANY documents và yêu cầu bổ sung

### F02-S12. `POST /specialist/trips/{tripId}/checklist/items/{checklistItemId}/documents`

**Role:** Specialist được phân công, Trip có deployment cho phép triển khai. Dùng cho **tài liệu thuộc trách nhiệm COMPANY**, có thể là `PER_TRIP` hoặc `PER_HORSE` tùy requirement đã cấu hình; không ép mọi giấy tờ COMPANY phải PER_TRIP.

**Multipart `payload`:**

```json
{
  "documentTypeId": 14,
  "documentNumber": "DOC-2026-002",
  "issuingAuthority": "Authority named on supplied document",
  "issueDate": "2026-11-17",
  "expiryDate": "2026-12-17",
  "horseId": null,
  "note": "Giấy tờ được công ty phối hợp xin/cấp bởi cơ quan có thẩm quyền"
}
```

Files `files[]` theo conventions. `horseId` phải khớp checklist item PER_HORSE nếu áp dụng. `checklistItemId` phải thuộc Trip, `responsibleParty=COMPANY`, đúng loại/scope. Ghi `uploadedBy=TRANSPORT_SPECIALIST` và nguồn giấy tờ, trạng thái `SUBMITTED`, chờ review (không auto APPROVED).

**201 data:**

```json
{
  "documentId": 480, "tripId": 9,
  "checklistItemId": 1210,
  "status": "SUBMITTED",
  "uploadedByRole": "TRANSPORT_SPECIALIST"
}
```

Không sử dụng endpoint để giả lập cấp giấy tờ hoặc hoàn tất kiểm dịch khi chưa có chứng từ/bằng chứng thật. BE kiểm tra file, metadata và không tạo bản ghi document dở khi upload lỗi.

### F02-S13. `POST /specialist/trips/{tripId}/document-requests`

**Role:** Specialist. Chỉ yêu cầu Customer bổ sung mục `CUSTOMER` mà họ có trách nhiệm cung cấp; không đẩy giấy tờ do `COMPANY` phải xin cho Customer. **Body:**

```json
{
  "items": [
    { "checklistItemId": 1201, "message": "Cần scan rõ phần số hộ chiếu" },
    { "checklistItemId": 1202, "message": "Bổ sung thông tin y tế theo loại hồ sơ được yêu cầu" }
  ],
  "dueDate": null
}
```

`dueDate` là hạn xử lý do Specialist nhập khi có căn cứ phù hợp, không mặc định số ngày. **201 data:**

```json
{
  "documentRequestId": 33,
  "tripId": 9,
  "status": "OPEN",
  "requestedItems": [1201, 1202],
  "notifiedCustomers": [12],
  "createdAt": "2026-11-14T06:00:00Z"
}
```

`409 DOCUMENT_REQUEST_ALREADY_OPEN` nếu tạo yêu cầu trùng cùng item chưa đóng mà không thay đổi nội dung; các lần yêu cầu phải lưu audit. Không coi tạo `document-request` là thay đổi `RequestStatus`.

### F02-S14. `GET /specialist/trips/{tripId}/document-requests`

**200 data:**

```json
{
  "items": [{
    "documentRequestId": 33,
    "status": "OPEN",
    "dueDate": null,
    "items": [{ "checklistItemId": 1201, "message": "Cần scan rõ phần số hộ chiếu", "documentId": null }],
    "createdBy": { "userId": 5, "role": "TRANSPORT_SPECIALIST" },
    "createdAt": "2026-11-14T06:00:00Z"
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

Khi Customer nộp bản phù hợp, status yêu cầu có thể chuyển `FULFILLED` theo logic BE; **không tự coi hồ sơ đã `APPROVED`**. Nếu bị từ chối, Specialist tiếp tục yêu cầu bổ sung qua luồng review/request.

---

### 9.1. Insurance – công ty thu xếp ngoài hệ thống, Specialist quản lý chứng từ

Theo quyết định nghiệp vụ mới: CBN Transport thu xếp bảo hiểm vận chuyển ngựa từ doanh nghiệp bảo hiểm **ngoài hệ thống**, sau khi Trip được kích hoạt và trước khi bắt đầu chặng được bảo hiểm. Specialist nhập chứng từ thực tế. Không triển khai mua bảo hiểm bằng VNPay, không có endpoint claim/bồi thường, không để Coordinator upload hoặc verify policy.

### F02-S34. `GET /specialist/trips/{tripId}/insurance` **[BỔ SUNG]**

**Role:** `TRANSPORT_SPECIALIST`; Trip thuộc phạm vi được phép xử lý. **200:** `data:null` nếu chưa có policy. Khi có, `data` là Policy object mục 4.5 kèm `history` phiên bản trước và `coverageEvaluation` tính từ dữ liệu hiện hành; `allowedActions` theo quyền/trạng thái.

**Response 200 (ví dụ):**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "policyId": 8,
    "tripId": 9,
    "policyVersion": 2,
    "insurer": "Example equine insurer",
    "policyNumber": "DEMO-EQUINE-008",
    "insuredHorseIds": [31, 32],
    "coverageStartAt": "2026-11-20T00:00:00Z",
    "coverageEndAt": "2026-11-23T23:59:59Z",
    "includesPickupToHandover": true,
    "stableStopCovered": true,
    "policyFileId": 902,
    "verificationStatus": "PENDING",
    "coverageEvaluation": {"adequate": false, "missingConditions": ["POLICY_NOT_VERIFIED"]},
    "history": [],
    "allowedActions": ["VIEW", "VERIFY"]
  }
}
```

### F02-S35. `POST /specialist/trips/{tripId}/insurance` **[BỔ SUNG]**

**Purpose:** ghi nhận policy bảo hiểm ngựa do công ty đã mua/thu xếp và do insurer phát hành. `multipart/form-data` với phần `payload` JSON và phần `files` chứa ít nhất chứng từ bảo hiểm theo `00-conventions.md`. **Không phải API mua bảo hiểm.**

**`payload` (JSON string trong multipart):**

```json
{
  "insurer": "Example equine insurer",
  "policyNumber": "DEMO-EQUINE-008",
  "insuredHorseIds": [31, 32],
  "coverageStartAt": "2026-11-20T00:00:00Z",
  "coverageEndAt": "2026-11-23T23:59:59Z",
  "includesPickupToHandover": true,
  "stableStopCovered": true
}
```

**201 Created:**

```json
{
  "success": true,
  "message": "Insurance policy recorded",
  "data": {"policyId": 8, "tripId": 9, "policyVersion": 2, "verificationStatus": "PENDING", "policyFileId": 902, "submittedAt": "2026-11-10T10:00:00Z"}
}
```

**Guards:** Trip tồn tại/đã deployment, Specialist đủ quyền, ngựa là ngựa trong Trip, thời điểm hợp lệ và có chứng từ insurer; kiểm tra MIME/file theo convention. BE tính phạm vi thực tế ở bước verify, không chỉ tin checkbox. Upload bản mới của policy tạo `policyVersion` mới, giữ bản cũ và audit, **rút hiệu lực Documents confirmation nếu dữ liệu bảo hiểm bị ảnh hưởng**. File có lỗi không tạo policy dang dở.

**Errors:** `400 VALIDATION_ERROR`, `400 FILE_TOO_LARGE`, `400 FILE_TYPE_NOT_ALLOWED`, `403 NOT_ASSIGNED`, `404 NOT_FOUND`, `409 INVALID_STATE`.

### F02-S36. `POST /specialist/trips/{tripId}/insurance/{policyId}/verify` **[BỔ SUNG]**

**Role:** `TRANSPORT_SPECIALIST` đủ quyền; kiểm tra *policy hiện hành*, không được xác minh bản cũ đã bị thay.

**Body:**

```json
{
  "expectedPolicyVersion": 2,
  "decision": "VERIFIED",
  "note": "Đã đối chiếu chứng từ với 2 ngựa, tuyến VN–JP và thời hạn vận chuyển"
}
```

`decision` chỉ được `VERIFIED` hoặc `REJECTED`; khi `REJECTED`, `note` bắt buộc. `VERIFIED` chỉ thành công khi policy thật có file/bằng chứng phù hợp, bao phủ ngựa trong Trip, các chặng/điểm dừng áp dụng và thời gian cần bảo hiểm. Không suy luận mọi rủi ro hay phát sinh đều được bảo hiểm.

**200 OK:**

```json
{
  "success": true,
  "message": "Insurance policy reviewed",
  "data": {"policyId": 8, "tripId": 9, "policyVersion": 2, "verificationStatus": "VERIFIED", "verifiedBy": 18, "verifiedAt": "2026-11-11T09:00:00Z", "documentsReadinessReevaluationRequested": true}
}
```

**Errors:** `400 VALIDATION_ERROR`, `403 NOT_ASSIGNED`, `404 NOT_FOUND`, `409 INSURANCE_COVERAGE_INSUFFICIENT`, `409 INSURANCE_POLICY_VERSION_CONFLICT`, `409 INVALID_STATE`. Ghi audit `INSURANCE_POLICY_VERIFIED` / `INSURANCE_POLICY_REJECTED` và notification sau commit.

---

## 10. Quản lý Regulation Catalog – Specialist (UC-TS-01)

**Lưu ý nghiệp vụ:** Catalog lưu những quy định đã được công ty kiểm chứng. Thông tin mẫu không phải tư vấn pháp lý hay khẳng định áp dụng cho VN→JP. Đội nghiệp vụ chịu trách nhiệm kiểm tra văn bản hiện hành của Việt Nam, Nhật Bản và hãng vận chuyển trước khi công bố. Mọi regulation có nguồn, ngày có hiệu lực, version và `updatedBy` để đối chiếu.

### 10.1 `Regulation` object

```json
{
  "regulationId": 21,
  "version": 2,
  "scopeLevel": "COUNTRY",
  "country": "VN",
  "direction": "EXPORT",
  "checkpointId": null,
  "documentTypeId": 8,
  "appliesTo": "PER_HORSE",
  "responsibleParty": "COMPANY",
  "requiredAt": "BEFORE_DEPARTURE",
  "issuingAuthority": "Official authority identified from source",
  "minValidityDays": null,
  "sourceReference": "Verified legal or authority reference",
  "notes": "Requirement entry maintained by Specialist",
  "effectiveFrom": "2026-01-01",
  "effectiveTo": null,
  "status": "ACTIVE",
  "createdBy": 5,
  "updatedBy": 5,
  "updatedAt": "2026-11-12T04:00:00Z"
}
```

`scopeLevel=COUNTRY`: bắt buộc `country` và `direction`; `checkpointId=null`. `scopeLevel=CHECKPOINT`: bắt buộc `checkpointId`, `direction` chỉ khi catalog yêu cầu. Với demo VN→VN thường dùng `DOMESTIC` nếu có requirement theo luật; VN→JP đánh giá `EXPORT` của VN và `IMPORT` của JP, cộng điều kiện checkpoint/sân bay đã xác nhận. Không tự thêm `TRANSIT` đối với chuyến bay thẳng.

### F02-S15. `GET /specialist/regulations`

**Query:** `country`, `direction`, `checkpointId`, `documentTypeId`, `group`, `status`, `effectiveOn`, `page`, `pageSize`.

**200 data:** paginated `Regulation[]` theo hợp đồng chung. Có thể filter `effectiveOn` để phục vụ checklist tại một ngày cụ thể.

### F02-S16. `GET /specialist/regulations/{regulationId}`

**200 data:** Regulation object + `sourceReference`, `historySummary`, `affectedChecklistCount`, `allowedActions`. `404` nếu ID không tồn tại.

### F02-S17. `POST /specialist/regulations`

**Request:**

```json
{
  "scopeLevel": "COUNTRY",
  "country": "JP",
  "direction": "IMPORT",
  "checkpointId": null,
  "documentTypeId": 8,
  "appliesTo": "PER_HORSE",
  "responsibleParty": "COMPANY",
  "requiredAt": "BEFORE_DEPARTURE",
  "issuingAuthority": "Competent issuing authority per verified source",
  "minValidityDays": null,
  "sourceReference": "Reference to reviewed requirement",
  "notes": "Verified by specialist prior to publication",
  "effectiveFrom": "2026-11-01"
}
```

**201 data:** `{"regulationId":21,"version":1,"status":"ACTIVE","affectedChecklists":0}`. BE validate effective dates, scope, country supported by catalog, documentType exists, source fields as appropriate. `409 REGULATION_DUPLICATE` nếu có regulation trùng phạm vi/loại/hiệu lực không hợp lệ. Không cấp giấy tờ bằng cách tạo regulation.

### F02-S18. `PUT /specialist/regulations/{regulationId}`

**Request:** các field editable của F02-S17 và `expectedVersion`. **200 data:**

```json
{
  "regulationId": 21,
  "version": 3,
  "status": "ACTIVE",
  "affectedChecklists": 2,
  "updatedAt": "2026-11-13T04:00:00Z"
}
```

**Side effects:** Version mới bất biến, đánh dấu checklist đang sử dụng version cũ, gửi `DocumentUpdated`, Specialist re-evaluate; không sửa ngầm nhật ký chuyến đã hoàn thành. `409 REGULATION_VERSION_CONFLICT`/`REGULATION_DUPLICATE`.

### F02-S19. `POST /specialist/regulations/{regulationId}/discontinue`

**Body:**

```json
{ "effectiveTo": "2026-12-31", "reason": "Quy định được thay thế theo nguồn xác minh" }
```

**200 data:** `{"regulationId":21,"status":"DISCONTINUED","effectiveTo":"2026-12-31","affectedChecklists":2}` nếu ngày đã đến; nếu `effectiveTo` tương lai, status phải phản ánh việc quy định còn hiệu lực tới ngày đó, không hiển thị đã mất hiệu lực sớm. Không hard delete.

### F02-S20. `GET /specialist/regulations/{regulationId}/history`

Trả version/snapshot, người cập nhật, thời điểm, nguồn thay đổi; **không** ghi đè bản cũ. Ví dụ `data.items:[{"version":1,"effectiveFrom":"2026-01-01","changedAt":"2026-10-01T02:00:00Z"}]`.

### F02-S21. `GET /specialist/regulations/{regulationId}/affected-checklists`

**200 data:**

```json
{
  "items": [
    { "tripId": 9, "tripCode": "TRP-20261120-0003", "routeVersionId": 120,
      "checklistStatus": "NOT_READY", "regulationChanged": true }
  ],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

---

## 11. Document Type Master và Checkpoint Catalog

### F02-S22. `GET /specialist/document-types`

**Query:** `group=MEDICAL|QUARANTINE|CUSTOMS`, `isActive`, `page`, `pageSize` (nếu cần). Trả catalog loại giấy tờ; đây là dữ liệu nghiệp vụ, không phải các document đã nộp. `GET /master/document-types` trong Shared là endpoint đọc danh mục cho dropdown có phân quyền phù hợp.

### F02-S23. `POST /specialist/document-types`

```json
{
  "code": "MEDICAL_DOCUMENT_EXAMPLE",
  "name": "Tên giấy tờ theo catalog đã kiểm chứng",
  "group": "MEDICAL",
  "defaultScope": "PER_HORSE",
  "description": "Mô tả từ bộ quy định đã kiểm tra"
}
```

**201 data:** `{"documentTypeId":8,"code":"MEDICAL_DOCUMENT_EXAMPLE","isActive":true}`. `409 DOCUMENT_TYPE_NAME_DUPLICATE` hoặc `DOCUMENT_TYPE_CODE_DUPLICATE`.

### F02-S24. `PUT /specialist/document-types/{documentTypeId}`

**Body:** `name`, `group`, `defaultScope`, `description`, `isActive` và `expectedVersion` nếu dùng versioning master. **200 data:** document type mới nhất. Không cho sửa code làm sai hồ sơ hiện hữu; deactivation không xóa lịch sử.

### F02-S25. `GET /specialist/checkpoints`

**Query:** `country`, `type`, `isActive`, `page`, `pageSize`. Chỉ trả checkpoint từ catalog; không tạo các nước không thuộc tuyến demo vào route khả dụng của Customer.

**200 data:**

```json
{
  "items": [{
    "checkpointId": 11, "name": "Vietnam departure airport",
    "type": "AIRPORT", "country": "VN",
    "lat": null, "lng": null,
    "operatingHours": null, "isActive": true
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

### F02-S26. `POST /specialist/checkpoints`

```json
{
  "name": "Configured airport or inspection point",
  "type": "AIRPORT",
  "country": "JP",
  "lat": null,
  "lng": null,
  "pairedCheckpointId": null,
  "operatingHours": null,
  "notes": "Chỉ thêm sau khi kiểm tra điểm thực tế"
}
```

**201 data:** `{"checkpointId":12,"isActive":true}`. Checkpoint được xác định theo thực tế vận hành; không suy ra route cần có cặp **land border** nếu tuyến là AIR.

### F02-S27. `PUT /specialist/checkpoints/{checkpointId}`

**Body:** như F02-S26 + `isActive`, metadata version. **200 data:** checkpoint được cập nhật. Thay đổi checkpoint liên quan route đang hoạt động phải đánh dấu route/checklist để đánh giá, không tự sửa kết quả clearance lịch sử.

### F02-F01. `GET /coordinator/checkpoints`

**Role:** `FLEET_COORDINATOR`. **Query:** `country`, `type`, `q`, `isActive=true`; trả danh mục checkpoint đọc-only cùng ID như Specialist Catalog. Coordinator dùng ID này khi `POST /coordinator/trips/{tripId}/routes` hoặc submit Route Version. Phần viết route nằm trong Flow 3, không duplicate payload ở Flow 2.

---

## 12. Clearance / Quarantine theo checkpoint – trong lúc vận chuyển

### 12.1 Nguyên tắc phân biệt ba lớp dữ liệu

1. `Milestone` của Driver/Escort: `ARRIVED_CHECKPOINT`, `PASSED_CHECKPOINT` là ghi nhận thao tác thủ công của hiện trường.
2. `ClearanceResult` của Specialist: `PASSED`, `HELD`, `FAILED` là kết quả pháp lý/kiểm dịch có căn cứ và attachment, không đồng nhất với milestone.
3. `Incident`: nghiệp vụ xử lý khẩn cấp khi bị giữ/chậm thông quan; tùy quy tắc Flow 5 và không biến milestone thành chứng nhận pháp lý.

Trip có thể đang `IN_TRANSIT` và chưa có clearance result ở checkpoint. Nếu pháp luật/điều kiện vận hành yêu cầu clearance thành công trước khi cho qua điểm kiểm soát, phần tác nghiệp phải chặn thao tác xác nhận hoàn thành tương ứng; quy tắc thực tế được kiểm tra theo checklist, không mặc định mọi điểm dừng đều là customs.

### F02-S28. `GET /specialist/clearances`

**Query:** `result=NONE|HELD|FAILED|PASSED`, `tripId`, `needsAttention`, `page`, `pageSize`. Trả checkpoint pháp lý thuộc Trip trong phạm vi quyền theo dõi. Trạng thái chuyến có thể dùng filter `tripStatus=IN_TRANSIT`, không giả định danh sách chỉ luôn chứa IN_TRANSIT nếu cần audit.

**200 data:**

```json
{
  "items": [{
    "tripId": 9, "tripCode": "TRP-20261120-0003",
    "checkpointPointId": 3, "checkpointId": 11,
    "checkpointName": "Vietnam departure airport",
    "country": "VN", "type": "AIRPORT",
    "plannedArrivalAt": "2026-11-20T03:00:00Z",
    "fieldStatus": "ARRIVED_REPORTED_BY_DRIVER",
    "fieldReportedAt": "2026-11-20T03:05:00Z",
    "latestResult": null,
    "needsAttention": true
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

`fieldStatus` là presentation field tổng hợp từ manual milestone, không tạo enum global mới và không coi `PASSED_REPORTED_BY_DRIVER` là `ClearanceResult.PASSED`.

### F02-S29. `GET /specialist/trips/{tripId}/checkpoints`

**200 data:**

```json
[
  {
    "checkpointPointId": 3,
    "checkpointId": 11,
    "name": "Vietnam departure airport",
    "country": "VN", "type": "AIRPORT",
    "plannedArrivalAt": "2026-11-20T03:00:00Z",
    "fieldStatus": "ARRIVED_REPORTED_BY_DRIVER",
    "results": [
      {
        "clearanceResultId": 90, "result": "HELD",
        "resultAt": "2026-11-20T04:00:00Z",
        "authorityNote": "Cần bổ sung bằng chứng",
        "attachmentFileIds": [2000],
        "recordedAt": "2026-11-20T04:10:00Z",
        "incidentId": 41
      }
    ],
    "finalResult": "HELD"
  }
]
```

Đây là `data` bên trong envelope; `results[]` giữ tất cả lần ghi, mới nhất phù hợp quyết định kết quả hiện hành. Cần phân biệt field `finalResult` nghĩa là “latest recorded outcome” và trường hợp nghiệp vụ còn phải xử lý; FE không suy diễn pháp lý từ chữ "final".

### F02-S30. `POST /specialist/trips/{tripId}/checkpoints/{checkpointPointId}/clearance-results`

**Role:** Specialist có quyền/được phân công; Trip phải ở trạng thái được phép ghi nhận clearance thực tế (thông thường `IN_TRANSIT`), checkpointPoint thuộc version tuyến đang được vận hành. **Content-Type:** `multipart/form-data` (`payload` JSON + `files[]` bằng chứng); cho phép JSON nếu không có file và nghiệp vụ/cơ quan không yêu cầu attachment.

**Payload:**

```json
{
  "result": "HELD",
  "resultAt": "2026-11-20T04:00:00Z",
  "authorityNote": "Cơ quan kiểm tra yêu cầu bổ sung chứng từ",
  "externalReference": "Reference on official notification"
}
```

**201:**

```json
{
  "success": true,
  "message": "Clearance result recorded",
  "data": {
    "clearanceResultId": 90,
    "tripId": 9,
    "checkpointPointId": 3,
    "result": "HELD",
    "recordedAt": "2026-11-20T04:10:00Z",
    "incident": { "incidentId": 41, "type": "CUSTOMS_HOLD", "status": "NEW" }
  }
}
```

**BE validation:** `resultAt<=now` (trừ cơ chế nhập dữ liệu quá khứ hợp lệ); checkpoint thuộc Trip/current approved route; kiểm tra Specialist assignment; có căn cứ cho `PASSED`, `HELD`, `FAILED`; không được nộp `PASSED` như thao tác khống khi chưa có xác nhận thực tế. `409 TRIP_NOT_IN_TRANSIT`, `409 CHECKPOINT_NOT_IN_ACTIVE_ROUTE`, `409 CLEARANCE_ALREADY_RECORDED` nếu cùng bằng chứng/mã giao dịch bị gửi trùng.

**Side effects:** append immutable result, audit, `DocumentUpdated`/`TripUpdated`/`NotificationCreated` phù hợp. Nếu `HELD` hoặc `FAILED`, cảnh báo Manager/Coordinator; tạo/liên kết Incident theo logic Flow 5, bảo đảm retry không tạo trùng. Nếu `PASSED`, chỉ thông báo hoàn tất thủ tục **tại checkpoint/thủ tục đã được xác minh**, không khẳng định cả hành trình đã thông quan xong.

### 12.2 Điều chỉnh kết quả và ứng xử khi Route đổi

- Không có PUT/DELETE Clearance Result trong contract. Kết quả sau (`HELD` rồi `PASSED`) là bản ghi mới, vẫn giữ bản cũ.
- Khi route version thay đổi hợp lệ, checkpointPoint lịch sử thuộc route cũ vẫn đọc được; thao tác mới phải gắn checkpoint của route đang vận hành được phép.
- Với VN→VN, chỉ ghi result ở checkpoint/quarantine point mà tuyến thực tế hoặc requirement catalog xác định có nghĩa vụ; không tạo customs export/import cho nội địa.
- Với VN→JP, route demo là một chiều và hàng không trực tiếp theo cấu hình dự án, không tạo checkpoint Campuchia/Thái Lan.

---

## 13. Xuất bộ hồ sơ / Document Package – UC-TS-04

### F02-S31. `POST /specialist/trips/{tripId}/document-packages`

**Role:** Specialist có quyền. **Body:**

```json
{ "scope": "ALL", "checkpointPointId": null, "format": "ZIP" }
```

`scope=ALL|CHECKPOINT`, `format=ZIP|PDF`; nếu CHECKPOINT bắt buộc `checkpointPointId` thuộc Trip. Không đưa tài liệu chưa được duyệt vào bộ hồ sơ đi đường; muốn gói phục vụ kiểm tra thiếu sót thì báo `missingItems` ở manifest, không xuất tài liệu bị từ chối như hồ sơ hợp lệ.

**201 data:**

```json
{
  "packageId": 17,
  "tripId": 9,
  "scope": "ALL",
  "checkpointPointId": null,
  "format": "ZIP",
  "file": {
    "fileId": 3000,
    "fileName": "TRP-20261120-0003-documents.zip",
    "contentType": "application/zip",
    "url": "/api/files/3000"
  },
  "includedDocuments": 9,
  "missingItems": [{ "checklistItemId": 1201, "reason": "DOCUMENT_NOT_APPROVED" }],
  "generatedBy": 5,
  "createdAt": "2026-11-19T02:00:00Z"
}
```

**Rule:** Có mục lục, request/trip code, Horse+microchip, document type+version, thời điểm xuất và danh sách còn thiếu nếu có. Nếu không có bất kỳ document APPROVED trong phạm vi → `409 NO_APPROVED_DOCUMENTS`. `fileId` tải theo quyền; hạn chế Driver/Escort chỉ tải package dành cho chặng/chuyến được phân công. Không dùng xuất package để chứng nhận Trip đủ điều kiện xuất phát.

### F02-S32. `GET /specialist/trips/{tripId}/document-packages`

**200 data:**

```json
{
  "items": [{
    "packageId": 17, "scope": "ALL", "format": "ZIP",
    "checkpointPointId": null,
    "fileId": 3000,
    "includedDocuments": 9, "createdBy": 5,
    "createdAt": "2026-11-19T02:00:00Z"
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

---

## 14. Documents READY, Manager Overview và tích hợp Flow 3

### 14.1. Documents Readiness – xác nhận độc lập của Specialist

`ChecklistStatus=READY` là **đánh giá tự động của checklist**, còn `Documents READY` là kết quả Specialist **xác nhận** phần hồ sơ của mình sau khi Backend kiểm tra lại hồ sơ FINAL và bảo hiểm thực tế. Không đưa `DOCUMENTS_READY` vào `TripStatus` hoặc `ChecklistStatus`. Tất cả xác nhận gắn current `routeVersionId`, `checklistVersion` và `policyVersion`; xác nhận cũ vẫn lưu audit nhưng không còn hiệu lực khi dữ liệu phụ thuộc thay đổi.

### F02-S37. `GET /specialist/trips/{tripId}/documents-readiness` **[BỔ SUNG]**

**Role:** `TRANSPORT_SPECIALIST`; chỉ Trip được phân công/quyền hợp lệ. `GET` **không** tự xác nhận hoặc đổi trạng thái.

**200 OK:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": 9,
    "routeVersionId": 120,
    "checklistVersion": 4,
    "insurancePolicyId": 8,
    "insurancePolicyVersion": 2,
    "ready": true,
    "confirmed": false,
    "confirmedBy": null,
    "confirmedAt": null,
    "confirmedSnapshot": null,
    "eligibleToConfirm": true,
    "conditions": [
      {"code": "CHECKLIST_READY", "met": true},
      {"code": "REQUIRED_DOCUMENTS_VALID", "met": true},
      {"code": "INSURANCE_VERIFIED", "met": true}
    ],
    "missingConditions": [],
    "allowedActions": ["CONFIRM_DOCUMENTS_READY"]
  }
}
```

**Backend guards:** checklist `FINAL` khớp Route Version hiện hành và yêu cầu tại các mốc có hiệu lực; hồ sơ `COMPANY`/`CUSTOMER` cần thiết đã hợp lệ; policy `VERIFIED`, đúng ngựa, phạm vi, lịch chặng, thời gian và còn hiệu lực. **Có thể** sẵn sàng xác nhận khi route đang chờ Manager approve; route approval là điều kiện tổng thể riêng của Flow 3. `ready=true` không phải đã bấm xác nhận.

**Checkbox bảo hiểm trong UI (không thêm endpoint):** Specialist có thể thấy lựa chọn “Bảo hiểm đã có và hợp lệ”. Checkbox hiển thị trạng thái của policy **đã được kiểm tra và `verificationStatus=VERIFIED`**. Không cho FE tự gửi `insuranceAvailable=true` hoặc chỉ đánh dấu checkbox để vượt qua việc upload/xác minh chứng từ. `Documents READY` chỉ đủ điều kiện khi *đồng thời* checklist/hồ sơ bắt buộc hợp lệ **và** bảo hiểm đã VERIFIED theo đúng phiên bản/Route; bấm `Confirm Documents READY` là thao tác tách biệt. Nếu policy hết hạn/bị thay thế hoặc checklist thay đổi ảnh hưởng hồ sơ thì Backend vô hiệu hóa xác nhận cũ.

### F02-S38. `POST /specialist/trips/{tripId}/documents-readiness/confirm` **[BỔ SUNG]**

**Role:** `TRANSPORT_SPECIALIST`; xác nhận đã hoàn tất nghiệp vụ hồ sơ theo **snapshot hiện hành**.

**Body:**

```json
{
  "routeVersionId": 120,
  "expectedChecklistVersion": 4,
  "expectedPolicyId": 8,
  "expectedPolicyVersion": 2,
  "note": "Đã đối chiếu checklist FINAL, tài liệu hợp lệ và bảo hiểm thực tế"
}
```

**200 OK:**

```json
{
  "success": true,
  "message": "Documents readiness confirmed",
  "data": {
    "tripId": 9,
    "documentsReadiness": {
      "ready": true, "confirmed": true,
      "routeVersionId": 120, "checklistVersion": 4,
      "insurancePolicyId": 8, "insurancePolicyVersion": 2,
      "confirmedBy": 18, "confirmedAt": "2026-11-11T09:15:00Z"
    },
    "operationsReadiness": {"ready": false, "confirmed": false},
    "tripStatus": "PLANNING",
    "departureReadinessReevaluationRequested": true
  }
}
```

**Validation:** recheck trong transaction: đúng role/Trip, deployment hợp lệ, đúng current Route Version, hồ sơ FINAL đã đạt, policy hiện hành `VERIFIED` và bao phủ phù hợp, snapshot version chưa cũ. Không tin FE gửi `confirmed=true`, `insuranceVerified=true` hoặc `tripStatus`. Không cần đợi Coordinator bấm OK trước; Manager route approval là guard tổng cuối. Retry cùng snapshot idempotent; lịch sử người/time/audit giữ nguyên.

**Errors:** `400 VALIDATION_ERROR`, `403 NOT_ASSIGNED`, `404 NOT_FOUND`, `409 DOCUMENTS_NOT_READY`, `409 DOCUMENTS_CONFIRMATION_STALE`, `409 ROUTE_VERSION_CONFLICT`, `409 INSURANCE_COVERAGE_INSUFFICIENT`, `409 INVALID_STATE`. Phát notification/SignalR sau commit.

### 14.2. Thu hồi hiệu lực Documents READY và tổng hợp với Flow 3

- Khi đổi route/horse/ETA/checkpoints/hồ sơ/regulation/policy mà có ảnh hưởng hợp lệ, BE đánh dấu confirmation snapshot trước là **stale**, cập nhật `ready` và `confirmed` hiện hành, báo Specialist xác nhận lại nếu cần. **Không xóa lịch sử đã xác nhận.**
- Nếu Operations confirmation còn hợp lệ thì giữ nguyên; không tự bắt Coordinator xác nhận lại bảo hiểm hoặc tài liệu của Specialist. Nếu thay đổi tác động xe/người/booking thì Flow 3 tự xác định có cần xác nhận Operations lại hay không.
- Manager phê duyệt Route Version riêng. BE kết hợp `DOCUMENTS_CONFIRMED + OPERATIONS_CONFIRMED + ROUTE_APPROVED` và các nguồn còn hợp lệ mới chuyển Trip `READY_TO_DEPART`. Nếu mất điều kiện **trước milestone khởi hành**, chuyển lại `PLANNING` thông qua domain event; không side-effect trong GET.
- `IN_TRANSIT`: không rollback TripStatus vì giấy tờ hết hạn; xử lý tình huống phát sinh qua Flow 4/5, giữ cảnh báo và bằng chứng đúng nghiệp vụ.

---


### F02-M02. `GET /manager/documents/overview`

**Query:** `checklistStatus`, `departureBefore`, `regulationChanged`, `page`, `pageSize`.

**200 data:**

```json
{
  "counters": { "checklistsReady": 6, "checklistsNotReady": 4, "documentsPendingReview": 7 },
  "items": [{
    "tripId": 9, "tripCode": "TRP-20261120-0003",
    "checklistStatus": "NOT_READY", "approved": 7, "total": 10,
    "missingDocuments": 2,
    "regulationChanged": false,
    "assignedSpecialist": { "userId": 5, "fullName": "Tran B" }
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

### F02-M03. `GET /manager/trips/{tripId}/checklist`

**200 data:** Checklist object mục 4.3, scope dành Manager, có `blockingReasons`, `regulationChanged`, `routeVersionId`, `evaluatedAt`; chỉ đọc. Manager không thể `APPROVE` Document thông qua endpoint này.

### F02-M04. `GET /manager/trips/{tripId}/departure-conditions` – tham chiếu chuẩn Flow 3 v1.2

**Role:** `LOGISTICS_MANAGER`; đọc-only từ một Departure Readiness Engine dùng chung, không tự tính readiness thứ hai tại Flow 2. Response **phải giống** `F03-M06` ở Flow 3: có `routeVersionId`, `operationsReadiness`, `documentsReadiness`, `conditions[]` (`ROUTE_APPROVED`, `OPERATIONS_CONFIRMED`, `DOCUMENTS_CONFIRMED`, `CHECKLIST_READY`, `INSURANCE_VERIFIED`, …), `missingConditions`, `allMet`, `evaluatedAt`. Không lặp lại JSON rút gọn của phiên bản cũ.

`Documents READY` được xác nhận qua API Specialist, nhưng **không** trực tiếp sửa `TripStatus`. Backend chỉ đưa `PLANNING → READY_TO_DEPART` khi xác nhận của Specialist và Coordinator còn hợp lệ, Route Version hiện hành được Manager `APPROVED`, các điều kiện nguồn và Flow 1 vẫn đúng. Sau khi đã `IN_TRANSIT`, không tự đưa Trip trở về `PLANNING`.

### F02-M05. `GET /manager/planning`

Đọc-only danh sách chuyến cần xử lý chuẩn bị (Flow 3), có filter `condition=CHECKLIST`, phân trang, không tái định nghĩa logic readiness.

---

### F02-M06. `GET /manager/trips/{tripId}/insurance` – xem bảo hiểm, không xác minh

**Role:** `LOGISTICS_MANAGER`. Định nghĩa endpoint đồng nhất với `F03-M05` của Flow 3; chưa có policy thì `data:null`. Nếu có, **200** trả summary `policyId`, `tripId`, `verificationStatus`, `insuredHorseIds`, `coverageStartAt`, `coverageEndAt`, `verifiedBy`, `verifiedAt`, `allowedActions:["VIEW"]` trong envelope `{success,message,data}`. Manager chỉ giám sát, không `POST /manager/trips/{tripId}/insurance/verify`. File bảo hiểm chỉ tải qua `GET /files/{fileId}` theo quyền.

**Ví dụ response 200:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "policyId": 8, "tripId": 9, "verificationStatus": "VERIFIED",
    "insuredHorseIds": [31, 32],
    "coverageStartAt": "2026-11-20T00:00:00Z",
    "coverageEndAt": "2026-11-23T23:59:59Z",
    "verifiedBy": 18, "verifiedAt": "2026-11-11T09:00:00Z",
    "allowedActions": ["VIEW"]
  }
}
```

---

## 15. Shared APIs, Notification, Task và realtime

### F02-X01. `GET /master/document-types`

Danh mục loại hồ sơ cho dropdown Customer/Specialist/Manager; khác API Specialist CRUD master. Trả `documentTypeId`, `code`, `name`, `group`, `defaultScope`, `isActive`, metadata theo catalog; xem `01-shared-api.md`.

### F02-X02. `GET /tasks` / `GET /tasks/summary`

Specialist và Manager xem task phải bổ sung giấy tờ, duyệt tài liệu, rà soát regulation, chuẩn bị clearance. Task được sinh sau khi sự kiện nghiệp vụ commit, không tạo bằng client tự đặt actor/customer. Quy ước Shared API.

### F02-X03. `GET /notifications` / `GET /notifications/unread-count`

Customer nhận khi tài liệu bị từ chối, cần bổ sung, khi hoàn tất kiểm dịch/thông quan; Specialist nhận khi có bản nộp mới/route đổi hoặc bảo hiểm cần xác minh lại; Manager/Coordinator nhận badge Documents READY thay đổi hoặc clearance HELD/FAILED (Coordinator không nhận chi tiết policy). FE tải lại REST resource liên quan thay vì tin payload notification là nguồn quyết định.

### F02-X04. SignalR `/api/hubs/updates`

Các event kế thừa `00-conventions.md`: `DocumentUpdated`, `TripUpdated`, `NotificationCreated`, `AssignmentUpdated`, và `IncidentUpdated` khi xảy ra sự cố. Payload ngắn gọn `{entityId,occurredAt,version}` theo đối tượng; không broadcast file y tế, thông tin cá nhân hoặc chứng từ nhạy cảm.

- BE phát sau DB transaction, gửi đúng user/group đã xác thực; FE reconnect và refresh API.
- **Không có** `GET /.../tracking/live` hoặc vị trí GPS trong Flow 2.

---

## 16. Audit, bảo mật, file upload, concurrency

### 16.1 File security

- `GET /files/{fileId}` trả binary, kiểm tra quyền theo document, horse, request, trip, assignment và role. Nếu không có quyền → `404 NOT_FOUND`, không tiết lộ file tồn tại.
- MIME thực tế PDF/JPEG/PNG, kích thước mặc định ≤10 MB/tệp và ≤10 tệp/document theo `00-conventions.md`. Không dùng URL ảnh/tài liệu public hoặc tin MIME từ filename.
- Với tài liệu cá nhân/y tế, lưu audit tải xuống nếu cần theo chính sách bảo mật; cache headers ngăn phát tán ngoài ý muốn.

### 16.2 Versioning và concurrency

- Version document và version regulation bất biến để audit; thao tác thay thế phải dẫn chiếu bản cũ.
- Regenerate checklist dựa version route/checklist hiện hành, tránh overwrite thay đổi của Coordinator.
- Document review kiểm tra `SUBMITTED` và quyền; có thể sử dụng `expectedStatus`/`version` hoặc optimistic concurrency; hai Specialist thao tác cùng Document thì chỉ một quyết định được commit.
- POST tạo clearance result, package hoặc document request phải chống retry tạo trùng bằng idempotency key hoặc khóa nghiệp vụ phù hợp.
- Notification và SignalR chỉ phát sau transaction commit; nếu event thất bại không rollback một nghiệp vụ đã lưu thành công, cần cơ chế phát bù/outbox nếu sử dụng.

### 16.3 Audit events tối thiểu

| Hành động | Audit |
|---|---|
| Customer upload/replace | `DOCUMENT_SUBMITTED`, `DOCUMENT_SUPERSEDED` |
| Specialist approve/reject | `DOCUMENT_APPROVED`, `DOCUMENT_REJECTED` |
| Sinh lại checklist | `CHECKLIST_GENERATED`, `CHECKLIST_REGENERATED`, `CHECKLIST_READY`, `CHECKLIST_NOT_READY` |
| Yêu cầu bổ sung | `DOCUMENTS_REQUESTED` |
| Regulation tạo/sửa/ngưng | `REGULATION_CREATED`, `REGULATION_UPDATED`, `REGULATION_DISCONTINUED` |
| Clearance mới | `CLEARANCE_RECORDED` và incident reference nếu có |
| Xuất package | `PACKAGE_EXPORTED` |
| Bảo hiểm công ty | `INSURANCE_POLICY_RECORDED`, `INSURANCE_POLICY_VERIFIED`, `INSURANCE_POLICY_REJECTED`, `INSURANCE_POLICY_SUPERSEDED` |
| Xác nhận hồ sơ | `DOCUMENTS_READINESS_CONFIRMED`, `DOCUMENTS_READINESS_INVALIDATED` (chỉ khi có thay đổi thực sự ảnh hưởng) |

### F02-S33. `GET /specialist/audit-logs`

**Query:** `entityType=DOCUMENT|CHECKLIST|CLEARANCE|REGULATION|DOCUMENT_TYPE|CHECKPOINT|PACKAGE|INSURANCE_POLICY|DOCUMENTS_READINESS`, `entityId`, `tripId`, `actorId`, `action`, `from`, `to`, `page`, `pageSize`. Audit log chỉ đọc; không có POST sửa/xóa nhật ký.

**200 data:**

```json
{
  "items": [{
    "auditLogId": 9001,
    "at": "2026-11-14T04:20:00Z",
    "actor": { "userId": 5, "role": "TRANSPORT_SPECIALIST" },
    "action": "DOCUMENT_REJECTED",
    "entityType": "DOCUMENT", "entityId": 470,
    "tripId": 9,
    "summary": "Rejected unreadable passport scan",
    "details": { "fromStatus": "SUBMITTED", "toStatus": "REJECTED" }
  }],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
}
```

---

## 17. Error Contract theo nghiệp vụ Flow 2

Ngoài error chung `UNAUTHORIZED`, `TOKEN_EXPIRED`, `FORBIDDEN_ROLE`, `NOT_ASSIGNED`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`:

| HTTP | errorCode | Trường hợp |
|---|---|---|
| 400 | `UNSUPPORTED_ROUTE` | Route khác VN→VN hoặc VN→JP |
| 400 | `TRANSPORT_MODE_UNAVAILABLE` | Mode không được cấu hình cho tuyến |
| 400 | `FILE_TOO_LARGE` | File vượt giới hạn |
| 400 | `FILE_TYPE_NOT_ALLOWED` | File không đúng MIME |
| 400 | `RESULT_TIME_IN_FUTURE` | Thời gian clearance ở tương lai không hợp lệ |
| 400 | `REQUIRED_CUSTOMER_DOCUMENT_MISSING` | Customer chưa nộp tài liệu bắt buộc trước Submit (Flow 1) |
| 409 | `DOCUMENT_CONFLICT` | Document upload xung đột bản hiện hành |
| 409 | `DOCUMENT_NOT_REPLACEABLE` | Không được thay phiên bản |
| 409 | `DOCUMENT_NOT_VALID_UNTIL_ARRIVAL` | Không đủ hiệu lực theo mốc cần kiểm |
| 409 | `DOCUMENT_INVALID_FOR_REQUIREMENT` | Tài liệu không khớp requirement/checkpoint |
| 409 | `DOCUMENT_REQUEST_ALREADY_OPEN` | Trùng yêu cầu bổ sung đang chờ |
| 409 | `INVALID_STATE` | Thao tác không hợp lệ với trạng thái hiện tại |
| 409 | `CHECKLIST_ITEM_NOT_APPLICABLE` | Item không áp dụng cho chuyến hiện tại |
| 409 | `ROUTE_VERSION_CONFLICT` | Checklist route version cũ |
| 409 | `REGULATION_DUPLICATE` | Regulation trùng phạm vi/hiệu lực |
| 409 | `REGULATION_VERSION_CONFLICT` | Cập nhật dựa phiên bản cũ |
| 409 | `DOCUMENT_TYPE_NAME_DUPLICATE` | Trùng danh mục tài liệu |
| 409 | `DOCUMENT_TYPE_CODE_DUPLICATE` | Trùng code tài liệu |
| 409 | `TRIP_NOT_IN_TRANSIT` | Ghi clearance thực tế khi Trip chưa vận chuyển |
| 409 | `CHECKPOINT_NOT_IN_ACTIVE_ROUTE` | Checkpoint không thuộc tuyến hoạt động |
| 409 | `CLEARANCE_ALREADY_RECORDED` | Ghi trùng bằng chứng/kết quả |
| 409 | `NO_APPROVED_DOCUMENTS` | Không có tài liệu hợp lệ để xuất package |
| 409 | `DEPARTURE_NOT_READY` | Chưa đạt toàn bộ điều kiện khởi hành |
| 409 | `INSURANCE_COVERAGE_INSUFFICIENT` | Policy không bao phủ đủ ngựa/tuyến/thời gian/phạm vi cần thiết |
| 409 | `INSURANCE_POLICY_VERSION_CONFLICT` | Xác minh policy không phải phiên bản hiện hành |
| 409 | `DOCUMENTS_NOT_READY` | Checklist FINAL/hồ sơ/bảo hiểm chưa đạt điều kiện để Specialist xác nhận |
| 409 | `DOCUMENTS_CONFIRMATION_STALE` | Snapshot tài liệu/chính sách đã thay đổi trước khi bấm xác nhận |

**Mẫu 409:**

```json
{
  "success": false,
  "message": "Checklist must be re-evaluated for the current route version",
  "errorCode": "ROUTE_VERSION_CONFLICT",
  "data": null
}
```

Các errorCode chuyên biệt mới ở trên là **đề xuất hợp nhất vào `00-conventions.md`**, cần dùng một danh sách thống nhất giữa role contracts, không lập tên khác cho cùng một lỗi.

---

## 18. Page → API Matrix (để FE không bỏ sót)

| Page / khu vực | Endpoint | Role |
|---|---|---|
| Customer – Tạo Request/Documents | `GET /customer/requests/document-requirements` | CUSTOMER |
| Customer – Quy định tuyến | `GET /public/regulations/lookup` | Public |
| Customer – My Horses Documents | `GET /customer/horses/{horseId}/documents`; `POST /customer/horses/{horseId}/documents` | CUSTOMER |
| Customer – Request PER_TRIP Documents | **Không áp dụng demo**; C11/C12 chỉ là mục deferred/legacy | — |
| Customer – Document Detail | `GET /customer/documents/{documentId}`; `POST /customer/documents/{documentId}/replace` | CUSTOMER |
| Customer – Action Required | `GET /customer/documents/action-required` | CUSTOMER |
| Customer – Request Detail | `GET /customer/requests/{requestId}/checklist` | CUSTOMER |
| Customer – File Preview | `GET /files/{fileId}` | theo quyền |
| Specialist – Dashboard | `GET /specialist/dashboard` | TRANSPORT_SPECIALIST |
| Specialist – Trips | `GET /specialist/trips`; `GET /specialist/trips/{tripId}` | TRANSPORT_SPECIALIST |
| Specialist – Checklist | `GET /specialist/trips/{tripId}/checklist`; `POST .../regenerate`; `POST .../acknowledge-change` | TRANSPORT_SPECIALIST |
| Specialist – Review Queue | `GET /specialist/documents/review-queue` | TRANSPORT_SPECIALIST |
| Specialist – Document Detail | `GET /specialist/documents/{documentId}`; `POST .../approve`; `POST .../reject` | TRANSPORT_SPECIALIST |
| Specialist – Expiring | `GET /specialist/documents/expiring` | TRANSPORT_SPECIALIST |
| Specialist – Company Upload | `POST /specialist/trips/{tripId}/checklist/items/{checklistItemId}/documents` | TRANSPORT_SPECIALIST |
| Specialist – Insurance | `GET/POST /specialist/trips/{tripId}/insurance`; `POST /specialist/trips/{tripId}/insurance/{policyId}/verify` | TRANSPORT_SPECIALIST |
| Specialist – Documents Readiness | `GET /specialist/trips/{tripId}/documents-readiness`; `POST /specialist/trips/{tripId}/documents-readiness/confirm` | TRANSPORT_SPECIALIST |
| Specialist – Request Docs | `GET /specialist/trips/{tripId}/document-requests`; `POST .../document-requests` | TRANSPORT_SPECIALIST |
| Specialist – Regulations | `GET/POST /specialist/regulations`; `GET/PUT /specialist/regulations/{regulationId}`; `POST .../discontinue`; `GET .../history`; `GET .../affected-checklists` | TRANSPORT_SPECIALIST |
| Specialist – Document Types | `GET/POST /specialist/document-types`; `PUT /specialist/document-types/{documentTypeId}` | TRANSPORT_SPECIALIST |
| Specialist – Checkpoints | `GET/POST /specialist/checkpoints`; `PUT /specialist/checkpoints/{checkpointId}` | TRANSPORT_SPECIALIST |
| Specialist – Clearance | `GET /specialist/clearances`; `GET /specialist/trips/{tripId}/checkpoints`; `POST .../clearance-results` | TRANSPORT_SPECIALIST |
| Specialist – Packages | `POST /specialist/trips/{tripId}/document-packages`; `GET .../document-packages` | TRANSPORT_SPECIALIST |
| Specialist – Audit | `GET /specialist/audit-logs` | TRANSPORT_SPECIALIST |
| Manager – Assignment | `POST /manager/trips/{tripId}/specialist` | LOGISTICS_MANAGER |
| Manager – Documents | `GET /manager/documents/overview`; `GET /manager/trips/{tripId}/checklist`; `GET /manager/trips/{tripId}/insurance` (read-only) | LOGISTICS_MANAGER |
| Manager – Readiness | `GET /manager/trips/{tripId}/departure-conditions`; `GET /manager/planning` | LOGISTICS_MANAGER |
| Coordinator – Checkpoints | `GET /coordinator/checkpoints` | FLEET_COORDINATOR |
| Shared – Tasks/Notifications | `GET /tasks`, `GET /tasks/summary`, `GET /notifications` | theo quyền |
| Shared – Document Types | `GET /master/document-types` | theo quyền |
| Shared – File | `GET /files/{fileId}` | theo quyền |

---

## 19. Endpoint Inventory theo role (đếm độc lập để nghiệm thu)

**Customer (9 REST + 1 submit tham chiếu):**

1. `GET /customer/requests/document-requirements`;
2. `GET /public/regulations/lookup` (public);
3. `GET /customer/horses/{horseId}/documents`;
4. `POST /customer/horses/{horseId}/documents`;
5. `GET /customer/documents/{documentId}`;
6. `POST /customer/documents/{documentId}/replace`;
7. `GET /customer/documents/action-required`;
8. `GET /customer/requests/{requestId}/checklist`;
9. `GET /files/{fileId}` (shared);
10. `POST /customer/requests` (Flow 1 submit, **không** định nghĩa lại).

**Không tính vào inventory demo:** F02-C11/C12 – Request `PER_TRIP` upload/list dành cho Customer (deferred).

**Specialist (38 REST):** `F02-S01` … `F02-S38`; 5 API mới `F02-S34`…`S38` dành cho bảo hiểm và xác nhận `Documents READY`. Phần `GET/POST` cùng đường dẫn là các HTTP action khác nhau. Danh sách đầy đủ tại mục 6–14 và 16.

**Manager:** `F02-M01`…`F02-M06` (phân công, overview, checklist, readiness, planning, xem bảo hiểm read-only). Manager approve/return route **thuộc Flow 3**, không trùng với API Specialist; không có Manager insurance verify.

**Coordinator:** `F02-F01`; route submit và các route khác **thuộc Flow 3**.

**System (không REST):** checklist/policy evaluation và re-evaluation theo snapshot; invalidation Documents confirmation; tổng hợp Operations + Documents + Route approval để tính Trip readiness; document expiry; Notification/SignalR; incident linking; audit.

> **Nhất quán endpoint:** Không thiết lập các `/flow2/*` mới. API lặp ở hai tài liệu phải cùng request/response/schema/status. Một số code F02 là mã tham chiếu tài liệu, không phải URL path.

---

## 20. Acceptance Tests / UAT (FE, BE, QA)

| Mã | Tình huống | Kết quả kỳ vọng |
|---|---|---|
| `F02-T01` | Tra requirements VN→VN | Chỉ trả yêu cầu áp dụng thực sự, không tự thêm thủ tục xuất/nhập khẩu |
| `F02-T02` | Tra requirements VN→JP | Lấy quy định từ catalog theo điều kiện tuyến, không giả lập dữ liệu pháp luật |
| `F02-T03` | Gửi tuyến JP→VN / VN→TH | `400 UNSUPPORTED_ROUTE` |
| `F02-T04` | Customer thiếu tài liệu `CUSTOMER+REQUEST_SUBMISSION` | `POST /customer/requests` bị chặn, trả danh mục thiếu |
| `F02-T05` | Thiếu tài liệu `COMPANY+BEFORE_DEPARTURE` | Customer vẫn Submit được; Specialist nhận việc sau deployment |
| `F02-T06` | Customer upload đủ nhưng trạng thái `SUBMITTED` | Submit có thể thành công; không tự `APPROVED` |
| `F02-T07` | Customer cố đọc Horse/Document của người khác | `404 NOT_FOUND` |
| `F02-T08` | Customer tạo Horse với passport scan trong Flow 1 | Không yêu cầu upload lại scan khi lập Trip checklist |
| `F02-T09` | Manager chưa confirm deployment | BE không cho Specialist triển khai vượt điều kiện handoff đã chốt |
| `F02-T10` | Trip PLANNING vừa confirm deployment, chưa có route | Checklist PRELIMINARY được khởi tạo phù hợp, FINAL chưa kết luận READY |
| `F02-T11` | Coordinator submit route phiên bản mới | Checklist FINAL gắn đúng route version và checkpoint |
| `F02-T12` | Route đổi/vẫn còn checklist cũ READY | Không cho dùng READY cũ để cho khởi hành |
| `F02-T13` | Specialist regenerate cùng version hai lần không thay đổi | Không tạo document/checklist item trùng |
| `F02-T14` | Regulation version đổi ảnh hưởng Trip | Gắn `regulationChanged`, notify, cần re-evaluate |
| `F02-T15` | Acknowledge regulation có thay đổi thực chất | Không được bỏ qua regenerate và yêu cầu mới |
| `F02-T16` | Customer upload PDF/JPG hợp lệ | Document `SUBMITTED`, có fileId, audit |
| `F02-T17` | File sai MIME/quá giới hạn | `400`, không tạo hồ sơ dang dở |
| `F02-T18` | Specialist duyệt document `SUBMITTED` hợp lệ | `APPROVED`, cập nhật checklist, audit và notification |
| `F02-T19` | Hai Specialist approve/reject cùng document | Chỉ một quyết định hợp lệ, còn lại `409 INVALID_STATE` |
| `F02-T20` | Specialist duyệt document hết hạn trước ETA | Không dùng để đánh checklist READY; trả lỗi hoặc validity false |
| `F02-T21` | Specialist từ chối thiếu `reason` | `400 VALIDATION_ERROR` |
| `F02-T22` | Customer replace bị từ chối | Bản mới SUBMITTED, bản cũ/history còn truy được |
| `F02-T23` | Specialist upload COMPANY PER_HORSE | Chấp nhận nếu requirement scope PER_HORSE và horse khớp |
| `F02-T24` | Specialist gán giấy tờ COMPANY cho Customer | Chặn yêu cầu sai trách nhiệm |
| `F02-T25` | Specialist gửi yêu cầu bổ sung | Customer thấy action-required và nhận Notification |
| `F02-T26` | Customer nộp lại sau document-request | Request được cập nhật nhưng chưa tự approve |
| `F02-T27` | Document previously READY hết hạn khi gần xuất phát | `ChecklistStatus=NOT_READY`, readiness tự đánh giá lại |
| `F02-T28` | Tất cả checklist item mandatory valid, route version hợp lệ | `ChecklistStatus=READY`; vẫn cần các điều kiện khác để Trip READY |
| `F02-T29` | Checklist READY nhưng bảo hiểm chưa verified | Trip không tự READY_TO_DEPART |
| `F02-T30` | Coordinator gửi route chưa approved, Manager xem | Có thể xem checklist FINAL nhưng không dùng route unapproved cho departure |
| `F02-T31` | Driver gửi PASSED_CHECKPOINT milestone | Specialist clearance vẫn NONE nếu chưa ghi nhận result |
| `F02-T32` | Specialist ghi clearance PASSED có bằng chứng | Chỉ checkpoint đó được cập nhật, không tự báo hoàn tất mọi thủ tục |
| `F02-T33` | Specialist ghi HELD/FAILED | Cảnh báo, incident liên kết theo Flow 5; không tạo incident trùng retry |
| `F02-T34` | HELD sau đó PASSED | Lưu cả hai bản ghi, latest PASSED không xóa HELD |
| `F02-T35` | Specialist ghi clearance cho checkpoint không thuộc route hiện hành | `409 CHECKPOINT_NOT_IN_ACTIVE_ROUTE` |
| `F02-T36` | Specialist xuất package khi có hồ sơ APPROVED | File ZIP/PDF, manifest, missingItems, audit |
| `F02-T37` | Package không có tài liệu APPROVED | `409 NO_APPROVED_DOCUMENTS` |
| `F02-T38` | Driver tải tài liệu không được phép/chưa duyệt | `404 NOT_FOUND` |
| `F02-T39` | SignalR bị ngắt khi hồ sơ thay đổi | FE reconnect, gọi REST và hiện trạng thái chuẩn |
| `F02-T40` | Specialist bị thu hồi assignment | Không thể tiếp tục gọi API/nhận event về Trip đó |
| `F02-T41` | Ảnh hưởng route theo VN→JP direct AIR | Không phát sinh country KH/TH trong checklist/checkpoints |
| `F02-T42` | Job expiration chạy lặp | Không sinh audit/event trùng không cần thiết; readiness phản ánh trạng thái đúng |
| `F02-T43` | Specialist yêu cầu Customer upload giấy tờ chung `PER_TRIP` trong demo | Không đề xuất API upload Request PER_TRIP; COMPANY xử lý chứng từ chung hoặc yêu cầu thông tin qua kênh phù hợp |
| `F02-T44` | Customer cố gọi endpoint `POST /customer/requests/{requestId}/documents` thuộc diện deferred | Endpoint không được expose trong demo; không tạo Document hoặc cho bypass ownership |
| `F02-T45` | Contract có hạng mục bảo hiểm nhưng công ty chưa mua policy | Specialist `Documents READY=false`; tiền đã thu không thay chứng từ |
| `F02-T46` | Specialist upload chứng từ bảo hiểm thật | Policy `PENDING`, có `policyFileId`, audit; chưa tự `VERIFIED` |
| `F02-T47` | Specialist upload file bảo hiểm sai MIME/quá giới hạn | Từ chối, không tạo policy/file dang dở |
| `F02-T48` | Specialist verify policy không bao phủ toàn bộ Horse | `409 INSURANCE_COVERAGE_INSUFFICIENT`; không xác nhận Documents READY |
| `F02-T49` | Specialist verify policy đã đủ phạm vi, ngày và ngựa | Trạng thái `VERIFIED`, lưu `verifiedBy/verifiedAt`, audit |
| `F02-T50` | Specialist verify policy version cũ sau khi có bản mới | `409 INSURANCE_POLICY_VERSION_CONFLICT`; bản cũ vẫn giữ lịch sử |
| `F02-T51` | Customer hoặc Coordinator gọi insurance mutation của Specialist | `403 FORBIDDEN_ROLE`; không được tự upload/mua/verify |
| `F02-T52` | Checklist FINAL READY nhưng insurance chưa VERIFIED | `GET documents-readiness`: `ready=false`, `missingConditions` có `INSURANCE_VERIFIED` |
| `F02-T53` | Specialist xác nhận khi hồ sơ FINAL và bảo hiểm đều đủ | `confirmed=true` đúng `routeVersionId/checklistVersion/policyVersion`, chưa tự đổi TripStatus nếu Operations chưa confirm |
| `F02-T54` | Coordinator đã Operations READY nhưng Specialist chưa xác nhận | Trip vẫn PLANNING, Manager route approval không thay Documents confirmation |
| `F02-T55` | Cả hai bộ phận confirm và Manager đã APPROVE route, đủ điều kiện | Backend chuyển duy nhất một lần sang `READY_TO_DEPART` |
| `F02-T56` | Route/checklist/policy thay đổi sau khi Specialist confirm | Rút hiệu lực confirmation hiện hành, Trip trước departure về PLANNING khi điều kiện mất, lưu audit |
| `F02-T57` | Retry xác nhận Documents READY cùng snapshot | Idempotent, không nhân bản audit/notification hoặc state transition |
| `F02-T58` | Manager xem insurance | Chỉ read-only; API Manager insurance verify không tồn tại |
| `F02-T59` | Checklist FINAL sẵn sàng trên route chưa Manager approve | Specialist có thể confirm hồ sơ; Trip chưa READY_TO_DEPART tới khi Route được duyệt và Operations READY |
| `F02-T60` | Điều kiện hồ sơ thay đổi sau khi Trip đã IN_TRANSIT | Giữ TripStatus IN_TRANSIT, cảnh báo và xử lý Flow 4/5, không tự lùi PLANNING |

---

## 21. Phụ thuộc cần đồng bộ trước khi chính thức dùng

### 21.1 Các contract phải sửa cùng một lần

| Tài liệu | Những điểm cần đồng bộ |
|---|---|
| `00-conventions.md` | Metadata `responsibleParty`, `requiredAt`, `stage` và errorCode chuyên biệt; không tạo global enum trùng |
| `01-shared-api.md` | `GET /public/regulations/lookup` theo scope VN→VN/VN→JP; document type catalog; File authorization; SignalR |
| `02-customer-api.md` | `GET document-requirements`, `GET checklist`, uploads/replacements PER_HORSE; **không triển khai Customer Request PER_TRIP**; action required; bỏ ví dụ VN→TH |
| Specialist Role API | Dashboard, assigned trips, checklist PRELIMINARY/FINAL, review/expiry, COMPANY upload, **insurance GET/POST/verify**, **Documents READY GET/confirm**, regulation, clearance, package |
| `04-manager-api.md` | Assignment, checklist overview, departure conditions **cùng schema Flow 3 v1.2**, insurance read-only; không quyền verify Document/insurance |
| Coordinator Role API / Flow 3 v1.2 | Chỉ checkpoint hợp lệ, trigger checklist khi submit route, Operations READY, **không API coordinator insurance**; đọc badge Documents READY, không GPS |
| Flow 1 v2.3 | Reuse customer requirements/checklist cùng một engine, không chặn Submit bởi COMPANY docs |

### 21.2 Những dữ liệu không được tự kết luận

- **Danh mục pháp lý VN→VN và VN→JP:** phải được Specialist/nguồn chính thức xác thực và đưa vào catalog. Examples ở đây là schema, không là lời khẳng định giấy tờ nào được luật yêu cầu.
- **Kỳ hạn pháp lý, vaccine/test timing, giấy phép, cơ quan cấp, điều kiện của Nhật/Việt Nam và hãng bay:** quy định theo nguồn được thẩm tra; không hardcode số ngày hoặc loại xét nghiệm từ ví dụ.
- **Thời điểm cụ thể của các bước clearance tại sân bay/quarantine station:** tùy thủ tục thực tế, không lấy một milestone hiện trường làm quyết định pháp lý.
- **Quyền Specialist xem mọi Trip:** bản Role cũ ghi `assignedTo=all`, nhưng Manager API có thao tác phân công. Bản này ưu tiên least-privilege, cho phép phạm vi rộng chỉ khi được cấp quyền hợp lệ; cần đồng bộ policy authorization của BE.

### 21.3 Checklist nghiệm thu contract

- [ ] Mọi endpoint Customer/Specialist/Manager/Coordinator có đúng một định nghĩa request/response và role.
- [ ] Bảo hiểm công ty mua ngoài hệ thống, Specialist là role duy nhất ghi và xác minh policy; Manager chỉ xem, Coordinator không kiểm tra policy.
- [ ] Documents READY và Operations READY độc lập, đủ cả hai + route APPROVED + Backend guards mới khởi hành.
- [ ] Không còn endpoint/response demo tự sử dụng VN→TH, KH transit hay JP→VN.
- [ ] DocumentStatus, ChecklistItemStatus, ClearanceResult không lẫn nhau.
- [ ] `COMPANY` docs chưa hoàn tất không cản Submit Request; `CUSTOMER` docs bắt buộc không được bỏ trống.
- [ ] Không còn giả định Specialist có quyền cấp giấy tờ thay cơ quan có thẩm quyền.
- [ ] Checklist FINAL gắn route version, có logic mất READY khi cần.
- [ ] Không ai dùng Driver milestone để thay ClearanceResult.
- [ ] Package chỉ chứa tài liệu duyệt, bảo toàn historical snapshot.
- [ ] Mọi mutation có audit, quyền và xử lý retry; file private.
- [ ] Toàn bộ UAT F02-T01…T60 được map với test FE/BE.

**Kết luận thiết kế:** Flow 2 bao phủ từ xác định nghĩa vụ tài liệu, phân công và review, chứng từ công ty **bao gồm bảo hiểm thực tế**, xác nhận `Documents READY`, đến ghi nhận kết quả kiểm dịch/thông quan. `ChecklistStatus=READY` và `InsuranceVerificationStatus=VERIFIED` là dữ liệu đầu vào cho xác nhận Specialist; Flow 3 xác nhận `Operations READY`, Manager phê duyệt Route; Backend tổng hợp toàn bộ điều kiện trước khởi hành. Flow 4/5 sở hữu milestone và ứng phó sự cố.
