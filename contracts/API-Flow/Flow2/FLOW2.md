# API Contract — Flow 2: hồ sơ chuyến và phần điều phối đã được Flow 3 thay thế

> **ĐÃ ĐỔI FLOW ngày 24/10/2026:** [Flow 3](../Flow3/FLOW3.md) là nguồn chuẩn cho đánh giá Specialist → lập phương án → Manager duyệt → hoàn tất booking/nguồn lực/hồ sơ → hai READY → Manager cho phép khởi hành. Các API chuẩn bị/duyệt trùng được đánh dấu SUPERSEDED bên dưới; JSON/schema cũ chỉ tra cứu lịch sử, không triển khai cùng flow mới. Các API hồ sơ và danh mục không bị thay thế tiếp tục áp dụng.

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.0 — phần điều phối được Flow 3 thay thế theo thay đổi 24/10/2026 |
| Ngày | 24/10/2026 |
| Đầu vào | Flow 1 đã ký, Request ACTIVATED, Trip PLANNING và đã phân công Specialist/Coordinator |
| Kết thúc | Manager duyệt: Trip READY_TO_DEPART, Request SCHEDULED |
| Phạm vi thay đổi lần này | Tài liệu contract; không sửa frontend, DB, backend hoặc migration |
| Trạng thái | Thiết kế mục tiêu; chưa xác nhận frontend hiện tại đã gọi đúng hoặc backend đã hỗ trợ |

[JSON đầy đủ từng API](FLOW2-API-JSON.md) · [OpenAPI 3.1](flow2.openapi.json) · [Mẫu nhánh ROAD/AIR](flow2.examples.json) · [Quy ước chung](../../CONVENTIONS.md).

## 1. Flow và ranh giới

1. Manager giao thông tin chuyến, hạn giao thống nhất với khách và Specialist/Coordinator từ Flow 1.
2. Specialist dùng các API hồ sơ trong Flow 2 để rà soát, rồi công bố đánh giá khả thi qua F3-J03: ngày sớm nhất dự kiến đủ điều kiện, hiệu lực tại từng điểm dùng, mục còn thiếu/phụ thuộc lịch.
3. Coordinator dùng Flow 3 lập phương án phù hợp cả hồ sơ lẫn hạn giao; Manager duyệt phương án trước booking và xác nhận nguồn lực thực tế.
4. Sau duyệt, Specialist hoàn thiện chứng từ/bảo hiểm/lịch kiểm dịch bằng API Flow 2; Coordinator hoàn tất booking và xác nhận nguồn lực bằng Flow 3.
5. Specialist xác nhận Docs READY qua F3-J16, Coordinator xác nhận Ops READY qua F3-J15 cùng phương án; Manager xem và duyệt khởi hành riêng qua F3-J17/J18. Không dùng F2-J28/J51 cũ để bỏ qua phiên bản phương án.

Ngày sớm nhất là dự kiến có điều kiện, không phải Docs READY. Không đòi hoàn tất giấy cần lịch chính thức trước khi lập/duyệt phương án. Hiệu lực kiểm tra tại nơi cần dùng giấy, không chỉ ngày xuất phát hoặc ETA. Chỉ nhân sự được phân công có quyền xử lý Trip; role đúng chưa đủ quyền mọi chuyến. Driver DEPARTED thuộc Flow 4; không tạo lại Trip/hợp đồng/cọc/OTP.

## 2. Đối chiếu màn hình và hành động

| Frontend đã đọc | Dữ liệu/thao tác | API |
|---|---|---|
| Specialist AssignedTripsPage, TripDetailPage | Chuyến, ngựa, requirement snapshot, tiến độ | J02, J11–J14 |
| CustomerDocsTab, SupplementModal | Hồ sơ khách, duyệt bản cụ thể, yêu cầu bổ sung | J03, J05, J15–J18, J52 |
| CompanyDocsTab, RecordDocModal, DocumentReviewPage | Chứng từ CBN, lịch sử file/review, bản cứng | J04, J19–J23 |
| InsuranceTab, InsuranceModal, VerifyInsuranceModal | Hãng/số bảo hiểm, khoảng hiệu lực, coverage, xác minh | J24–J25 |
| CompanyDocsTab, BookingModal | Station, slot, notes, ref xác nhận | J06, J26–J27 |
| RequirementSetCard, DocsReadyCard | Checklist và Docs READY | J07–J09, J12–J14, J28 |
| RegulationsPage, SetupModals, AuditPage | Loại giấy tờ, quy định, bộ yêu cầu, audit | J07–J10, J29–J34 |
| Coordinator TripManagementPage/TripDetailPage | Chuyến, route, nguồn lực, legs, flight | J35, J39 |
| RouteTab, RouteMap, AddStopModal | Tọa độ, danh mục cơ sở, sắp xếp, lưu, gửi tuyến | J38, J40–J41, J46 |
| ResourcesTab, FleetPage, CrewPage | Xe, staff, năng lực, gắn từng chặng, xác nhận | J36–J37, J42–J43 |
| FlightTab, FlightsPage, FlightModal | Đề xuất, duyệt ngân sách, mã đặt chỗ | J44–J45, J50 |
| Manager PrepareStage | Hồ sơ/bảo hiểm/kiểm dịch, duyệt bundle tuyến và ngân sách | J47–J50 |
| Manager DepartStage | Fresh readiness và duyệt khởi hành | J48, J51 |
| Customer DocumentList, documents tab | Nhận lý do bổ sung, upload bản mới, xem kết quả | J52 + Flow 1 J17/J22/J23 |
| Mọi role | Khả năng backend thực sự đã bật | J01 |

Jxx trong bảng là F2-Jxx, không phải mã endpoint Flow 1. Không lấy specialistEndpoints/coordinatorEndpoints hiện tại làm tiêu chuẩn thiết kế. Layout, trường form, types và hành vi UI là nguồn yêu cầu; code API cũ chỉ giúp tìm caller cần sửa.

## 3. DTO, role, ID và kiểu dữ liệu

- Tiền VND nguyên đồng, gồm coverage bảo hiểm, cost bay và budget Manager. coverage là tiền bảo hiểm, cost là chi phí bay; không gộp với giá hợp đồng đã ký hoặc thay đổi cọc.
- Timestamp YYYY-MM-DD HH:mm ở Asia/Ho_Chi_Minh; DATE là YYYY-MM-DD. Form datetime-local đổi T thành dấu cách trước gửi. BE chuyển UTC tại persistence; không tự thêm Z vào giờ địa phương.
- JSON success là success/message/data; danh sách trả array; required/nullable/enum/giới hạn được định nghĩa bằng schema tường minh trong OpenAPI, không suy ra từ một mẫu. Mutation không nhận actor/time/status/ID tự cấp hoặc aggregate nguyên GET.
- USER/HORSE/TRIP/REQUEST/VEHICLE/ROUTE_SEGMENT/LEGAL_MEDICAL_RECORD/QUARANTINE_BOOKING theo ID_NAME_RULE. FlightBookingID là INT; RouteVersionID/checkpointId là số và không tự đổi sang FACILITY ID.
- PASSPORT, VN_EXPORT, VN_JP_AIR là khóa danh mục ứng dụng, không tuyên bố có bảng DOC_TYPE/REGULATION/REQUIREMENT_SET. Supplement.id là reference opaque do BE cấp; không tự tạo bảng SUPPLEMENT hay lấy COUNT+1.
- JWT role Specialist TRANSPORT_SPECIALIST; Coordinator FLEET_ROUTE_COORDINATOR; Manager LOGISTICS_MANAGER. Staff.role DRIVER/ESCORT/VETERINARIAN là **phân loại năng lực cho UI**, không phải ba JWT role mới: tài khoản gốc DRIVER_ESCORT và chứng chỉ/nhiệm vụ phù hợp. Không lấy tên người thay cho USER ID trong phân công.
- Projection theo role giữ cách frontend đang render: Specialist deployment là string, Coordinator deploymentStatus là string, Manager deployment là object. Cả ba phải phản ánh cùng Trip/deployment thật; không lưu ba trạng thái độc lập.
- Coordinator route.version ↔ Manager route.v; RETURNED ↔ CHANGES_REQUESTED. Coordinator flight.cost ↔ Manager flight.budget; BUDGET_APPROVED ↔ APPROVED. BOOKED là cùng trạng thái, phải có bookingRef thực.
- Field mới như documentVersion, documentSetVersion, resourceVersion, insurance.v, flight.version là metadata nghiệp vụ để xác nhận đúng bản đã xem. FE đọc từ response, không đếm array hoặc bịa revision. Chưa có nơi lưu thì báo chưa hỗ trợ.

## 4. Hồ sơ và Docs READY

Bộ áp dụng phải cùng origin/dest/mode, ACTIVE và đủ quy định cần thiết: VN→VN dùng VN DOMESTIC; VN→JP dùng VN EXPORT + JP IMPORT. Các nội dung quy định trong ví dụ chỉ là dữ liệu minh họa, không khẳng định yêu cầu pháp lý thực tế đã được kiểm chứng.

BE chụp pkgV, từng regV và RequirementLine khi áp dụng. Thay đổi bộ về sau không tự thay checklist chuyến cũ. Nếu xem preview rồi cấu hình đổi, apply kiểm tra lại pkgV và snapshot nguồn, trả 409 STALE_CONFIGURATION khi không còn đúng bản.

Checklist gộp theo (typeId, horseId), PER_TRIP dùng horseId=null; hai nguồn trùng chọn mức nghiêm nhất REQUIRED > CONDITIONAL > OPTIONAL, giai đoạn sớm nhất BEFORE_SUBMIT > BEFORE_DEPART > AT_CHECKPOINT. Provider/scope mâu thuẫn không chọn ngẫu nhiên: 409 REQUIREMENT_CONFIGURATION_CONFLICT.

