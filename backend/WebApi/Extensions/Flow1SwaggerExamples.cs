using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Writers;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace WebApi.Extensions;

public sealed class Flow1SwaggerExamples : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var path = context.ApiDescription.RelativePath ?? "";
        if (!path.StartsWith("api/manager", StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith("api/customer", StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith("api/operations/flow1", StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith("api/public/estimates", StringComparison.OrdinalIgnoreCase))
            return;

        operation.Description = (operation.Description ?? "") +
            "\nFlow 1: Get the current record first and copy its `version` (a concurrency token, not a contract edition). Use the signed-in account's role. One shared 24-hour deadline covers deposit, verification and OTP signing. Deposit verification alone never creates a Trip.";

        if (path.Contains("contracts", StringComparison.OrdinalIgnoreCase))
            operation.Description += " One stored CompletionDeadline covers deposit and signing; response signDeadline/depositDeadline are aliases of it. One contract per request, updated in place; no isCurrent flag.";

        if (path.StartsWith("api/customer/horses", StringComparison.OrdinalIgnoreCase))
            operation.Description += " Horse profile owns passport metadata, declaredValueVnd and specialHealthNotes. POST creates, PUT updates an unused owned horse using version. Creation/full update require photo, passportScan and ownershipCertificate; valuationDocument is optional. File kinds: photo/passport/ownership/valuation. UPLOADED is not approval. No vaccination, trip health certificate or private veterinarian required before signing.";
        if (path.StartsWith("api/customer/requests", StringComparison.OrdinalIgnoreCase))
            operation.Description += " PickupContact/receiver accept stableName, postalCode and instructions. careInstructions is trip-wide; horses[].careInstructions is per horse for this trip. specialHealthNotes belongs to the horse profile. DeclaredValueVnd is calculated by the server from selected horses; legacy declaredValueUsd is not converted or used as VND. Shared documents are optional and returned separately in sharedDocuments (UPLOADED/NOT_PROVIDED), never marked verified automatically.";

        if (operation.RequestBody?.Content.TryGetValue("multipart/form-data", out var multipart) == true)
        {
            var schema = multipart.Schema;
            if (schema.Reference is not null) schema = context.SchemaRepository.Schemas[schema.Reference.Id];
            var horseForm = path.Contains("/horses", StringComparison.OrdinalIgnoreCase);
            var payload = horseForm ? CreateHorseExample() : CreateFlowRequestExample();
            var property = schema.Properties.FirstOrDefault(p => p.Key.Equals("payload", StringComparison.OrdinalIgnoreCase)).Value;
            if (property is not null)
            {
                using var text = new StringWriter();
                var writer = new OpenApiJsonWriter(text);
                payload.Write(writer, Microsoft.OpenApi.OpenApiSpecVersion.OpenApi3_0);
                property.Example = new OpenApiString(text.ToString());
                property.Description = "JSON text. Replace IDs/version with values from GET; file bytes belong in the separate file fields.";
            }
            operation.Description += horseForm ? " Each file: genuine PNG/JPEG/PDF (photo: PNG/JPEG only), 16 bytes–5 MB. Full horse payload example is in payload."
                : " invitationLetter/competitionRegistration/ataCarnet are separate optional single-file fields for the entire request, not linked to a horse. Files/horseIds are the existing per-horse supplementary uploads. Each file is 16 bytes–5 MB, genuine PDF/PNG/JPEG. Omitted shared files are retained during revision; supplied files replace them. Read via requests/{id}/documents/INVITATION_LETTER, COMPETITION_REGISTRATION or ATA_CARNET.";
        }

        var action = operation.Parameters?.FirstOrDefault(p => p.Name == "operation");
        if (action is not null && path.Contains("/cancellation/"))
            action.Schema.Enum = new[] { "approve", "reject", "refund-start", "refund-complete" }
                .Select(x => (IOpenApiAny)new OpenApiString(x)).ToList();

        if (path.Equals("api/customer/requests", StringComparison.OrdinalIgnoreCase) ||
            path.Contains("/with-documents", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith("/contracts", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith("/vnpay", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith("/revision", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith("/horses", StringComparison.OrdinalIgnoreCase))
        {
            operation.Parameters ??= new List<OpenApiParameter>();
            if (!operation.Parameters.Any(p => p.Name.Equals("Idempotency-Key", StringComparison.OrdinalIgnoreCase)))
            {
                operation.Parameters.Add(new OpenApiParameter
                {
                    Name = "Idempotency-Key",
                    In = ParameterLocation.Header,
                    Required = true,
                    Description = "Required idempotency key (8-100 ASCII letters, digits, underscores, or hyphens).",
                    Schema = new OpenApiSchema { Type = "string", Example = new OpenApiString("idemp-flow1-key-001") }
                });
            }
        }

        foreach (var code in new[] { "400", "401", "403", "404", "409", "429", "503" })
            operation.Responses.TryAdd(code, new OpenApiResponse
            {
                Description = code switch
                {
                    "400" => "Invalid fields; check errors/errorCode.",
                    "401" => "Login and authorize with the accessToken.",
                    "403" => "Wrong role or assignment.",
                    "404" => "Resource unavailable to this account.",
                    "409" => "Business guard or stale version; reload the record.",
                    "429" => "Rate limit; retry after Retry-After.",
                    _ => "Required provider/configuration/schema unavailable."
                }
            });

        if (operation.RequestBody?.Content.TryGetValue("application/json", out var media) != true)
            return;

        if (path.Equals("api/public/estimates/demo",StringComparison.OrdinalIgnoreCase))
        {
            media!.Example=new OpenApiObject { ["origin"]=new OpenApiString("Ho Chi Minh City"),["destination"]=new OpenApiString("Tokyo"),["horseCount"]=new OpenApiInteger(1) };
            operation.Description+=" Uses configured city centres/average road factor, no map provider calls and no saved demo rows. Returns total only, no internal breakdown. Missing insured value uses minimum insurance. AIR excludes unprovided ground legs.";
            return;
        }
        if (path.Contains("/cost-rates/",StringComparison.OrdinalIgnoreCase))
        {
            media!.Example=new OpenApiObject { ["version"]=new OpenApiString("COPY_version_FROM_GET_manager_cost_rates"),["rate"]=new OpenApiDouble(200000),["isActive"]=new OpenApiBoolean(true) };
            operation.Description+=" Required rates stay active. INSURANCE_RATE uses a fraction: 0.005 means 0.5%, a project assumption, not a real insurer quote. Existing contract cost rows are not recalculated.";
            return;
        }
        if (path.EndsWith("/cost-estimate",StringComparison.OrdinalIgnoreCase))
        {
            media!.Example=new OpenApiObject { ["days"]=new OpenApiInteger(2),["stableNights"]=new OpenApiInteger(1),["crewCount"]=new OpenApiInteger(2),["doctorCount"]=new OpenApiInteger(1),["insuredValueVnd"]=new OpenApiLong(1000000000) };
            operation.Description+=" Manager-only five-group plan. {} uses request duration, nights=days-1, configured staffing and the request's server-calculated declaredValueVnd for insurance. Manager can override insuredValueVnd. RoadDistanceKm/VehicleCount can specify additional ground legs for AIR. No costs are saved by this endpoint. Copy costs into draft/reissue to store the chosen plan. DeclaredValueUsd is not treated as VND.";
            return;
        }

        if (path.EndsWith("/estimates", StringComparison.OrdinalIgnoreCase) || path.Equals("api/public/estimates", StringComparison.OrdinalIgnoreCase))
        {
            media!.Example = CreateTripExample();
            return;
        }

        if (path.Equals("api/customer/requests", StringComparison.OrdinalIgnoreCase))
        {
            media!.Example = CreateFlowRequestExample();
            return;
        }

        if (path.EndsWith("/revision", StringComparison.OrdinalIgnoreCase))
        {
            media!.Example = new OpenApiObject
            {
                ["version"] = new OpenApiString("COPY_version_FROM_GET_requests_id"),
                ["input"] = CreateFlowRequestExample()
            };
            return;
        }

        OpenApiObject body = new()
        {
            ["version"] = new OpenApiString("COPY_version_FROM_GET"),
            ["reason"] = new OpenApiString("Confirmed by responsible Manager")
        };

        if (path.EndsWith("/clauses", StringComparison.OrdinalIgnoreCase) || path.Contains("/clauses/", StringComparison.OrdinalIgnoreCase))
        {
            body = new()
            {
                ["title"] = new OpenApiString("Điều kiện vận chuyển"),
                ["content"] = new OpenApiString("Hai bên thực hiện vận chuyển theo lịch và giá trong hợp đồng."),
                ["languageCode"] = new OpenApiString("VI"),
                ["isActive"] = new OpenApiBoolean(true)
            };
        }
        else if (path.EndsWith("/feedback", StringComparison.OrdinalIgnoreCase))
        {
            body = new()
            {
                ["version"] = new OpenApiString("COPY_version_FROM_GET"),
                ["feedbackMessage"] = new OpenApiString("Đề nghị điều chỉnh giá và lịch đón/giao."),
                ["fields"] = new OpenApiArray { new OpenApiString("PRICE"), new OpenApiString("DEPARTURE_AT"), new OpenApiString("DELIVERY_AT") }
            };
        }
        else if (path.EndsWith("/feedback/reject", StringComparison.OrdinalIgnoreCase))
        {
            body["reason"] = new OpenApiString("Price includes all transport and care services; terms cannot be lowered.");
        }
        else if (path.EndsWith("/publish", StringComparison.OrdinalIgnoreCase))
        {
            body.Remove("reason");
            body["clauseIds"] = new OpenApiArray();
            body["additionalClauses"] = new OpenApiArray { new OpenApiString("Điều khoản bổ sung do Manager nhập, chỉ lưu trong PDF.") };
            operation.Description += " All twelve required catalogue clauses are included automatically, even when clauseIds is omitted or empty. Additional text is stored only in the issued PDF. GET /contracts/{id}/terms returns the exact terms from that PDF.";
        }
        else if (path.Contains("/deployment/", StringComparison.OrdinalIgnoreCase))
        {
            body["assignedSpecialistId"] = new OpenApiString("COPY_userId_FROM_manager_staff_operational");
            body["assignedCoordinatorId"] = new OpenApiString("COPY_userId_FROM_manager_staff_operational");
            operation.Description += "\nFor deployment use trip.version, not contract.version.";
        }
        else if (path.EndsWith("/otp", StringComparison.OrdinalIgnoreCase) || path.EndsWith("/sign", StringComparison.OrdinalIgnoreCase))
        {
            body.Remove("reason");
            body["pdfSha256"] = new OpenApiString("COPY_pdfSha256_FROM_GET");
            if (path.EndsWith("/sign", StringComparison.OrdinalIgnoreCase))
                body["otp"] = new OpenApiString("COPY_6_digit_code_FROM_EMAIL");
        }
        else if (path.EndsWith("/contracts", StringComparison.OrdinalIgnoreCase))
        {
            body.Remove("reason");
            body["price"] = new OpenApiLong(100000000);
            body["depositRate"] = new OpenApiDouble(40);
            body["preparationDays"] = new OpenApiInteger(2);
            operation.Description += " Draft uses request.version. Optional depositRate is a percentage > 0 and <= 100 with at most two decimal places (30 means 30%); defaults to 40. It must yield a positive whole-VND deposit. Optional costs contains transport, crew, permit, vet, insurance in integral VND; omitted costs are calculated from request quantities and database rates, with minimum insurance when VND insured value is unknown. Omit price to use costs.total, or provide the Manager's final price. Five planned COST_ITEM rows are saved. No margin or reserve. The issue deadline is calculated by the server, not supplied by the client.";
        }
        else if (path.EndsWith("/reissue", StringComparison.OrdinalIgnoreCase))
        {
            operation.Description += " Optional depositRate keeps the existing percentage when omitted. Changing it recalculates the invoice/PDF before payment only. During feedback, a deposit-rate change requires PRICE in the requested fields.";
            body["price"] = new OpenApiLong(95000000);
            body["depositRate"] = new OpenApiDouble(30);
            body["preparationDays"] = new OpenApiInteger(2);
            body["departureAt"] = new OpenApiString("2026-12-20T08:00:00+07:00");
            body["deliveryAt"] = new OpenApiString("2026-12-21T08:00:00+07:00");
            body["clauseIds"] = new OpenApiArray();
            body["additionalClauses"] = new OpenApiArray { new OpenApiString("Điều khoản bổ sung sau khi thống nhất với khách hàng.") };
            body["reason"] = new OpenApiString("Agreed revised terms following feedback");
            operation.Description += " The twelve required clauses cannot be removed. Omit additionalClauses to retain the issued PDF's additional terms; send [] to remove them where clause edits are allowed. Optional costs replaces the five planned VND cost rows; omitted costs are recalculated for the revised schedule using current rates. Signed contracts and unresolved payments cannot be reissued.";
        }
        else if (path.EndsWith("/extend", StringComparison.OrdinalIgnoreCase))
        {
            body["deadline"] = new OpenApiString("2026-12-10T08:00:00+07:00");
            body["reason"] = new OpenApiString("Customer requested additional time for banking clearance");
            operation.Description += " This extends the ONE shared deadline; payment and signing do not get separate windows.";
        }
        else if (path.EndsWith("/cancel-overdue", StringComparison.OrdinalIgnoreCase))
        {
            body["reason"] = new OpenApiString("Deposit and signing deadline expired without confirmation");
        }
        else if (path.EndsWith("/withdraw", StringComparison.OrdinalIgnoreCase))
        {
            body["reason"] = new OpenApiString("Manager withdrew draft before final agreement");
        }
        else if (path.Contains("/payments/") && path.EndsWith("/review", StringComparison.OrdinalIgnoreCase))
        {
            body["version"] = new OpenApiString("COPY_payment.version_FROM_GET");
            body["reason"] = new OpenApiString("Verified bank payment confirmation");
        }
        else if (path.Contains("/payments/") && path.EndsWith("/query", StringComparison.OrdinalIgnoreCase))
        {
            body["version"] = new OpenApiString("COPY_payment.version_FROM_GET");
            body["reason"] = new OpenApiString("Reconciled with payment gateway record");
        }
        else if (!path.Contains("/contracts/", StringComparison.OrdinalIgnoreCase) && !path.Contains("/requests/", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (path.Contains("/cancellation/", StringComparison.OrdinalIgnoreCase))
        {
            if (!path.EndsWith("/cancellation/request", StringComparison.OrdinalIgnoreCase))
            {
                body["cancellationId"] = new OpenApiString("COPY_cancellationId_FROM_GET");
            }
            if (action is not null)
            {
                body["target"] = new OpenApiString("VERIFIED_BANK_REFUND_REFERENCE");
                operation.Description += " For refund-complete, target must contain the verified refund reference. This records a refund performed separately; it does not transfer money.";
            }
        }


        media!.Example = body;
    }

    private static OpenApiObject CreateTripExample() => new()
    {
        ["pickup"] = new OpenApiObject
        {
            ["address"] = new OpenApiString("Trường đua Đại Nam, Bình Dương"),
            ["lat"] = new OpenApiDouble(11.0425),
            ["lng"] = new OpenApiDouble(106.6285),
            ["country"] = new OpenApiString("VN")
        },
        ["delivery"] = new OpenApiObject
        {
            ["address"] = new OpenApiString("Trung tâm Thể thao Ngựa, Hà Nội"),
            ["lat"] = new OpenApiDouble(21.0285),
            ["lng"] = new OpenApiDouble(105.8542),
            ["country"] = new OpenApiString("VN")
        },
        ["preferredTransportMode"] = new OpenApiString("ROAD"),
        ["horseCount"] = new OpenApiInteger(1),
        ["desiredDepartureDate"] = new OpenApiString("2026-11-25")
    };

    private static OpenApiObject CreateHorseExample() => new()
    {
        ["name"] = new OpenApiString("Thunderbolt"), ["microchipIso"] = new OpenApiString("985112004571029"),
        ["feiPassportNo"] = new OpenApiString("VN-EQ-2020-1029"), ["breed"] = new OpenApiString("Thoroughbred"),
        ["sex"] = new OpenApiString("STALLION"), ["weight"] = new OpenApiInteger(500), ["dob"] = new OpenApiString("2020-03-14"),
        ["passportIssuedBy"] = new OpenApiString("Vietnam Equestrian Federation"),
        ["passportIssuedDate"] = new OpenApiString("2023-04-10"), ["passportExpiryDate"] = new OpenApiString("2028-04-09"),
        ["declaredValueVnd"] = new OpenApiLong(1000000000), ["specialHealthNotes"] = new OpenApiString("Nhạy cảm với tiếng ồn lớn")
    };
    private static OpenApiObject CreateFlowRequestExample() => new()
    {
        ["trip"] = CreateTripExample(),
        ["departureAt"] = new OpenApiString("2026-11-25T08:00:00+07:00"),
        ["deliveryAt"] = new OpenApiString("2026-11-27T16:00:00+07:00"),
        ["purpose"] = new OpenApiString("Vận chuyển thi đấu giải quốc gia"),
        ["pickupContact"] = new OpenApiObject
        {
            ["name"] = new OpenApiString("Nguyen Van A"),
            ["phone"] = new OpenApiString("0901234567"), ["stableName"] = new OpenApiString("Chuồng Đại Nam"),
            ["postalCode"] = new OpenApiString("75000"), ["instructions"] = new OpenApiString("Đón tại cổng phía Bắc")
        },
        ["receiver"] = new OpenApiObject
        {
            ["name"] = new OpenApiString("Tran Van B"),
            ["phone"] = new OpenApiString("0987654321"), ["stableName"] = new OpenApiString("Chuồng nơi giao"),
            ["postalCode"] = new OpenApiString("10000"), ["instructions"] = new OpenApiString("Gọi trước khi đến")
        },
        ["horses"] = new OpenApiArray
        {
            new OpenApiObject
            {
                ["horseId"] = new OpenApiString("COPY_horseId_FROM_GET_horses_selectable"),
                ["version"] = new OpenApiString("COPY_version_FROM_GET_horses_selectable"),
                ["careInstructions"] = new OpenApiString("Cho ăn theo lịch đã thống nhất trong chuyến")
            }
        },
        ["careInstructions"] = new OpenApiString("Giữ không gian yên tĩnh")
    };
}
