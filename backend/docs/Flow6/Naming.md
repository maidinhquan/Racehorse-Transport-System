# Quy tắc đặt tên và sắp xếp backend

Áp dụng riêng module Flow 6, dựa mục 5 của `backend/Flow1-Rebuild-Plan.md` và hướng dẫn `backend/Application/Flow1/README.md`.

- Dùng folder `Flow6` trong từng tầng hiện có; tên file/class bên trong mô tả nhiệm vụ, không lặp `Flow6` hoặc `IFlow6` làm tiền tố.
- Tên C# dùng PascalCase, tối đa ba từ có nghĩa; interface có `I`, controller có `Controller`, service có `Service` khi đúng trách nhiệm.
- Mỗi type chính có file riêng. Không gom exception, các interface và rules vào một `Abstractions.cs`; không để filter IPN chung file DI hoặc verifier hoàn tiền chung file PDF.
- Namespace khớp tầng và folder con. Module `Flow6` vẫn xuất hiện trong namespace để phân biệt với các flow khác.
- Đường dẫn API, operation ID, tên schema Swagger, khóa cấu hình, mã tham chiếu VNPay và tên bảng SQL giữ nguyên; đây là giao thức sử dụng, không phải tên file.
- Đây là thay đổi cách tổ chức/tên code, không thay mô hình nghiệp vụ. `AftercareService` hiện là một type partial; file `AftercareService.Delivery.cs` chứa phần giao nhận của chính type đó, không phải một dịch vụ độc lập. `ApiContract.Validation.cs` tương tự cho phần validation.

Cấu trúc:

```text
backend/
  Application/Flow6/
    Contracts/      ApiContract.cs, ApiContract.Validation.cs
    Exceptions/     AftercareException.cs
    Interfaces/     IAftercareStore.cs, IDeliveryRenderer.cs,
                    IDeliveryOtpSender.cs, IRefundVerifier.cs, IRuntimeGuards.cs
    Rules/          BusinessRules.cs
    Services/       AftercareService.cs,
                    AftercareService.Delivery.cs,
                    AftercareService.Settlement.cs,
                    AftercareService.Billing.cs,
                    AftercareService.Reconciliation.cs,
                    AftercareService.Closure.cs
  Infrastructure/Flow6/
    Data/           SqlStore.cs, DepositSession.cs
    Documents/      DeliveryRenderer.cs
    Email/          DeliveryOtpSender.cs
    Payments/       UnavailableRefundVerifier.cs
    Runtime/        MemoryGuards.cs
  WebApi/
    Controllers/Flow6/   AftercareController.cs
    Extensions/Flow6/    ServiceRegistration.cs, IpnFilter.cs,
                         SwaggerLayout.cs, ClosureWorker.cs,
                         ReconciliationWorker.cs
  tests/Flow6/       Aftercare.Tests.csproj, ApiFactory.cs,
                    LifecycleTests.cs, ValidationTests.cs, MemoryRuntimeTests.cs
  docs/Flow6/        README.md, Naming.md, openapi.json, source-manifest.json
```

Chạy kiểm thử:

```powershell
dotnet build backend/WebApi/WebApi.csproj --no-restore
dotnet test backend/tests/Flow6/Aftercare.Tests.csproj
```

Không đổi tên hoặc di chuyển code Flow 1 dùng chung. Các artifact biên dịch cũ trong `bin`, `obj` và báo cáo test không phải source; không copy vào cấu trúc mới.