REQUIRED trước checkpoint được counted; CONDITIONAL chỉ counted khi conditionMet=true do BE xác định; conditionMet=null chưa đánh giá được thì chặn readiness, không bỏ qua. OPTIONAL không chặn. AT_CHECKPOINT chưa phát sinh không phải giấy tờ bắt buộc trước xuất phát, nhưng thiếu config không được biến thành optional. Bộ rỗng hoặc thiếu quy định phải NOT_READY, không dùng 0/0 làm READY.

CustomerDoc duyệt đúng documentVersion; hiệu lực kiểm tra tại từng mốc cần sử dụng theo constraints của Flow 3. Chỉ giấy bắt buộc bao phủ toàn hành trình mới đòi hiệu lực tới ETA. Yêu cầu bổ sung OPEN → SUBMITTED sau khi khách upload bản mới → FULFILLED khi Specialist duyệt bản mới. File SUBMITTED không tự thành APPROVED. REJECTED cần remark >=5 ký tự, khi chiếu sang CustomerDoc.status là ACTION_REQUIRED và issue chứa lý do.

Khách nộp bổ sung cho HORSE dùng multipart Flow 1 J17, `documentType` lấy từ DocType.customerKey tương ứng. Khi Request ACTIVATED và Trip PLANNING, chỉ cho nộp lại hồ sơ có yêu cầu bổ sung đang mở; giữ nguyên snapshot hợp đồng đã ký, tăng documentVersion và documentSetVersion, mất Docs READY. Sau upload refetch J52 và hồ sơ/checklist; không suy phiên bản từ response upload cũ. Nhánh scope=request chưa có persistence được xác nhận: trả 501, không gửi qua URL horse hoặc tạo HORSE giả.

Chứng từ CBN: bản mới SUBMITTED → APPROVED/REJECTED. Phiên bản nộp lại giữ file/review bản cũ, không overwrite file đang được xem. `physicalCopy` chỉ là nhận bản gốc, không thay quyết định duyệt.

Thay file, reject, áp dụng bộ khác, sửa bảo hiểm, thay danh sách ngựa hoặc lịch làm giấy/bảo hiểm không còn hợp lệ phải mất Docs READY. Nếu Trip đã READY_TO_DEPART, không âm thầm sửa bằng chứng: trả 409 DEPARTURE_APPROVAL_LOCKED; quy trình thu hồi phê duyệt phải được chốt riêng. Sau khởi hành, nghiệp vụ phát sinh thuộc flow sau.

Bảo hiểm bao phủ tất cả ngựa từ ngày nhận đến hết ETA; lưu mới PENDING, xác minh đúng insuranceVersion mới VERIFIED. Ba checkbox trong modal là lời xác nhận của Specialist, không phải bằng chứng để BE bỏ kiểm tra. Không tự điền hãng/coverage mặc định hoặc đổi giá trị USD sang VND bằng thay nhãn.

Lịch kiểm dịch REQUESTED → BOOKED khi có ref thật; BOOKED không đồng nghĩa đã kiểm dịch đạt. `quarantineOk` chỉ true khi tất cả lịch bắt buộc trong bộ của chuyến đã xác nhận và phù hợp tuyến/ngày. Tuyến không yêu cầu lịch phải trả lý do NOT_REQUIRED trong readiness; không mặc định mọi ROAD là không cần kiểm dịch.

## 5. Tuyến, bản đồ và nguồn lực — chuyển sang Flow 3

[FLOW3.md mục 3–4](../Flow3/FLOW3.md) thay thế trình tự điều phối cũ. Draft không giữ nguồn lực; submit kiểm tra và giữ tạm; Manager duyệt phương án xác nhận phân công; Coordinator mới hoàn tất booking và xác nhận thực tế. Không còn trình tự BOOKED → confirm resources → submit route. Mỗi ROAD vẫn cần xe và ba người độc lập; AIR có hai ROAD riêng và dịch vụ bay trọn gói.

Danh mục xe/nhân sự/checkpoints F2-J36–J38 tiếp tục dùng. Lưu full bộ phương án bằng F3-J06; các route-draft/resources/flight-proposals cũ đã được thay thế, không trộn revision cũ với planVersion. Quy tắc bản đồ, tọa độ, cơ sở và nguồn dữ liệu vẫn phải kiểm tra tại server, không fallback mock.

## 6. Duyệt khởi hành và xử lý tranh chấp — chuyển sang Flow 3

[FLOW3.md mục 5–6](../Flow3/FLOW3.md) là chuẩn mới: phải đủ Docs READY + Ops READY cùng phương án, feasibility hiện hành, booking/nguồn lực/hồ sơ và thời điểm dùng còn hợp lệ. GET chỉ hiển thị; POST recheck trong transaction. Contract Flow 3 quy định phiên bản bằng chứng và Idempotency-Key cho mọi mutation mới. Các API Flow 2 không bị thay thế giữ yêu cầu key cũ cho POST đổi trạng thái/tạo dữ liệu (trừ requirement-set-preview).

Không duyệt khi chỉ route APPROVED hoặc chỉ có cờ Docs READY cũ. Phê duyệt khởi hành và DEPARTED là hai mốc khác nhau. Những endpoint giữ cùng method/path phải chuyển sang payload Flow 3; không chấp nhận hai schema để đi đường tắt.

## 7. Khoảng trống frontend và persistence — chưa được sửa trong lần viết contract

| Bằng chứng trong dự án | Việc cần làm khi tích hợp |
|---|---|
| specialistApi/coordinatorApi getOr, mock state khởi tạo | Không fallback API lỗi thành mock/empty thành công trong chế độ thật |
| useSpecialist dùng mutate trước void API; Coordinator không kiểm boolean send | await response trước đổi trạng thái; giữ form và hiện lỗi khi thất bại |
| RecordDocModal chỉ giữ tên file, DocumentReviewPage mở sample | Giữ File, multipart bytes; tải đúng bản có Bearer, không dựng tài liệu minh họa |
| InsuranceModal và FlightModal ghi USD | VND; bỏ mặc định 100000 USD, không tự đổi số tiền mẫu |
| CUSTOMER_KEY_TYPE/TYPE_CUSTOMER_KEY hardcode DT-1/2/3 | Dùng DocType.customerKey từ API, không đoán khóa DB |
| ApplySetModal/checklist/DocsReadyCard tính cục bộ | BE là nguồn checklist/conditionMet/READY; giữ UI preview nhưng không tự phê duyệt |
| togglePhysicalCopy, confirmBooking, markRequestFulfilled chỉ local | Có API riêng J23/J27/J17 và audit; không chỉ đổi bộ nhớ |
| Coordinator addStop/remove/move và ID STOP-* local | Staging rồi PUT; chỉ ID tạm ở UI, không gửi lưu |
| checkpointCatalog fallback dữ liệu mẫu | Catalog thật, phân biệt không hỗ trợ và danh sách rỗng |
| Manager PrepareStage/DepartStage mutate local trước void API | Await J49–J51, dùng readiness từ API; không đổi route/Trip bằng demo |
| Specialist/Coordinator demo controls, tự approve route/flight/departure | Không dùng làm bằng chứng thật, tắt trên chế độ tích hợp |
| LEGAL_MEDICAL_RECORD bắt buộc HorseID và thiếu metadata/version/review | PER_TRIP, documentVersion, số/cơ quan cấp, bản cứng và lịch sử chưa có nơi lưu xác nhận; giữ feature tắt/501 |
| Không thấy nguồn lưu reqSet/insurance/Docs READY/supplement/config catalog trong SQL tham khảo | Không thêm bảng/cột trong công việc này; capability false và chặn duyệt cuối nếu bằng chứng bắt buộc chưa có |
| TRIP_VEHICLE_ASSIGNMENT chỉ DriverID/EscortID, không leg/CO_DRIVER/VETERINARIAN rõ ràng | Không gán nhầm slot hoặc coi AIR đủ hai chặng; resources chưa được chứng nhận |
| VEHICLE thiếu plate/country/base/service/features; USER/chứng chỉ thiếu một phần metadata UI | Cần nguồn dữ liệu thật được xác nhận, không điền mặc định để vượt readiness |
| ROUTE_SEGMENT có route points nhưng không route approval version/lat/lng rõ ràng | Không khẳng định đủ persistence cho route-versioning/map; 501 khi chưa lưu được |
| FLIGHT_BOOKING có INT, route/airport numeric IDs nhưng thiếu budget proposal/decision/cost | Không insert booking giả để thay đề xuất; không tự sinh checkpoint ID từ mảng demo |
| TRIP_PLAN chưa xác nhận lưu approvedAt/Docs READY/evidence revisions | Không đổi Status đơn lẻ rồi tuyên bố duyệt thành công |

Nguồn đối chiếu SQL/ID chỉ đọc: D:/Shared/HorseTransportDB.sql và D:/Shared/ID_NAME_RULE.md do người dùng cung cấp. File SQL trong repository có phiên bản khác; chưa truy vấn DB thực tế. Những thiếu hụt ở bảng trên là giới hạn thiết kế cần nghiệm thu, không phải chỉ dẫn hay quyền sửa DB/backend.

## 8. Nghiệm thu và cách dùng

