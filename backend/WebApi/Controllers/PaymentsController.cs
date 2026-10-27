using Application.DTOs;
using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace WebApi.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IInvoiceDAO _invoiceDao;
    private readonly IPaymentDAO _paymentDao;
    private readonly IContractDAO _contractDao;
    private readonly ITransportRequestDAO _requestDao;
    private readonly ITripPlanDAO _tripPlanDao;
    private readonly HorseTransportDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IInvoiceDAO invoiceDao,
        IPaymentDAO paymentDao,
        IContractDAO contractDao,
        ITransportRequestDAO requestDao,
        ITripPlanDAO tripPlanDao,
        HorseTransportDbContext context,
        IConfiguration config,
        ILogger<PaymentsController> logger)
    {
        _invoiceDao = invoiceDao;
        _paymentDao = paymentDao;
        _contractDao = contractDao;
        _requestDao = requestDao;
        _tripPlanDao = tripPlanDao;
        _context = context;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// IPN Webhook từ cổng VNPay Sandbox
    /// </summary>
    [HttpGet("vnpay/ipn")]
    public async Task<IActionResult> VnpayIpn()
    {
        var parameters = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString());
        var gateway = new Infrastructure.ExternalServices.Vnpay.VnpayGateway(_config);

        if (!gateway.Verify(parameters))
        {
            _logger.LogWarning("IPN VNPay chữ ký không hợp lệ");
            return Ok(new { RspCode = "97", Message = "Invalid Checksum" });
        }

        var responseCode = parameters.GetValueOrDefault("vnp_ResponseCode", "");
        var transactionStatus = parameters.GetValueOrDefault("vnp_TransactionStatus", "");
        var txnRef = parameters.GetValueOrDefault("vnp_TxnRef", "");
        var amountStr = parameters.GetValueOrDefault("vnp_Amount", "0");

        if (responseCode == "00" && transactionStatus == "00")
        {
            // Tìm Invoice gần nhất hoặc đang UNPAID
            var invoice = await _context.Invoices
                .Include(i => i.Contract)
                .OrderByDescending(i => i.DueDate)
                .FirstOrDefaultAsync(i => i.PaymentStatus != "PAID");

            if (invoice != null)
            {
                invoice.PaymentStatus = "PAID";
                invoice.PaidAmount = invoice.TotalPayableAmount;
                await _invoiceDao.UpdateAsync(invoice);

                var payment = new Payment
                {
                    PaymentId = $"PAY_{Guid.NewGuid().ToString()[..8].ToUpperInvariant()}",
                    InvoiceId = invoice.InvoiceId,
                    CurrencyCode = "VND",
                    Amount = invoice.TotalPayableAmount,
                    Method = "VNPAY",
                    TransactionCode = txnRef,
                    Status = "SUCCESS",
                    PaymentDate = DateTime.UtcNow
                };
                await _paymentDao.AddAsync(payment);

                if (invoice.Contract != null)
                {
                    invoice.Contract.ContractStatus = "DEPOSIT_VERIFIED";
                    await _contractDao.UpdateAsync(invoice.Contract);

                    var trip = await _tripPlanDao.GetByIdAsync(invoice.Contract.TripId);
                    if (trip != null)
                    {
                        var req = await _requestDao.GetByIdAsync(trip.RequestId);
                        if (req != null)
                        {
                            req.Status = "DEPOSIT_VERIFIED";
                            await _requestDao.UpdateAsync(req);
                        }
                    }
                }

                _logger.LogInformation("Xử lý IPN thanh toán cọc thành công cho hóa đơn {InvoiceId}", invoice.InvoiceId);
            }

            return Ok(new { RspCode = "00", Message = "Confirm Success" });
        }

        return Ok(new { RspCode = "00", Message = "Confirm Success (Transaction Not Paid)" });
    }

    /// <summary>
    /// Return URL hiển thị sau khi khách hàng thanh toán xong trên cổng VNPay
    /// </summary>
    [HttpGet("vnpay/return")]
    public IActionResult VnpayReturn()
    {
        var parameters = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString());
        var gateway = new Infrastructure.ExternalServices.Vnpay.VnpayGateway(_config);
        var isValid = gateway.Verify(parameters);

        var responseCode = parameters.GetValueOrDefault("vnp_ResponseCode", "");
        var isSuccess = isValid && responseCode == "00";

        var returnUrl = isSuccess ? "/customer/requests?payment=success" : "/customer/requests?payment=fail";
        return Redirect(returnUrl);
    }
}
