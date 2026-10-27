using Application.DTOs;

namespace Application.Interfaces;

public interface IFlow1CustomerService
{
    Task<FormOptionsDto> GetFormOptionsAsync(string origin, string destination, string? mode);
    Task<CustomerTransportRequestDto> CreateRequestAsync(string customerId, TripInfoInput input);
    Task<List<CustomerTransportRequestDto>> GetCustomerRequestsAsync(string customerId);
    Task<CustomerTransportRequestDto?> GetRequestByIdAsync(string customerId, string requestId);
    Task<CustomerTransportRequestDto> SaveRequestAsync(string customerId, string requestId, CustomerSaveRequestDto input);
    Task<DocumentChecklistDto> GetDocumentChecklistAsync(string customerId, string requestId);
    Task<DocRecordDto> UploadHorseDocumentAsync(string customerId, string requestId, string horseId, string documentType, Stream fileStream, string fileName, string contentType);
    Task<CustomerTransportRequestDto> SubmitRequestAsync(string customerId, string requestId);
    Task<bool> CancelRequestAsync(string customerId, string requestId, string reason);

    // Hợp đồng & Ký số OTP
    Task<ContractResponseDto> GetContractAsync(string customerId, string requestId);
    Task<bool> AcceptTermsAsync(string customerId, string contractId, int versionNo);
    Task<bool> RequestContractFeedbackAsync(string customerId, string contractId, int versionNo, string text);
    Task<SignOtpResponseDto> SendSignOtpAsync(string customerId, string contractId, int versionNo);
    Task<SignContractResponseDto> SignContractAsync(string customerId, string contractId, int versionNo, string otp);

    // Tiền cọc & Phiên thanh toán VNPay
    Task<DepositInfoDto> GetDepositInfoAsync(string customerId, string requestId);
    Task<PaymentSessionResponseDto> CreatePaymentSessionAsync(string customerId, string invoiceId, string method, string clientIp);
}