- Đọc flow/quyền trước; dùng JSON và schema cho tên field, required, nullable, enum, giới hạn. Chốt adapter frontend theo bảng mục 7 rồi mới nối API thật.
- Mọi feature trả bởi J01 hiện minh họa enabled=false cho đến khi backend được nghiệm thu. Capability không thay quyền JWT; enabled=true cũng phải kiểm tra quyền và bằng chứng mỗi lần.
- Các schema mới được viết tường minh, không suy required từ JSON mẫu. Một số quy tắc liên field (AIR legs, ngày, reservations, policy) phải được backend kiểm tra ngoài JSON Schema.
- Từ thư mục gốc repository, chạy `python contracts/API-Flow/Flow2/build_contract.py` rồi `node contracts/API-Flow/Flow2/validate_contract.mjs` (cần dependencies frontend đã cài). Validator kiểm toàn bộ request/response/error, nhánh ROAD/AIR, thiếu field, enum sai, số tiền âm, revision 0 không hợp lệ; phát hiện stale thật giữa hai lần gọi vẫn cần kiểm thử tích hợp backend và đồng nhất JSON giữa hai Markdown; không chạy DB hay sửa backend.
- Chưa có kết quả kiểm thử tích hợp hoặc tuyên bố frontend hiện tại đã chạy theo contract này. Phần minh họa pháp lý và catalog phải được nhóm nghiệp vụ kiểm chứng trước dùng thật.

## 9. Request/response đầy đủ theo từng API

<!-- FLOW2_ENDPOINTS_START -->

### F2-J01 — GET /master/flow2-capabilities

Khả năng Flow 2 được triển khai. Role: **AUTHENTICATED**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "features": [
      {
        "key": "configuration",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "core",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "document-review",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "document-versions",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "flight-budget",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "insurance",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "readiness",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "requirements",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "resources",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "route-versioning",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "supplements",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      }
    ],
    "checkpointSuggestionRadiusMeters": 5000
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J01Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J02 — GET /specialist/trips

Chuyến Specialist được giao. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "TRIP_001",
      "requestId": "REQUEST_001",
      "customerName": "Nguyen Van A",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destCountry": "JP",
      "mode": "AIR",
      "status": "PLANNING",
      "deployment": "CONFIRMED",
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "reqSet": null,
      "docsReady": null,
      "insurance": null,
      "checkpoints": [
        {
          "name": "Sân bay Narita",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "arrivedAt": null,
          "clearance": null
        }
      ],
      "documentSetVersion": 3
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J02Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J03 — GET /specialist/customer-documents

Hồ sơ khách đã nộp. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "tripId": "TRIP_001",
      "key": "passport",
      "scope": "HORSE_001",
      "documentVersion": 1,
      "status": "SUBMITTED",
      "optional": false,
      "file": "/api/specialist/trips/TRIP_001/customer-documents/HORSE_001/passport/file",
      "note": "Chờ Specialist kiểm tra",
      "issue": null,
      "expiry": null,
      "reviewedAt": null,
      "reviewedBy": null
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J03Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J04 — GET /specialist/documents

Chứng từ CBN. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "LEGAL_MEDICAL_RECORD_002",
      "tripId": "TRIP_001",
      "typeId": "EXPORT_HEALTH",
      "horseId": "HORSE_001",
      "status": "SUBMITTED",
      "number": "CERT-001",
      "issuer": "Đơn vị cấp giấy A",
      "issuedAt": "2026-11-15",
      "expiry": "2026-12-01",
      "versions": [
        {
          "v": 1,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        }
      ],
      "reviews": [],
      "rejectReason": null,
      "physicalCopy": false
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J04Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J05 — GET /specialist/document-requests

Yêu cầu bổ sung. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "SUP:TRIP_001:HORSE_001:passport:1",
      "tripId": "TRIP_001",
      "key": "passport",
      "scope": "HORSE_001",
      "reason": "Vui lòng nộp bản hộ chiếu còn hiệu lực",
      "dueAt": null,
      "status": "OPEN",
      "createdAt": "2026-10-24 09:00",
      "history": [
        [
          "2026-10-24 09:00",
          "Gửi yêu cầu bổ sung"
        ]
      ]
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J05Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J06 — GET /specialist/quarantine-bookings

Lịch kiểm dịch. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "QUARANTINE_BOOKING_001",
      "tripId": "TRIP_001",
      "station": "Trạm kiểm dịch A",
      "slot": "2026-11-20",
      "ref": "",
      "status": "REQUESTED",
      "notes": "",
      "confirmedAt": null
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J06Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J07 — GET /specialist/document-types

Loại giấy tờ. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "PASSPORT",
      "name": "Hộ chiếu ngựa",
      "group": "IDENTITY",
      "scope": "PER_HORSE",
      "provider": "CUSTOMER",
      "validityDays": null,
      "status": "ACTIVE",
      "customerKey": "passport"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J07Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J08 — GET /specialist/regulations

Quy định nội bộ. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "VN_EXPORT",
      "v": 1,
      "effectiveFrom": "2026-10-24",
      "country": "VN",
      "direction": "EXPORT",
      "lines": [
        {
          "typeId": "PASSPORT",
          "provider": "CUSTOMER",
          "scope": "PER_HORSE",
          "level": "REQUIRED",
          "stage": "BEFORE_DEPART",
          "condition": ""
        }
      ],
      "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
      "status": "ACTIVE"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J08Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J09 — GET /specialist/requirement-sets

Bộ yêu cầu. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "VN_JP_AIR",
      "v": 1,
      "effectiveFrom": "2026-10-24",
      "name": "Việt Nam → Nhật Bản",
      "items": [
        [
          "VN",
          "EXPORT"
        ],
        [
          "JP",
          "IMPORT"
        ]
      ],
      "origin": "VN",
      "dest": "JP",
      "modes": [
        "AIR"
      ],
      "note": "",
      "status": "ACTIVE"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J09Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J10 — GET /specialist/audit

Nhật ký thao tác. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "at": "2026-10-24 09:00",
      "actor": "Specialist A",
      "role": "TRANSPORT_SPECIALIST",
      "action": "REVIEW_CUSTOMER_DOCUMENT",
      "entity": "TRIP_001",
      "detail": "Đã kiểm tra hồ sơ"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J10Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J11 — GET /specialist/trips/{tripId}

Chi tiết chuyến cho Specialist. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customerName": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destCountry": "JP",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": "CONFIRMED",
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "horses": [
      {
        "id": "HORSE_001",
        "name": "Thunderbolt",
        "microchip": "985112004571029",
        "passportNo": "VN-EQ-2020-1029"
      }
    ],
    "reqSet": null,
    "docsReady": null,
    "insurance": null,
    "checkpoints": [
      {
        "name": "Sân bay Narita",
        "type": "AIRPORT",
        "country": "JP",
        "plannedAt": "2026-11-21 14:00",
        "arrivedAt": null,
        "clearance": null
      }
    ],
    "documentSetVersion": 3
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J11Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J12 — GET /specialist/trips/{tripId}/checklist

Checklist do backend đánh giá. Role: **TRANSPORT_SPECIALIST**. Feature: `requirements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "typeId": "PASSPORT",
        "horseId": "HORSE_001",
        "provider": "CUSTOMER",
        "level": "REQUIRED",
        "stage": "BEFORE_DEPART",
        "condition": "",
        "conditionMet": null,
        "counted": true,
        "status": "SUBMITTED",
        "doc": null,
        "missingRule": null
      }
    ],
    "ready": 0,
    "total": 1,
    "pending": 1,
    "needs": 0,
    "status": "NOT_READY",
    "documentSetVersion": 3
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J12Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J13 — POST /specialist/trips/{tripId}/requirement-set-preview

Xem trước thay đổi checklist. Role: **TRANSPORT_SPECIALIST**. Feature: `requirements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "pkgId": "VN_JP_AIR",
  "pkgV": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "snapshot": {
      "pkgId": "VN_JP_AIR",
      "pkgV": 1,
      "name": "Việt Nam → Nhật Bản",
      "at": "2026-10-24 09:00",
      "by": "USER_005",
      "rules": [
        {
          "country": "VN",
          "direction": "EXPORT",
          "regId": "VN_EXPORT",
          "regV": 1,
          "lines": [
            {
              "typeId": "PASSPORT",
              "provider": "CUSTOMER",
              "scope": "PER_HORSE",
              "level": "REQUIRED",
              "stage": "BEFORE_DEPART",
              "condition": ""
            }
          ]
        },
        {
          "country": "JP",
          "direction": "IMPORT",
          "regId": "JP_IMPORT",
          "regV": 1,
          "lines": [
            {
              "typeId": "PASSPORT",
              "provider": "CUSTOMER",
              "scope": "PER_HORSE",
              "level": "REQUIRED",
              "stage": "BEFORE_DEPART",
              "condition": ""
            }
          ]
        }
      ]
    },
    "checklist": {
      "items": [
        {
          "typeId": "PASSPORT",
          "horseId": "HORSE_001",
          "provider": "CUSTOMER",
          "level": "REQUIRED",
          "stage": "BEFORE_DEPART",
          "condition": "",
          "conditionMet": null,
          "counted": true,
          "status": "SUBMITTED",
          "doc": null,
          "missingRule": null
        }
      ],
      "ready": 0,
      "total": 1,
      "pending": 1,
      "needs": 0,
      "status": "NOT_READY",
      "documentSetVersion": 3
    },
    "changes": [
      {
        "action": "ADD",
        "typeId": "PASSPORT",
        "horseId": null
      }
    ]
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ đọc, không áp dụng/sửa dữ liệu; điều kiện phải được BE xác định.

