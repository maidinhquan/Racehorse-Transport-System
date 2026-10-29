using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class PaymentsController(PaymentService payments) : EndpointController
{
    [HttpGet("customer/payments/{paymentId}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerPaymentAsync(string paymentId, CancellationToken ct) =>
        Reply(await payments.DetailAsync(Actor, paymentId, false, ct));

    [HttpGet("manager/payments/{paymentId}")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerPaymentAsync(string paymentId, CancellationToken ct) =>
        Reply(await payments.DetailAsync(Actor, paymentId, true, ct));

    [HttpGet("customer/requests/{requestId}/deposit")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> DepositAsync(string requestId, CancellationToken ct) =>
        Reply(await payments.DepositAsync(Actor, requestId, ct));

    [HttpPost("customer/invoices/{invoiceId}/payment-session")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> SessionAsync(string invoiceId, PaymentInput input, CancellationToken ct) =>
        Reply(await payments.SessionAsync(Actor, invoiceId, input.Method, HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1", ct), 201);

    [HttpPost("manager/payments/{paymentId}/cancel")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> CancelAsync(string paymentId, ReasonInput input, CancellationToken ct) =>
        Reply(await payments.CancelAsync(Actor, paymentId, input.Reason, ct));

    [HttpGet("manager/payments")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ListAsync(CancellationToken ct) =>
        Reply(await payments.ListAsync(Actor, ct));

    [HttpGet("customer/payments/{paymentId}/receipt")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> ReceiptAsync(string paymentId, CancellationToken ct) =>
        Reply(await payments.ReceiptAsync(Actor, paymentId, ct));

}
