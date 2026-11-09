using System.ComponentModel.DataAnnotations;

namespace Application.Flow1.Dtos;

public sealed record RefundEvidenceInput(
    [Required, MaxLength(100)] string Reference, decimal Amount, DateTimeOffset RefundedAtUtc);