**Schema:** `#/components/schemas/F2-J13Request`, `#/components/schemas/F2-J13Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J14 — PUT /specialist/trips/{tripId}/requirement-set

Áp dụng snapshot bộ yêu cầu. Role: **TRANSPORT_SPECIALIST**. Feature: `requirements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "pkgId": "VN_JP_AIR",
  "pkgV": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "trip": {
      "id": "TRIP_001",
      "requestId": "REQUEST_001",
      "customerName": "Nguyen Van A",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destCountry": "JP",
      "mode": "AIR",
      "status": "PLANNING",
      "deployment": "CONFIRMED",
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "reqSet": {
        "pkgId": "VN_JP_AIR",
        "pkgV": 1,
        "name": "Việt Nam → Nhật Bản",
        "at": "2026-10-24 09:00",
        "by": "USER_005",
        "rules": [
          {
            "country": "VN",
            "direction": "EXPORT",
            "regId": "VN_EXPORT",
            "regV": 1,
            "lines": [
              {
                "typeId": "PASSPORT",
                "provider": "CUSTOMER",
                "scope": "PER_HORSE",
                "level": "REQUIRED",
                "stage": "BEFORE_DEPART",
                "condition": ""
              }
            ]
          },
          {
            "country": "JP",
            "direction": "IMPORT",
            "regId": "JP_IMPORT",
            "regV": 1,
            "lines": [
              {
                "typeId": "PASSPORT",
                "provider": "CUSTOMER",
                "scope": "PER_HORSE",
                "level": "REQUIRED",
                "stage": "BEFORE_DEPART",
                "condition": ""
              }
            ]
          }
        ]
      },
      "docsReady": null,
      "insurance": null,
      "checkpoints": [
        {
          "name": "Sân bay Narita",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "arrivedAt": null,
          "clearance": null
        }
      ],
      "documentSetVersion": 3
    },
    "snapshot": {
      "pkgId": "VN_JP_AIR",
      "pkgV": 1,
      "name": "Việt Nam → Nhật Bản",
      "at": "2026-10-24 09:00",
      "by": "USER_005",
      "rules": [
        {
          "country": "VN",
          "direction": "EXPORT",
          "regId": "VN_EXPORT",
          "regV": 1,
          "lines": [
            {
              "typeId": "PASSPORT",
              "provider": "CUSTOMER",
              "scope": "PER_HORSE",
              "level": "REQUIRED",
              "stage": "BEFORE_DEPART",
              "condition": ""
            }
          ]
        },
        {
          "country": "JP",
          "direction": "IMPORT",
          "regId": "JP_IMPORT",
          "regV": 1,
          "lines": [
            {
              "typeId": "PASSPORT",
              "provider": "CUSTOMER",
              "scope": "PER_HORSE",
              "level": "REQUIRED",
              "stage": "BEFORE_DEPART",
              "condition": ""
            }
          ]
        }
      ]
    },
    "checklist": {
      "items": [
        {
          "typeId": "PASSPORT",
          "horseId": "HORSE_001",
          "provider": "CUSTOMER",
          "level": "REQUIRED",
          "stage": "BEFORE_DEPART",
          "condition": "",
          "conditionMet": null,
          "counted": true,
          "status": "SUBMITTED",
          "doc": null,
          "missingRule": null
        }
      ],
      "ready": 0,
      "total": 1,
      "pending": 1,
      "needs": 0,
      "status": "NOT_READY",
      "documentSetVersion": 3
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Snapshot do BE dựng từ đúng pkgV và regV; giữ bản chuyến cũ. Invalidate Docs READY.

**Schema:** `#/components/schemas/F2-J14Request`, `#/components/schemas/F2-J14Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J15 — POST /specialist/trips/{tripId}/customer-documents/review

Duyệt bản khách nộp. Role: **TRANSPORT_SPECIALIST**. Feature: `document-review`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "key": "passport",
  "scope": "HORSE_001",
  "documentVersion": 1,
  "decision": "APPROVED",
  "remark": "Đã kiểm tra"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "document": {
      "tripId": "TRIP_001",
      "key": "passport",
      "scope": "HORSE_001",
      "documentVersion": 1,
      "status": "APPROVED",
      "optional": false,
      "file": "/api/specialist/trips/TRIP_001/customer-documents/HORSE_001/passport/file",
      "note": "Chờ Specialist kiểm tra",
      "issue": null,
      "expiry": null,
      "reviewedAt": "2026-10-24 09:00",
      "reviewedBy": "USER_005"
    },
    "documentSetVersion": 4,
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Kiểm tra đúng bản đã xem, hiệu lực tới ETA; REJECTED cần remark >=5. Scope=request là nhánh chưa đủ persistence.

**Schema:** `#/components/schemas/F2-J15Request`, `#/components/schemas/F2-J15Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J16 — POST /specialist/document-requests

Gửi yêu cầu bổ sung cho khách. Role: **TRANSPORT_SPECIALIST**. Feature: `supplements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "tripId": "TRIP_001",
  "key": "passport",
  "scope": "HORSE_001",
  "reason": "Vui lòng nộp bản còn hiệu lực",
  "dueAt": null
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "SUP:TRIP_001:HORSE_001:passport:1",
    "tripId": "TRIP_001",
    "key": "passport",
    "scope": "HORSE_001",
    "reason": "Vui lòng nộp bản hộ chiếu còn hiệu lực",
    "dueAt": null,
    "status": "OPEN",
    "createdAt": "2026-10-24 09:00",
    "history": [
      [
        "2026-10-24 09:00",
        "Gửi yêu cầu bổ sung"
      ]
    ]
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Một OPEN/SUBMITTED trên trip/key/scope; gửi thông báo, mất Docs READY; upload lại chỉ SUBMITTED, duyệt xong mới FULFILLED.

**Schema:** `#/components/schemas/F2-J16Request`, `#/components/schemas/F2-J16Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J17 — POST /specialist/document-requests/{supplementRef}/fulfill

Hoàn tất yêu cầu đã được duyệt. Role: **TRANSPORT_SPECIALIST**. Feature: `supplements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| supplementRef | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "SUP:TRIP_001:HORSE_001:passport:1",
    "tripId": "TRIP_001",
    "key": "passport",
    "scope": "HORSE_001",
    "reason": "Vui lòng nộp bản hộ chiếu còn hiệu lực",
    "dueAt": null,
    "status": "FULFILLED",
    "createdAt": "2026-10-24 09:00",
    "history": [
      [
        "2026-10-24 09:00",
        "Gửi yêu cầu bổ sung"
      ],
      [
        "2026-10-24 10:00",
        "Đã duyệt bản bổ sung"
      ]
    ]
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ sau đúng bản được APPROVED; idempotent nếu FULFILLED, không bỏ qua duyệt.

**Schema:** `#/components/schemas/F2-J17Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J18 — GET /specialist/trips/{tripId}/customer-documents/{scope}/{key}/file

Đọc file khách có quyền. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| scope | path | Có | string |
| key | path | Có | string |

**Request body:** Không gửi body.

**Response 200:** Binary đúng MIME, có quyền; không bọc JSON thành công. Lỗi vẫn JSON.

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** , trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J19 — POST /specialist/documents

Ghi nhận chứng từ CBN với file thật. Role: **TRANSPORT_SPECIALIST**. Feature: `document-versions`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Multipart:** metadata JSON dưới đây và file thật PDF/JPEG/PNG <=10 MiB.

```json
{
  "tripId": "TRIP_001",
  "typeId": "EXPORT_HEALTH",
  "horseId": "HORSE_001",
  "number": "CERT-001",
  "issuer": "Đơn vị cấp giấy A",
  "issuedAt": "2026-11-15",
  "expiry": "2026-12-01"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "document": {
      "id": "LEGAL_MEDICAL_RECORD_002",
      "tripId": "TRIP_001",
      "typeId": "EXPORT_HEALTH",
      "horseId": "HORSE_001",
      "status": "SUBMITTED",
      "number": "CERT-001",
      "issuer": "Đơn vị cấp giấy A",
      "issuedAt": "2026-11-15",
      "expiry": "2026-12-01",
      "versions": [
        {
          "v": 1,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        }
      ],
      "reviews": [],
      "rejectReason": null,
      "physicalCopy": false
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** FormData metadata JSON và file bytes <=10 MiB. PER_HORSE bắt buộc horseId thuộc chuyến; PER_TRIP chỉ bật khi có lưu bền vững.

**Schema:** `#/components/schemas/F2-J19Request`, `#/components/schemas/F2-J19Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J20 — POST /specialist/documents/{documentRef}/versions

Nộp bản mới cùng chứng từ. Role: **TRANSPORT_SPECIALIST**. Feature: `document-versions`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| documentRef | path | Có | string |
| Idempotency-Key | header | Có | string |

**Multipart:** metadata JSON dưới đây và file thật PDF/JPEG/PNG <=10 MiB.

```json
{
  "expectedVersion": 1,
  "number": "CERT-002",
  "issuer": "Đơn vị cấp giấy A",
  "issuedAt": "2026-11-16",
  "expiry": "2026-12-02"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "document": {
      "id": "LEGAL_MEDICAL_RECORD_002",
      "tripId": "TRIP_001",
      "typeId": "EXPORT_HEALTH",
      "horseId": "HORSE_001",
      "status": "SUBMITTED",
      "number": "CERT-002",
      "issuer": "Đơn vị cấp giấy A",
      "issuedAt": "2026-11-16",
      "expiry": "2026-12-02",
      "versions": [
        {
          "v": 1,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        },
        {
          "v": 2,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/2/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        }
      ],
      "reviews": [],
      "rejectReason": null,
      "physicalCopy": false
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** BE cấp version mới, reset SUBMITTED, giữ file/review cũ, mất Docs READY.

**Schema:** `#/components/schemas/F2-J20Request`, `#/components/schemas/F2-J20Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J21 — GET /specialist/documents/{documentRef}/versions/{versionNo}/file

Đọc file đúng bản chứng từ. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| documentRef | path | Có | string |
| versionNo | path | Có | integer |

**Request body:** Không gửi body.

**Response 200:** Binary đúng MIME, có quyền; không bọc JSON thành công. Lỗi vẫn JSON.

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** , trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J22 — POST /specialist/documents/{documentRef}/review

Duyệt phiên bản chứng từ. Role: **TRANSPORT_SPECIALIST**. Feature: `document-versions`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| documentRef | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "version": 1,
  "decision": "APPROVED",
  "remark": "Đã kiểm tra"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "document": {
      "id": "LEGAL_MEDICAL_RECORD_002",
      "tripId": "TRIP_001",
      "typeId": "EXPORT_HEALTH",
      "horseId": "HORSE_001",
      "status": "APPROVED",
      "number": "CERT-001",
      "issuer": "Đơn vị cấp giấy A",
      "issuedAt": "2026-11-15",
      "expiry": "2026-12-01",
      "versions": [
        {
          "v": 1,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        }
      ],
      "reviews": [
        {
          "v": 1,
          "decision": "APPROVED",
          "at": "2026-10-24 09:00",
          "by": "USER_005",
          "remark": "Đã kiểm tra bản nộp"
        }
      ],
      "rejectReason": null,
      "physicalCopy": false
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ bản SUBMITTED mới nhất; không suy version từ array.length. REJECTED cần remark >=5; hết hạn trước ETA không duyệt.

**Schema:** `#/components/schemas/F2-J22Request`, `#/components/schemas/F2-J22Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J23 — PUT /specialist/documents/{documentRef}/physical-copy

Ghi nhận bản cứng. Role: **TRANSPORT_SPECIALIST**. Feature: `document-versions`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| documentRef | path | Có | string |

**Request JSON**

```json
{
  "version": 1,
  "physicalCopy": true
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "LEGAL_MEDICAL_RECORD_002",
    "tripId": "TRIP_001",
    "typeId": "EXPORT_HEALTH",
    "horseId": "HORSE_001",
    "status": "SUBMITTED",
    "number": "CERT-001",
    "issuer": "Đơn vị cấp giấy A",
    "issuedAt": "2026-11-15",
    "expiry": "2026-12-01",
    "versions": [
      {
        "v": 1,
        "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
        "at": "2026-10-24 09:00",
        "by": "USER_005"
      }
    ],
    "reviews": [],
    "rejectReason": null,
    "physicalCopy": true
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** PUT giá trị tuyệt đối, không toggle mù; có audit. Không tự biến scan thành APPROVED.

**Schema:** `#/components/schemas/F2-J23Request`, `#/components/schemas/F2-J23Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J24 — PUT /specialist/trips/{tripId}/insurance

Ghi nhận bảo hiểm. Role: **TRANSPORT_SPECIALIST**. Feature: `insurance`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "insurer": "Đơn vị bảo hiểm A",
  "policy": "POL-2026-001",
  "validFrom": "2026-11-20",
  "validTo": "2026-11-22",
  "coverage": 120000000,
  "currency": "VND"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "insurance": {
      "v": 1,
      "insurer": "Đơn vị bảo hiểm A",
      "policy": "POL-2026-001",
      "validFrom": "2026-11-20",
      "validTo": "2026-11-22",
      "coverage": 120000000,
      "currency": "VND",
      "status": "PENDING",
      "checkedBy": null,
      "checkedAt": null
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J24Request`, `#/components/schemas/F2-J24Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J25 — POST /specialist/trips/{tripId}/insurance/verify

Xác minh bảo hiểm. Role: **TRANSPORT_SPECIALIST**. Feature: `insurance`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "insuranceVersion": 1,
  "allHorsesCovered": true,
  "wholeJourneyCovered": true,
  "scopeChecked": true
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "v": 1,
    "insurer": "Đơn vị bảo hiểm A",
    "policy": "POL-2026-001",
    "validFrom": "2026-11-20",
    "validTo": "2026-11-22",
    "coverage": 120000000,
    "currency": "VND",
    "status": "VERIFIED",
    "checkedBy": "USER_005",
    "checkedAt": "2026-10-24 09:00"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** BE kiểm tra ngựa và khoảng departure–ETA; checkbox không thay dữ liệu thực.

**Schema:** `#/components/schemas/F2-J25Request`, `#/components/schemas/F2-J25Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J26 — POST /specialist/quarantine-bookings

Đề nghị lịch kiểm dịch. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "tripId": "TRIP_001",
  "station": "Trạm kiểm dịch A",
  "slot": "2026-11-20",
  "notes": ""
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "QUARANTINE_BOOKING_001",
    "tripId": "TRIP_001",
    "station": "Trạm kiểm dịch A",
    "slot": "2026-11-20",
    "ref": "",
    "status": "REQUESTED",
    "notes": "",
    "confirmedAt": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J26Request`, `#/components/schemas/F2-J26Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J27 — POST /specialist/quarantine-bookings/{bookingId}/confirm

Ghi nhận xác nhận từ trạm. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| bookingId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "ref": "Q-CONF-001"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "QUARANTINE_BOOKING_001",
    "tripId": "TRIP_001",
    "station": "Trạm kiểm dịch A",
    "slot": "2026-11-20",
    "ref": "Q-CONF-001",
    "status": "BOOKED",
    "notes": "",
    "confirmedAt": "2026-10-24 09:00"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ REQUESTED -> BOOKED với xác nhận thật; không đồng nghĩa kiểm dịch đạt hoặc đặt lịch tự động.

**Schema:** `#/components/schemas/F2-J27Request`, `#/components/schemas/F2-J27Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J28 — POST /specialist/trips/{tripId}/docs-ready

> **SUPERSEDED:** dùng [F3-J16](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Xác nhận Docs READY. Role: **TRANSPORT_SPECIALIST**. Feature: `readiness`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "documentSetVersion": 3,
  "insuranceVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "docsReady": {
      "at": "2026-10-24 09:00",
      "by": "USER_005"
    },
    "documentSetVersion": 3,
    "insuranceVersion": 1
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** BE tính lại checklist, hồ sơ khách, supplement, bảo hiểm; thiếu config/stale ->409, không nhận booleans ready do FE gửi.

**Schema:** `#/components/schemas/F2-J28Request`, `#/components/schemas/F2-J28Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J29 — POST /specialist/document-types

Tạo document-types. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "name": "Hộ chiếu ngựa",
  "group": "IDENTITY",
  "scope": "PER_HORSE",
  "provider": "CUSTOMER",
  "validityDays": null,
  "status": "ACTIVE",
  "customerKey": "passport"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PASSPORT",
    "name": "Hộ chiếu ngựa",
    "group": "IDENTITY",
    "scope": "PER_HORSE",
    "provider": "CUSTOMER",
    "validityDays": null,
    "status": "ACTIVE",
    "customerKey": "passport"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Khóa ứng dụng do BE cấp, không phải PK bảng SQL mới. Tắt khi chưa có nơi lưu/quyền quản trị danh mục.

**Schema:** `#/components/schemas/F2-J29Request`, `#/components/schemas/F2-J29Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J30 — PUT /specialist/document-types/{configKey}

Sửa document-types. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| configKey | path | Có | string |

**Request JSON**

```json
{
  "name": "Hộ chiếu ngựa",
  "group": "IDENTITY",
  "scope": "PER_HORSE",
  "provider": "CUSTOMER",
  "validityDays": null,
  "status": "ACTIVE",
  "customerKey": "passport"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PASSPORT",
    "name": "Hộ chiếu ngựa",
    "group": "IDENTITY",
    "scope": "PER_HORSE",
    "provider": "CUSTOMER",
    "validityDays": null,
    "status": "ACTIVE",
    "customerKey": "passport"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Bộ/quy định đã áp dụng tăng v, giữ snapshot chuyến; currentVersion query cho entity có v, server chống sửa đồng thời.

**Schema:** `#/components/schemas/F2-J30Request`, `#/components/schemas/F2-J30Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J31 — POST /specialist/regulations

Tạo regulations. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "country": "VN",
  "direction": "EXPORT",
  "lines": [
    {
      "typeId": "PASSPORT",
      "provider": "CUSTOMER",
      "scope": "PER_HORSE",
      "level": "REQUIRED",
      "stage": "BEFORE_DEPART",
      "condition": ""
    }
  ],
  "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
  "status": "ACTIVE"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "VN_EXPORT",
    "v": 1,
    "effectiveFrom": "2026-10-24",
    "country": "VN",
    "direction": "EXPORT",
    "lines": [
      {
        "typeId": "PASSPORT",
        "provider": "CUSTOMER",
        "scope": "PER_HORSE",
        "level": "REQUIRED",
        "stage": "BEFORE_DEPART",
        "condition": ""
      }
    ],
    "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
    "status": "ACTIVE"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Khóa ứng dụng do BE cấp, không phải PK bảng SQL mới. Tắt khi chưa có nơi lưu/quyền quản trị danh mục.

**Schema:** `#/components/schemas/F2-J31Request`, `#/components/schemas/F2-J31Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J32 — PUT /specialist/regulations/{configKey}

Sửa regulations. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| configKey | path | Có | string |
| currentVersion | query | Có | integer |

**Request JSON**

```json
{
  "country": "VN",
  "direction": "EXPORT",
  "lines": [
    {
      "typeId": "PASSPORT",
      "provider": "CUSTOMER",
      "scope": "PER_HORSE",
      "level": "REQUIRED",
      "stage": "BEFORE_DEPART",
      "condition": ""
    }
  ],
  "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
  "status": "ACTIVE"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "VN_EXPORT",
    "v": 1,
    "effectiveFrom": "2026-10-24",
    "country": "VN",
    "direction": "EXPORT",
    "lines": [
      {
        "typeId": "PASSPORT",
        "provider": "CUSTOMER",
        "scope": "PER_HORSE",
        "level": "REQUIRED",
        "stage": "BEFORE_DEPART",
        "condition": ""
      }
    ],
    "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
    "status": "ACTIVE"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Bộ/quy định đã áp dụng tăng v, giữ snapshot chuyến; currentVersion query cho entity có v, server chống sửa đồng thời.

**Schema:** `#/components/schemas/F2-J32Request`, `#/components/schemas/F2-J32Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J33 — POST /specialist/requirement-sets

Tạo requirement-sets. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "name": "Việt Nam → Nhật Bản",
  "items": [
    [
      "VN",
      "EXPORT"
    ],
    [
      "JP",
      "IMPORT"
    ]
  ],
  "origin": "VN",
  "dest": "JP",
  "modes": [
    "AIR"
  ],
  "note": "",
  "status": "ACTIVE"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "VN_JP_AIR",
    "v": 1,
    "effectiveFrom": "2026-10-24",
    "name": "Việt Nam → Nhật Bản",
    "items": [
      [
        "VN",
        "EXPORT"
      ],
      [
        "JP",
        "IMPORT"
      ]
    ],
    "origin": "VN",
    "dest": "JP",
    "modes": [
      "AIR"
    ],
    "note": "",
    "status": "ACTIVE"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Khóa ứng dụng do BE cấp, không phải PK bảng SQL mới. Tắt khi chưa có nơi lưu/quyền quản trị danh mục.

**Schema:** `#/components/schemas/F2-J33Request`, `#/components/schemas/F2-J33Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J34 — PUT /specialist/requirement-sets/{configKey}

Sửa requirement-sets. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| configKey | path | Có | string |
| currentVersion | query | Có | integer |

**Request JSON**

```json
{
  "name": "Việt Nam → Nhật Bản",
  "items": [
    [
      "VN",
      "EXPORT"
    ],
    [
      "JP",
      "IMPORT"
    ]
  ],
  "origin": "VN",
  "dest": "JP",
  "modes": [
    "AIR"
  ],
  "note": "",
  "status": "ACTIVE"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "VN_JP_AIR",
    "v": 1,
    "effectiveFrom": "2026-10-24",
    "name": "Việt Nam → Nhật Bản",
    "items": [
      [
        "VN",
        "EXPORT"
      ],
      [
        "JP",
        "IMPORT"
      ]
    ],
    "origin": "VN",
    "dest": "JP",
    "modes": [
      "AIR"
    ],
    "note": "",
    "status": "ACTIVE"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Bộ/quy định đã áp dụng tăng v, giữ snapshot chuyến; currentVersion query cho entity có v, server chống sửa đồng thời.

**Schema:** `#/components/schemas/F2-J34Request`, `#/components/schemas/F2-J34Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J35 — GET /coordinator/trips

Chuyến Coordinator được giao. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "TRIP_001",
      "requestId": "REQUEST_001",
      "customer": "Nguyen Van A",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR",
      "horses": [
        "HORSE_001"
      ],
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "status": "PLANNING",
      "deploymentStatus": "CONFIRMED",
      "route": {
        "version": 1,
        "status": "DRAFT",
        "stops": [
          {
            "id": "ROUTE_SEGMENT_001",
            "name": "Trại ngựa A",
            "type": "ORIGIN",
            "country": "VN",
            "plannedAt": "2026-11-20 08:00",
            "lat": 10.82,
            "lng": 106.65,
            "checkpointId": null
          },
          {
            "id": "ROUTE_SEGMENT_002",
            "name": "SGN",
            "type": "AIRPORT",
            "country": "VN",
            "plannedAt": "2026-11-20 10:00",
            "lat": 10.82,
            "lng": 106.65,
            "checkpointId": 101
          },
          {
            "id": "ROUTE_SEGMENT_003",
            "name": "NRT",
            "type": "AIRPORT",
            "country": "JP",
            "plannedAt": "2026-11-21 14:00",
            "lat": 35.77,
            "lng": 140.39,
            "checkpointId": 201
          },
          {
            "id": "ROUTE_SEGMENT_004",
            "name": "Trạm kiểm dịch A",
            "type": "QUARANTINE_STATION",
            "country": "JP",
            "plannedAt": "2026-11-21 16:00",
            "lat": 35.77,
            "lng": 140.39,
            "checkpointId": 203
          },
          {
            "id": "ROUTE_SEGMENT_005",
            "name": "Trại ngựa B",
            "type": "DESTINATION",
            "country": "JP",
            "plannedAt": "2026-11-21 18:00",
            "lat": 35.77,
            "lng": 140.39,
            "checkpointId": null
          }
        ],
        "submittedAt": null,
        "reviewedAt": null,
        "returnReason": null
      },
      "vehicleId": null,
      "crew": {},
      "legs": {
        "outbound": {
          "key": "outbound",
          "title": "Chặng VN",
          "country": "VN",
          "from": "Trại ngựa A",
          "to": "SGN",
          "vehicleId": null,
          "crew": {}
        },
        "inbound": {
          "key": "inbound",
          "title": "Chặng JP",
          "country": "JP",
          "from": "NRT",
          "to": "Trại ngựa B",
          "vehicleId": null,
          "crew": {}
        }
      },
      "flight": {
        "version": 1,
        "airline": "Hãng bay A",
        "flightNo": "AIR001",
        "fromAirport": "SGN",
        "toAirport": "NRT",
        "departAt": "2026-11-20 12:00",
        "arriveAt": "2026-11-21 14:00",
        "cost": 25000000,
        "currency": "VND",
        "departureAirportCheckpointId": 101,
        "arrivalAirportCheckpointId": 201,
        "status": "BUDGET_PENDING",
        "bookingRef": null,
        "bookingId": null
      },
      "resourcesConfirmed": null,
      "resourceVersion": 0,
      "milestones": [],
      "etaHistory": []
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.

**Schema:** `#/components/schemas/F2-J35Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J36 — GET /coordinator/vehicles

Xe để phân công. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "VEHICLE_001",
      "plate": "51C-12345",
      "model": "Xe vận chuyển ngựa",
      "stalls": 4,
      "country": "VN",
      "base": "Ho Chi Minh City",
      "status": "READY",
      "nextService": "2026-12-01",
      "features": "Thông gió, vách ngăn"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.

**Schema:** `#/components/schemas/F2-J36Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J37 — GET /coordinator/staff

Nhân sự theo năng lực. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "USER_008",
      "name": "Driver A",
      "role": "DRIVER",
      "country": "VN",
      "phone": "+84901234567",
      "licence": null,
      "certExpiry": null
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.

**Schema:** `#/components/schemas/F2-J37Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J38 — GET /coordinator/checkpoints

Danh mục điểm dừng cho bản đồ. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "checkpointId": 101,
      "name": "Sân bay SGN",
      "country": "VN",
      "type": "AIRPORT",
      "lat": 10.8188,
      "lng": 106.652,
      "active": true
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.

**Schema:** `#/components/schemas/F2-J38Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J39 — GET /coordinator/trips/{tripId}

Chi tiết chuyến Coordinator. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customer": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "horses": [
      "HORSE_001"
    ],
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "status": "PLANNING",
    "deploymentStatus": "CONFIRMED",
    "route": {
      "version": 1,
      "status": "DRAFT",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "submittedAt": null,
      "reviewedAt": null,
      "returnReason": null
    },
    "vehicleId": null,
    "crew": {},
    "legs": {
      "outbound": {
        "key": "outbound",
        "title": "Chặng VN",
        "country": "VN",
        "from": "Trại ngựa A",
        "to": "SGN",
        "vehicleId": null,
        "crew": {}
      },
      "inbound": {
        "key": "inbound",
        "title": "Chặng JP",
        "country": "JP",
        "from": "NRT",
        "to": "Trại ngựa B",
        "vehicleId": null,
        "crew": {}
      }
    },
    "flight": {
      "version": 1,
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "fromAirport": "SGN",
      "toAirport": "NRT",
      "departAt": "2026-11-20 12:00",
      "arriveAt": "2026-11-21 14:00",
      "cost": 25000000,
      "currency": "VND",
      "departureAirportCheckpointId": 101,
      "arrivalAirportCheckpointId": 201,
      "status": "BUDGET_PENDING",
      "bookingRef": null,
      "bookingId": null
    },
    "resourcesConfirmed": null,
    "resourceVersion": 0,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J39Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J40 — PUT /coordinator/trips/{tripId}/route-draft

> **SUPERSEDED:** dùng [F3-J06](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Lưu thứ tự và tọa độ điểm dừng. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `route-versioning`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "expectedRouteVersion": 0,
  "stops": [
    {
      "id": "ROUTE_SEGMENT_001",
      "name": "Trại ngựa A",
      "type": "ORIGIN",
      "country": "VN",
      "plannedAt": "2026-11-20 08:00",
      "lat": 10.82,
      "lng": 106.65,
      "checkpointId": null
    },
    {
      "id": "ROUTE_SEGMENT_002",
      "name": "SGN",
      "type": "AIRPORT",
      "country": "VN",
      "plannedAt": "2026-11-20 10:00",
      "lat": 10.82,
      "lng": 106.65,
      "checkpointId": 101
    },
    {
      "id": "ROUTE_SEGMENT_003",
      "name": "NRT",
      "type": "AIRPORT",
      "country": "JP",
      "plannedAt": "2026-11-21 14:00",
      "lat": 35.77,
      "lng": 140.39,
      "checkpointId": 201
    },
    {
      "id": "ROUTE_SEGMENT_004",
      "name": "Trạm kiểm dịch A",
      "type": "QUARANTINE_STATION",
      "country": "JP",
      "plannedAt": "2026-11-21 16:00",
      "lat": 35.77,
      "lng": 140.39,
      "checkpointId": 203
    },
    {
      "id": "ROUTE_SEGMENT_005",
      "name": "Trại ngựa B",
      "type": "DESTINATION",
      "country": "JP",
      "plannedAt": "2026-11-21 18:00",
      "lat": 35.77,
      "lng": 140.39,
      "checkpointId": null
    }
  ]
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "status": "DRAFT",
    "stops": [
      {
        "id": "ROUTE_SEGMENT_001",
        "name": "Trại ngựa A",
        "type": "ORIGIN",
        "country": "VN",
        "plannedAt": "2026-11-20 08:00",
        "lat": 10.82,
        "lng": 106.65,
        "checkpointId": null
      },
      {
        "id": "ROUTE_SEGMENT_002",
        "name": "SGN",
        "type": "AIRPORT",
        "country": "VN",
        "plannedAt": "2026-11-20 10:00",
        "lat": 10.82,
        "lng": 106.65,
        "checkpointId": 101
      },
      {
        "id": "ROUTE_SEGMENT_003",
        "name": "NRT",
        "type": "AIRPORT",
        "country": "JP",
        "plannedAt": "2026-11-21 14:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": 201
      },
      {
        "id": "ROUTE_SEGMENT_004",
        "name": "Trạm kiểm dịch A",
        "type": "QUARANTINE_STATION",
        "country": "JP",
        "plannedAt": "2026-11-21 16:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": 203
      },
      {
        "id": "ROUTE_SEGMENT_005",
        "name": "Trại ngựa B",
        "type": "DESTINATION",
        "country": "JP",
        "plannedAt": "2026-11-21 18:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": null
      }
    ],
    "submittedAt": null,
    "reviewedAt": null,
    "returnReason": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Thêm/xóa/sắp xếp là staging trước PUT. Điểm mới không gửi ID tạm; BE cấp ROUTE_SEGMENT_*. Đổi cấu trúc mất xác nhận resources và duyệt tuyến cũ.

**Schema:** `#/components/schemas/F2-J40Request`, `#/components/schemas/F2-J40Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J41 — POST /coordinator/trips/{tripId}/route/submit

> **SUPERSEDED:** dùng [F3-J08](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Gửi tuyến chờ duyệt. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `route-versioning`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "resourceVersion": 3
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "status": "PENDING_APPROVAL",
    "stops": [
      {
        "id": "ROUTE_SEGMENT_001",
        "name": "Trại ngựa A",
        "type": "ORIGIN",
        "country": "VN",
        "plannedAt": "2026-11-20 08:00",
        "lat": 10.82,
        "lng": 106.65,
        "checkpointId": null
      },
      {
        "id": "ROUTE_SEGMENT_002",
        "name": "SGN",
        "type": "AIRPORT",
        "country": "VN",
        "plannedAt": "2026-11-20 10:00",
        "lat": 10.82,
        "lng": 106.65,
        "checkpointId": 101
      },
      {
        "id": "ROUTE_SEGMENT_003",
        "name": "NRT",
        "type": "AIRPORT",
        "country": "JP",
        "plannedAt": "2026-11-21 14:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": 201
      },
      {
        "id": "ROUTE_SEGMENT_004",
        "name": "Trạm kiểm dịch A",
        "type": "QUARANTINE_STATION",
        "country": "JP",
        "plannedAt": "2026-11-21 16:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": 203
      },
      {
        "id": "ROUTE_SEGMENT_005",
        "name": "Trại ngựa B",
        "type": "DESTINATION",
        "country": "JP",
        "plannedAt": "2026-11-21 18:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": null
      }
    ],
    "submittedAt": "2026-10-24 09:00",
    "reviewedAt": null,
    "returnReason": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Cần resourcesConfirmed; AIR BOOKED và đủ hai chặng xe. DRAFT/RETURNED -> PENDING_APPROVAL. Không đợi route APPROVED mới confirm resources.

**Schema:** `#/components/schemas/F2-J41Request`, `#/components/schemas/F2-J41Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J42 — PUT /coordinator/trips/{tripId}/resources

> **SUPERSEDED:** dùng [F3-J06](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Lưu phân công chặng đang sửa. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `resources`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "expectedResourceVersion": 0,
  "leg": "outbound",
  "vehicleId": null,
  "crew": {
    "MAIN_DRIVER": "USER_008",
    "CO_DRIVER": "USER_009",
    "VETERINARIAN": "USER_010"
  }
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customer": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "horses": [
      "HORSE_001"
    ],
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "status": "PLANNING",
    "deploymentStatus": "CONFIRMED",
    "route": {
      "version": 1,
      "status": "DRAFT",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "submittedAt": null,
      "reviewedAt": null,
      "returnReason": null
    },
    "vehicleId": null,
    "crew": {},
    "legs": {
      "outbound": {
        "key": "outbound",
        "title": "Chặng VN",
        "country": "VN",
        "from": "Trại ngựa A",
        "to": "SGN",
        "vehicleId": null,
        "crew": {
          "MAIN_DRIVER": "USER_008",
          "CO_DRIVER": "USER_009",
          "VETERINARIAN": "USER_010"
        }
      },
      "inbound": {
        "key": "inbound",
        "title": "Chặng JP",
        "country": "JP",
        "from": "NRT",
        "to": "Trại ngựa B",
        "vehicleId": null,
        "crew": {}
      }
    },
    "flight": {
      "version": 1,
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "fromAirport": "SGN",
      "toAirport": "NRT",
      "departAt": "2026-11-20 12:00",
      "arriveAt": "2026-11-21 14:00",
      "cost": 25000000,
      "currency": "VND",
      "departureAirportCheckpointId": 101,
      "arrivalAirportCheckpointId": 201,
      "status": "BUDGET_PENDING",
      "bookingRef": null,
      "bookingId": null
    },
    "resourcesConfirmed": null,
    "resourceVersion": 1,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** ROAD leg=null; AIR phải outbound/inbound. PUT full xe/crew của chặng; slot thiếu là chưa phân công. Không sửa PENDING_APPROVAL/APPROVED, phải reopen.

**Schema:** `#/components/schemas/F2-J42Request`, `#/components/schemas/F2-J42Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J43 — POST /coordinator/trips/{tripId}/resources/confirm

> **SUPERSEDED:** dùng [F3-J14](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Xác nhận nguồn lực. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `resources`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "resourceVersion": 3,
  "flightVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customer": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "horses": [
      "HORSE_001"
    ],
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "status": "PLANNING",
    "deploymentStatus": "CONFIRMED",
    "route": {
      "version": 1,
      "status": "DRAFT",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "submittedAt": null,
      "reviewedAt": null,
      "returnReason": null
    },
    "vehicleId": null,
    "crew": {},
    "legs": {
      "outbound": {
        "key": "outbound",
        "title": "Chặng VN",
        "country": "VN",
        "from": "Trại ngựa A",
        "to": "SGN",
        "vehicleId": "VEHICLE_001",
        "crew": {
          "MAIN_DRIVER": "USER_008",
          "CO_DRIVER": "USER_009",
          "VETERINARIAN": "USER_010"
        }
      },
      "inbound": {
        "key": "inbound",
        "title": "Chặng JP",
        "country": "JP",
        "from": "NRT",
        "to": "Trại ngựa B",
        "vehicleId": "VEHICLE_002",
        "crew": {
          "MAIN_DRIVER": "USER_011",
          "CO_DRIVER": "USER_012",
          "VETERINARIAN": "USER_013"
        }
      }
    },
    "flight": {
      "version": 1,
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "fromAirport": "SGN",
      "toAirport": "NRT",
      "departAt": "2026-11-20 12:00",
      "arriveAt": "2026-11-21 14:00",
      "cost": 25000000,
      "currency": "VND",
      "departureAirportCheckpointId": 101,
      "arrivalAirportCheckpointId": 201,
      "status": "BOOKED",
      "bookingRef": "BOOK-001",
      "bookingId": 300
    },
    "resourcesConfirmed": {
      "at": "2026-10-24 09:00",
      "by": "USER_006"
    },
    "resourceVersion": 3,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** BE kiểm tra xung đột/chứng chỉ, 3 người khác nhau, đủ stalls, đúng quốc gia; AIR đủ hai chặng + BOOKED. Không đòi route APPROVED.

**Schema:** `#/components/schemas/F2-J43Request`, `#/components/schemas/F2-J43Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J44 — POST /coordinator/trips/{tripId}/flight/proposals

> **SUPERSEDED:** dùng [F3-J06](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Đề xuất ngân sách bay. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `flight-budget`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "expectedFlightVersion": 0,
  "airline": "Hãng bay A",
  "flightNo": "AIR001",
  "fromAirport": "SGN",
  "toAirport": "NRT",
  "departAt": "2026-11-20 12:00",
  "arriveAt": "2026-11-21 14:00",
  "cost": 25000000,
  "currency": "VND",
  "departureAirportCheckpointId": 101,
  "arrivalAirportCheckpointId": 201
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "airline": "Hãng bay A",
    "flightNo": "AIR001",
    "fromAirport": "SGN",
    "toAirport": "NRT",
    "departAt": "2026-11-20 12:00",
    "arriveAt": "2026-11-21 14:00",
    "cost": 25000000,
    "currency": "VND",
    "departureAirportCheckpointId": 101,
    "arrivalAirportCheckpointId": 201,
    "status": "BUDGET_PENDING",
    "bookingRef": null,
    "bookingId": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** AIR bay thẳng, sân bay đúng quốc gia/thứ tự tuyến, VND. Không insert FLIGHT_BOOKING BookingConfirmed=1 khi mới đề xuất.

**Schema:** `#/components/schemas/F2-J44Request`, `#/components/schemas/F2-J44Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J45 — POST /coordinator/trips/{tripId}/flight/booking

> **SUPERSEDED:** dùng [F3-J13](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Ghi nhận mã đặt chỗ. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `flight-budget`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "flightVersion": 1,
  "bookingRef": "BOOK-001"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "airline": "Hãng bay A",
    "flightNo": "AIR001",
    "fromAirport": "SGN",
    "toAirport": "NRT",
    "departAt": "2026-11-20 12:00",
    "arriveAt": "2026-11-21 14:00",
    "cost": 25000000,
    "currency": "VND",
    "departureAirportCheckpointId": 101,
    "arrivalAirportCheckpointId": 201,
    "status": "BOOKED",
    "bookingRef": "BOOK-001",
    "bookingId": 300
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ BUDGET_APPROVED đúng bản với mã thật. bookingId INT, không FLIGHT_BOOKING_001.

**Schema:** `#/components/schemas/F2-J45Request`, `#/components/schemas/F2-J45Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J46 — POST /coordinator/trips/{tripId}/route/reopen

> **SUPERSEDED:** dùng [F3-J09/F3-J12](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Mở bản mới khi đổi kế hoạch. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `route-versioning`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "reason": "Cần đổi trạm nghỉ và bố trí lại xe"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customer": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "horses": [
      "HORSE_001"
    ],
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "status": "PLANNING",
    "deploymentStatus": "CONFIRMED",
    "route": {
      "version": 2,
      "status": "DRAFT",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "submittedAt": null,
      "reviewedAt": null,
      "returnReason": null
    },
    "vehicleId": null,
    "crew": {},
    "legs": {
      "outbound": {
        "key": "outbound",
        "title": "Chặng VN",
        "country": "VN",
        "from": "Trại ngựa A",
        "to": "SGN",
        "vehicleId": null,
        "crew": {}
      },
      "inbound": {
        "key": "inbound",
        "title": "Chặng JP",
        "country": "JP",
        "from": "NRT",
        "to": "Trại ngựa B",
        "vehicleId": null,
        "crew": {}
      }
    },
    "flight": {
      "version": 1,
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "fromAirport": "SGN",
      "toAirport": "NRT",
      "departAt": "2026-11-20 12:00",
      "arriveAt": "2026-11-21 14:00",
      "cost": 25000000,
      "currency": "VND",
      "departureAirportCheckpointId": 101,
      "arrivalAirportCheckpointId": 201,
      "status": "BUDGET_PENDING",
      "bookingRef": null,
      "bookingId": null
    },
    "resourcesConfirmed": null,
    "resourceVersion": 0,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ PLANNING, tăng routeVersion, hủy duyệt/xác nhận liên quan. READY_TO_DEPART cần quy trình thu hồi duyệt riêng ngoài contract này.

**Schema:** `#/components/schemas/F2-J46Request`, `#/components/schemas/F2-J46Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J47 — GET /manager/trips/{tripId}/preparation

> **SUPERSEDED:** dùng [F3-J10](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Tổng hợp chuẩn bị cho Manager. Role: **LOGISTICS_MANAGER**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": {
      "status": "CONFIRMED",
      "specialistId": "USER_005",
      "coordinatorId": "USER_006",
      "at": "2026-10-24 09:00"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 1,
      "docsReadyAt": null,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "route": null,
    "flight": null,
    "departureApprovedAt": null,
    "routeVersion": 1,
    "resourceVersion": 0,
    "flightVersion": null,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J47Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J48 — GET /manager/trips/{tripId}/readiness

> **SUPERSEDED:** dùng [F3-J17](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Điều kiện khởi hành. Role: **LOGISTICS_MANAGER**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "routeVersion": 1,
    "resourceVersion": 0,
    "flightVersion": null,
    "canApprove": false,
    "checks": [
      {
        "key": "docs",
        "ok": false,
        "code": "DOCS_NOT_READY",
        "message": "Hồ sơ chưa được xác nhận"
      }
    ],
    "evaluatedAt": "2026-10-24 09:00"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Tính dữ liệu mới nhất; 0/0 hoặc missing config không phải đủ hồ sơ. ROAD/AIR có checks khác nhau.

**Schema:** `#/components/schemas/F2-J48Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J49 — POST /manager/trips/{tripId}/route/decision

> **SUPERSEDED:** dùng [F3-J11](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Duyệt hoặc trả tuyến. Role: **LOGISTICS_MANAGER**. Feature: `route-versioning`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "resourceVersion": 3,
  "decision": "APPROVED",
  "reason": "Đã kiểm tra phương án"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": {
      "status": "CONFIRMED",
      "specialistId": "USER_005",
      "coordinatorId": "USER_006",
      "at": "2026-10-24 09:00"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 1,
      "docsReadyAt": null,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "route": {
      "v": 1,
      "status": "APPROVED",
      "submittedAt": "2026-10-24 08:30",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "vehicle": "51C-12345 / JP-001",
      "crew": [
        [
          "MAIN_DRIVER",
          "Driver VN A"
        ],
        [
          "CO_DRIVER",
          "Driver VN B"
        ],
        [
          "VETERINARIAN",
          "Vet VN"
        ],
        [
          "MAIN_DRIVER",
          "Driver JP A"
        ],
        [
          "CO_DRIVER",
          "Driver JP B"
        ],
        [
          "VETERINARIAN",
          "Vet JP"
        ]
      ],
      "resourcesConfirmed": true,
      "note": "",
      "decisionNote": "Đã kiểm tra phương án",
      "decidedAt": "2026-10-24 09:00"
    },
    "flight": {
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "budget": 25000000,
      "status": "BOOKED",
      "decidedAt": "2026-10-24 08:00"
    },
    "departureApprovedAt": null,
    "routeVersion": 1,
    "resourceVersion": 3,
    "flightVersion": 1,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ PENDING_APPROVAL; RETURNED reason>=10. Duyệt đúng bundle tuyến/xe/crew, không duyệt nhân sự riêng.

**Schema:** `#/components/schemas/F2-J49Request`, `#/components/schemas/F2-J49Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J50 — POST /manager/trips/{tripId}/flight/decision

> **SUPERSEDED:** dùng [F3-J11](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Quyết định ngân sách bay. Role: **LOGISTICS_MANAGER**. Feature: `flight-budget`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "flightVersion": 1,
  "decision": "APPROVED",
  "note": "Đồng ý ngân sách"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": {
      "status": "CONFIRMED",
      "specialistId": "USER_005",
      "coordinatorId": "USER_006",
      "at": "2026-10-24 09:00"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 1,
      "docsReadyAt": null,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "route": null,
    "flight": {
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "budget": 25000000,
      "status": "APPROVED",
      "decidedAt": "2026-10-24 09:00"
    },
    "departureApprovedAt": null,
    "routeVersion": 1,
    "resourceVersion": 0,
    "flightVersion": 1,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ BUDGET_PENDING; REJECTED note>=10. Manager APPROVED = Coordinator BUDGET_APPROVED, chưa BOOKED.

**Schema:** `#/components/schemas/F2-J50Request`, `#/components/schemas/F2-J50Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J51 — POST /manager/trips/{tripId}/departure/approve

> **SUPERSEDED:** dùng [F3-J18](../Flow3/FLOW3-API-JSON.md). Payload/schema/mẫu F2 bên dưới là bản trước thay đổi flow, không dùng cho tích hợp mới.

Duyệt sẵn sàng khởi hành. Role: **LOGISTICS_MANAGER**. Feature: `readiness`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "resourceVersion": 3,
  "flightVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "tripStatus": "READY_TO_DEPART",
    "requestId": "REQUEST_001",
    "requestStatus": "SCHEDULED",
    "departureApprovedAt": "2026-10-24 09:00",
    "approvedBy": "USER_004",
    "routeVersion": 1,
    "resourceVersion": 3,
    "flightVersion": 1
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Transaction kiểm tra tất cả bằng chứng/reservations; Trip READY_TO_DEPART + Request SCHEDULED, actor/time. Không tạo DEPARTED/IN_TRANSIT.

**Schema:** `#/components/schemas/F2-J51Request`, `#/components/schemas/F2-J51Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J52 — GET /customer/requests/{requestId}/supplements

Yêu cầu bổ sung khách phải xử lý. Role: **CUSTOMER**. Feature: `supplements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| requestId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "SUP:TRIP_001:HORSE_001:passport:1",
      "tripId": "TRIP_001",
      "key": "passport",
      "scope": "HORSE_001",
      "reason": "Vui lòng nộp bản hộ chiếu còn hiệu lực",
      "dueAt": null,
      "status": "OPEN",
      "createdAt": "2026-10-24 09:00",
      "history": [
        [
          "2026-10-24 09:00",
          "Gửi yêu cầu bổ sung"
        ]
      ]
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Cùng DocRequest của Specialist; upload dùng Flow 1 J17, không tạo hồ sơ độc lập. Upload chưa APPROVED/FULFILLED.

**Schema:** `#/components/schemas/F2-J52Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

<!-- FLOW2_ENDPOINTS_END -->
