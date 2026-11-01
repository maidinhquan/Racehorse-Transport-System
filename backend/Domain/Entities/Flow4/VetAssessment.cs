using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("VET_ASSESSMENT")]
public class VetAssessment
{
    [Key]
    [Column("AssessmentID")]
    [StringLength(50)]
    public string AssessmentId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("HorseID")]
    [StringLength(50)]
    public string HorseId { get; set; } = null!;

    [Column("VetID")]
    [StringLength(50)]
    public string VetId { get; set; } = null!;

    [Column("HealthLogID")]
    [StringLength(50)]
    public string? HealthLogId { get; set; }

    [Column("TransportFitness")]
    [StringLength(20)]
    public string TransportFitness { get; set; } = "FIT"; // FIT, NOT_FIT, NEEDS_REVIEW

    [Column("Conclusion")]
    public string Conclusion { get; set; } = null!;

    [Column("CareInstructions")]
    public string? CareInstructions { get; set; }

    [Column("EvidenceFileIds")]
    public string? EvidenceFileIds { get; set; }

    [Column("IncidentID")]
    [StringLength(50)]
    public string? IncidentId { get; set; }

    [Column("AssessedAt")]
    public DateTime AssessedAt { get; set; }

    [Column("RecordedAt")]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(HorseId))]
    public virtual Horse? Horse { get; set; }

    [ForeignKey(nameof(VetId))]
    public virtual User? VetUser { get; set; }

    [ForeignKey(nameof(HealthLogId))]
    public virtual HealthLog? HealthLog { get; set; }
}

