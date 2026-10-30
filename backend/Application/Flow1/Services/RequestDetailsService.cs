using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;

namespace Application.Flow1.Services;

public sealed class RequestDetailsService(IDataSession data, AccessService access)
{
    public async Task<object> GetAsync(string actor, string id, bool manager, CancellationToken ct)
    {
        var request = await access.RequestAsync(id, actor, manager, ct);
        var links = await data.ListAsync<RequestHorse>(x => x.RequestID == id, ct);
        var view = JsonSerializer.SerializeToNode(RequestMapper.View(request, links))!.AsObject();
        var contract = (await data.ListAsync<Contract>(x => x.RequestID == id, ct)).SingleOrDefault();
        var versions = contract is null ? [] : await data.ListAsync<ContractVersion>(x => x.ContractID == contract.ContractID && (manager || x.PublishedAtUtc != null), ct);
        view["versions"] = JsonSerializer.SerializeToNode(versions.OrderBy(x => x.VersionNo).Select(x => ContractMapper.View(contract!, x, request)));
        var invoices = contract is null ? [] : await data.ListAsync<Invoice>(x => x.ContractID == contract.ContractID, ct);
        var invoiceIds = invoices.Select(x => x.InvoiceID).ToArray();
        var payments = await data.ListAsync<Payment>(x => invoiceIds.Contains(x.InvoiceID), ct);
        view["payments"] = JsonSerializer.SerializeToNode(payments.Select(x => new
        {
            id = x.PaymentID, invoiceId = x.InvoiceID, amount = x.Amount, currency = x.CurrencyCode,
            method = x.Method, status = x.Status, receivedAmount = x.VnpayReceivedAmount,
            paidAt = x.VnpayReceivedAmount is null ? null : x.PaymentDate.ToString("yyyy-MM-dd HH:mm"),
            reviewRequired = x.FinancialReviewRequired, expiresAt = x.VnpayExpiresAtUtc?.ToString("yyyy-MM-dd HH:mm")
        }));
        var horseIds = links.Select(x => x.HorseID).ToArray();
        var horses = await data.ListAsync<Horse>(x => horseIds.Contains(x.HorseID), ct);
        var docs = new List<object>();
        foreach (var horse in horses)
        foreach (var file in new[] { (Kind: "photo", Key: horse.PhotoUrl), (Kind: "passport", Key: horse.PassportScanUrl),
            (Kind: "ownership", Key: horse.OwnershipCertificateFileUrl), (Kind: "value-proof", Key: horse.ValuationDocumentFileUrl) })
            docs.Add(new { key = file.Kind, scope = horse.HorseID, status = file.Key is null ? "MISSING" : "SUBMITTED",
                file = file.Key is null ? null : new { url = ProfileUrl(id, horse.HorseID, file.Kind, manager) } });
        var medical = await data.ListAsync<MedicalRecord>(x => x.RequestID == id && horseIds.Contains(x.HorseID), ct);
        docs.AddRange(medical.Select(x => (object)new { key = x.DocumentType, scope = x.HorseID, recordId = x.RecordID,
            status = x.DocumentStatus, expiryDate = x.ExpiryDate?.ToString("yyyy-MM-dd"),
            file = x.UploadedFileUrl is null ? null : new { url = $"/api/{(manager ? "manager" : "customer")}/requests/{id}/documents/{x.RecordID}" } }));
        view[manager ? "dossier" : "docs"] = JsonSerializer.SerializeToNode(docs);
        view["contractFeedback"] = contract is null ? null : JsonSerializer.SerializeToNode(new
        {
            text = contract.CustomerFeedback, status = contract.FeedbackStatus, managerReply = contract.ManagerFeedback,
            receivedAt = contract.FeedbackAtUtc, handledAt = contract.FeedbackHandledAtUtc
        });
        return view;
    }
    private static string ProfileUrl(string request, string horse, string kind, bool manager) => manager
        ? $"/api/manager/requests/{request}/horses/{horse}/documents/{kind}/file"
        : $"/api/customer/horses/{horse}/files/{kind}";
}
