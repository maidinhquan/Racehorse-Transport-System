using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Flow1;

// Scalar mappings of existing tables. No JSON, navigation payloads or new tables.

[Table("HORSE")]
public sealed class FlowHorse
{
    [Key]
    [Column("HorseID", TypeName = "varchar(50)")]
    public string HorseID { get; set; } = null!;
    [Column("OwnerID", TypeName = "varchar(50)")]
    public string OwnerID { get; set; } = null!;
    [Column("Microchip_ISO", TypeName = "varchar(50)")]
    public string Microchip_ISO { get; set; } = null!;
    [Column("FEI_Passport_No", TypeName = "varchar(50)")]
    public string? FEI_Passport_No { get; set; }
    [Column("Name", TypeName = "nvarchar(100)")]
    public string Name { get; set; } = null!;
    [Column("Breed", TypeName = "nvarchar(100)")]
    public string? Breed { get; set; }
    [Column("Sex", TypeName = "varchar(20)")]
    public string? Sex { get; set; }
    [Column("ReproductiveStatus", TypeName = "varchar(50)")]
    public string? ReproductiveStatus { get; set; }
    [Column("Weight", TypeName = "decimal(10,2)")]
    public decimal? Weight { get; set; }
    [Column("DOB", TypeName = "date")]
    public DateTime? DOB { get; set; }
    [Column("PhotoUrl", TypeName = "nvarchar(500)")]
    public string? PhotoUrl { get; set; }
    [Column("PassportScanUrl", TypeName = "nvarchar(500)")]
    public string? PassportScanUrl { get; set; }
    [Column("RowVersion", TypeName = "rowversion")]
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}

[Table("TRANSPORT_REQUEST")]
public sealed class FlowRequest
{
    [Key]
    [Column("RequestID", TypeName = "varchar(50)")]
    public string RequestID { get; set; } = null!;
    [Column("CustomerID", TypeName = "varchar(50)")]
    public string CustomerID { get; set; } = null!;
    [Column("Departure", TypeName = "nvarchar(255)")]
    public string Departure { get; set; } = null!;
    [Column("Destination", TypeName = "nvarchar(255)")]
    public string Destination { get; set; } = null!;
    [Column("Purpose", TypeName = "nvarchar(100)")]
    public string? Purpose { get; set; }
    [Column("TransportType", TypeName = "varchar(50)")]
    public string? TransportType { get; set; }
    [Column("ExpectedDate", TypeName = "datetime")]
    public DateTime? ExpectedDate { get; set; }
    [Column("CommittedDeadline", TypeName = "datetime")]
    public DateTime? CommittedDeadline { get; set; }
    [Column("DesignatedReceiverName", TypeName = "nvarchar(100)")]
    public string? DesignatedReceiverName { get; set; }
    [Column("DesignatedReceiverPhone", TypeName = "varchar(20)")]
    public string? DesignatedReceiverPhone { get; set; }
    [Column("BaseCost", TypeName = "decimal(12,2)")]
    public decimal? BaseCost { get; set; }
    [Column("Status", TypeName = "varchar(50)")]
    public string Status { get; set; } = null!;
    [Column("PickupLatitude", TypeName = "decimal(9,6)")]
    public decimal? PickupLatitude { get; set; }
    [Column("PickupLongitude", TypeName = "decimal(9,6)")]
    public decimal? PickupLongitude { get; set; }
    [Column("DeliveryLatitude", TypeName = "decimal(9,6)")]
    public decimal? DeliveryLatitude { get; set; }
    [Column("DeliveryLongitude", TypeName = "decimal(9,6)")]
    public decimal? DeliveryLongitude { get; set; }
    [Column("DistanceKm", TypeName = "decimal(10,2)")]
    public decimal? DistanceKm { get; set; }
    [Column("PickupContactName", TypeName = "nvarchar(100)")]
    public string? PickupContactName { get; set; }
    [Column("PickupContactPhone", TypeName = "varchar(20)")]
    public string? PickupContactPhone { get; set; }
    [Column("ManagerNotes", TypeName = "nvarchar(1000)")]
    public string? ManagerNotes { get; set; }
    [Column("OriginCountry", TypeName = "varchar(2)")]
    public string? OriginCountry { get; set; }
    [Column("DestinationCountry", TypeName = "varchar(2)")]
    public string? DestinationCountry { get; set; }
    [Column("PreparationDays", TypeName = "int")]
    public int? PreparationDays { get; set; }
    [Column("RowVersion", TypeName = "rowversion")]
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}

[Table("CONTRACT")]
public sealed class FlowContract
{
    [Key]
    [Column("ContractID", TypeName = "varchar(50)")]
    public string ContractID { get; set; } = null!;
    [Column("TripID", TypeName = "varchar(50)")]
    public string? TripID { get; set; }
    [Column("CustomerID", TypeName = "varchar(50)")]
    public string CustomerID { get; set; } = null!;
    [Column("ContractCode", TypeName = "varchar(50)")]
    public string ContractCode { get; set; } = null!;
    [Column("CurrencyCode", TypeName = "varchar(3)")]
    public string CurrencyCode { get; set; } = null!;
    [Column("ExchangeRateToLocal", TypeName = "decimal(10,4)")]
    public decimal? ExchangeRateToLocal { get; set; }
    [Column("TotalQuotedPrice", TypeName = "decimal(12,2)")]
    public decimal? TotalQuotedPrice { get; set; }
    [Column("BaseContractPrice_P", TypeName = "decimal(12,2)")]
    public decimal? BaseContractPrice_P { get; set; }
    [Column("DepositRateStandard", TypeName = "decimal(5,2)")]
    public decimal? DepositRateStandard { get; set; }
    [Column("ActualGrossProfit_AGP", TypeName = "decimal(12,2)")]
    public decimal? ActualGrossProfit_AGP { get; set; }
    [Column("SignedAt", TypeName = "datetime")]
    public DateTime? SignedAt { get; set; }
    [Column("ContractStatus", TypeName = "varchar(50)")]
    public string ContractStatus { get; set; } = null!;
    [Column("RequestID", TypeName = "varchar(50)")]
    public string RequestID { get; set; } = null!;
    [Column("CompletionDeadline", TypeName = "datetime2(7)")]
    public DateTime? CompletionDeadline { get; set; }
    [Column("PdfUrl", TypeName = "varchar(500)")]
    public string? PdfUrl { get; set; }
    [Column("SignOtpHash", TypeName = "varchar(255)")]
    public string? SignOtpHash { get; set; }
    [Column("SignOtpExpiry", TypeName = "datetime2(7)")]
    public DateTime? SignOtpExpiry { get; set; }
    [Column("SignOtpFailedAttempts", TypeName = "int")]
    public int SignOtpFailedAttempts { get; set; }
    [Column("DepositDeadline", TypeName = "datetime2(7)")]
    public DateTime? DepositDeadline { get; set; }
    [Column("DepositAmount", TypeName = "decimal(12,2)")]
    public decimal? DepositAmount { get; set; }
    [Column("PdfSha256", TypeName = "char(64)")]
    public string? PdfSha256 { get; set; }
    [Column("SignOtpSentAtUtc", TypeName = "datetime2(7)")]
    public DateTime? SignOtpSentAtUtc { get; set; }
    [Column("SignerEmail", TypeName = "varchar(255)")]
    public string? SignerEmail { get; set; }
    [Column("PublishedAtUtc", TypeName = "datetime2(7)")]
    public DateTime? PublishedAtUtc { get; set; }
    [Column("PublishedBy", TypeName = "varchar(50)")]
    public string? PublishedBy { get; set; }
    [Column("EffectiveSignDeadline", TypeName = "datetime2(7)")]
    public DateTime? EffectiveSignDeadline { get; set; }
    [Column("SignedDepositDeadline", TypeName = "datetime2(7)")]
    public DateTime? SignedDepositDeadline { get; set; }
    [Column("LastExtensionTarget", TypeName = "varchar(10)")]
    public string? LastExtensionTarget { get; set; }
    [Column("LastExtensionReason", TypeName = "nvarchar(1000)")]
    public string? LastExtensionReason { get; set; }
    [Column("LastExtensionBy", TypeName = "varchar(50)")]
    public string? LastExtensionBy { get; set; }
    [Column("LastExtensionAtUtc", TypeName = "datetime2(7)")]
    public DateTime? LastExtensionAtUtc { get; set; }
    [Column("CancellationId", TypeName = "varchar(50)")]
    public string? CancellationId { get; set; }
    [Column("CancellationStatus", TypeName = "varchar(12)")]
    public string? CancellationStatus { get; set; }
    [Column("CancellationReason", TypeName = "nvarchar(1000)")]
    public string? CancellationReason { get; set; }
    [Column("CancellationRequestedAtUtc", TypeName = "datetime2(7)")]
    public DateTime? CancellationRequestedAtUtc { get; set; }
    [Column("CancellationDecisionReason", TypeName = "nvarchar(1000)")]
    public string? CancellationDecisionReason { get; set; }
    [Column("CancellationDecidedBy", TypeName = "varchar(50)")]
    public string? CancellationDecidedBy { get; set; }
    [Column("CancellationDecidedAtUtc", TypeName = "datetime2(7)")]
    public DateTime? CancellationDecidedAtUtc { get; set; }
    [Column("IsCurrent", TypeName = "bit")]
    public bool IsCurrent { get; set; }
    [Column("RowVersion", TypeName = "rowversion")]
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}

[Table("PAYMENT")]
public sealed class FlowPayment
{
    [Key]
    [Column("PaymentID", TypeName = "varchar(50)")]
    public string PaymentID { get; set; } = null!;
    [Column("InvoiceID", TypeName = "varchar(50)")]
    public string InvoiceID { get; set; } = null!;
    [Column("ConfirmedByUserID", TypeName = "varchar(50)")]
    public string? ConfirmedByUserID { get; set; }
    [Column("CurrencyCode", TypeName = "varchar(3)")]
    public string CurrencyCode { get; set; } = null!;
    [Column("Amount", TypeName = "decimal(12,2)")]
    public decimal Amount { get; set; }
    [Column("Method", TypeName = "varchar(50)")]
    public string? Method { get; set; }
    [Column("TransactionCode", TypeName = "varchar(100)")]
    public string? TransactionCode { get; set; }
    [Column("Status", TypeName = "varchar(50)")]
    public string Status { get; set; } = null!;
    [Column("PaymentDate", TypeName = "datetime")]
    public DateTime PaymentDate { get; set; }
    [Column("VnpayBankCode", TypeName = "varchar(50)")]
    public string? VnpayBankCode { get; set; }
    [Column("VnpayResponseCode", TypeName = "varchar(10)")]
    public string? VnpayResponseCode { get; set; }
    [Column("VnpayTransactionStatus", TypeName = "varchar(10)")]
    public string? VnpayTransactionStatus { get; set; }
    [Column("VnpayTmnCode", TypeName = "varchar(8)")]
    public string? VnpayTmnCode { get; set; }
    [Column("VnpayCreatedAtUtc", TypeName = "datetime2(7)")]
    public DateTime? VnpayCreatedAtUtc { get; set; }
    [Column("VnpayExpiresAtUtc", TypeName = "datetime2(7)")]
    public DateTime? VnpayExpiresAtUtc { get; set; }
    [Column("VnpayReceivedAmount", TypeName = "decimal(12,2)")]
    public decimal? VnpayReceivedAmount { get; set; }
    [Column("FinancialReviewRequired", TypeName = "bit")]
    public bool FinancialReviewRequired { get; set; }
    [Column("FinancialReviewReason", TypeName = "nvarchar(1000)")]
    public string? FinancialReviewReason { get; set; }
    [Column("FinancialReviewedBy", TypeName = "varchar(50)")]
    public string? FinancialReviewedBy { get; set; }
    [Column("FinancialReviewedAtUtc", TypeName = "datetime2(7)")]
    public DateTime? FinancialReviewedAtUtc { get; set; }
    [Column("RowVersion", TypeName = "rowversion")]
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}

[Table("TRIP_PLAN")]
public sealed class FlowTrip
{
    [Key]
    [Column("TripID", TypeName = "varchar(50)")]
    public string TripID { get; set; } = null!;
    [Column("RequestID", TypeName = "varchar(50)")]
    public string RequestID { get; set; } = null!;
    [Column("TotalDistance_km", TypeName = "decimal(10,2)")]
    public decimal? TotalDistance_km { get; set; }
    [Column("T_Total_Hours", TypeName = "decimal(10,2)")]
    public decimal? T_Total_Hours { get; set; }
    [Column("TotalCost", TypeName = "decimal(12,2)")]
    public decimal? TotalCost { get; set; }
    [Column("Status", TypeName = "varchar(50)")]
    public string Status { get; set; } = null!;
    [Column("DeploymentStatus", TypeName = "varchar(12)")]
    public string? DeploymentStatus { get; set; }
    [Column("DeploymentReason", TypeName = "nvarchar(1000)")]
    public string? DeploymentReason { get; set; }
    [Column("DeploymentBy", TypeName = "varchar(50)")]
    public string? DeploymentBy { get; set; }
    [Column("DeploymentAtUtc", TypeName = "datetime2(7)")]
    public DateTime? DeploymentAtUtc { get; set; }
    [Column("HandoffEventId", TypeName = "varchar(50)")]
    public string? HandoffEventId { get; set; }
    [Column("RoutingAcknowledgedBy", TypeName = "varchar(50)")]
    public string? RoutingAcknowledgedBy { get; set; }
    [Column("RoutingAcknowledgedAtUtc", TypeName = "datetime2(7)")]
    public DateTime? RoutingAcknowledgedAtUtc { get; set; }
    [Column("DocumentsAcknowledgedBy", TypeName = "varchar(50)")]
    public string? DocumentsAcknowledgedBy { get; set; }
    [Column("DocumentsAcknowledgedAtUtc", TypeName = "datetime2(7)")]
    public DateTime? DocumentsAcknowledgedAtUtc { get; set; }
    [Column("RowVersion", TypeName = "rowversion")]
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}

[Table("INVOICE")]
public sealed class FlowInvoice
{
    [Key]
    [Column("InvoiceID", TypeName = "varchar(50)")]
    public string InvoiceID { get; set; } = null!;
    [Column("ContractID", TypeName = "varchar(50)")]
    public string ContractID { get; set; } = null!;
    [Column("InvoiceType", TypeName = "varchar(50)")]
    public string? InvoiceType { get; set; }
    [Column("CurrencyCode", TypeName = "varchar(3)")]
    public string CurrencyCode { get; set; } = null!;
    [Column("TotalPayableAmount", TypeName = "decimal(12,2)")]
    public decimal TotalPayableAmount { get; set; }
    [Column("PaidAmount", TypeName = "decimal(12,2)")]
    public decimal PaidAmount { get; set; }
    [Column("DueDate", TypeName = "datetime")]
    public DateTime? DueDate { get; set; }
    [Column("PaymentStatus", TypeName = "varchar(50)")]
    public string PaymentStatus { get; set; } = null!;
}

[Table("REQUEST_HORSE_MAPPING")]
public sealed class FlowRequestHorse
{
    [Key]
    [Column("RequestHorseID", TypeName = "varchar(50)")]
    public string RequestHorseID { get; set; } = null!;
    [Column("RequestID", TypeName = "varchar(50)")]
    public string RequestID { get; set; } = null!;
    [Column("HorseID", TypeName = "varchar(50)")]
    public string HorseID { get; set; } = null!;
}

[Table("NOTIFICATION")]
public sealed class FlowNotice
{
    [Key]
    [Column("NotificationID", TypeName = "varchar(50)")]
    public string NotificationID { get; set; } = null!;
    [Column("UserID", TypeName = "varchar(50)")]
    public string UserID { get; set; } = null!;
    [Column("ReferenceID", TypeName = "varchar(50)")]
    public string? ReferenceID { get; set; }
    [Column("Type", TypeName = "varchar(50)")]
    public string? Type { get; set; }
    [Column("Channel", TypeName = "varchar(50)")]
    public string? Channel { get; set; }
    [Column("Title", TypeName = "nvarchar(200)")]
    public string? Title { get; set; }
    [Column("Message", TypeName = "nvarchar(max)")]
    public string? Message { get; set; }
    [Column("IsRead", TypeName = "bit")]
    public bool IsRead { get; set; }
    [Column("SentAt", TypeName = "datetime")]
    public DateTime SentAt { get; set; }
}

[Table("USER")]
public sealed class FlowUser
{
    [Key]
    [Column("UserID", TypeName = "varchar(50)")]
    public string UserID { get; set; } = null!;
    [Column("Username", TypeName = "varchar(50)")]
    public string? Username { get; set; }
    [Column("PasswordHash", TypeName = "varchar(255)")]
    public string PasswordHash { get; set; } = null!;
    [Column("Role", TypeName = "varchar(50)")]
    public string Role { get; set; } = null!;
    [Column("FullName", TypeName = "nvarchar(100)")]
    public string FullName { get; set; } = null!;
    [Column("Email", TypeName = "varchar(100)")]
    public string? Email { get; set; }
    [Column("Phone", TypeName = "varchar(20)")]
    public string? Phone { get; set; }
    [Column("ForgotPasswordRequest", TypeName = "nvarchar(500)")]
    public string? ForgotPasswordRequest { get; set; }
    [Column("ResetPasswordRequest", TypeName = "nvarchar(500)")]
    public string? ResetPasswordRequest { get; set; }
    [Column("ResetOtpCode", TypeName = "varchar(10)")]
    public string? ResetOtpCode { get; set; }
    [Column("ResetOtpExpiry", TypeName = "datetime2")]
    public DateTime? ResetOtpExpiry { get; set; }
    [Column("IsActive", TypeName = "bit")]
    public bool IsActive { get; set; }
}
