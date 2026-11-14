using Domain.Entities;
using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
namespace Infrastructure.Data.Context
{
    public class HorseTransportDbContext : DbContext
    {
        public HorseTransportDbContext(DbContextOptions<HorseTransportDbContext> options)
            : base(options)
        {
        }

        // 1. Phân vùng Người dùng & Tài sản & Quy định
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Horse> Horses { get; set; } = null!;
        public DbSet<StaffDocument> StaffDocuments { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<PolicyAndTerm> PoliciesAndTerms { get; set; } = null!;
        public DbSet<BusinessPolicy> BusinessPolicies { get; set; } = null!;

        // 2. Phân vùng Đối tác & Trạm dừng / Y tế
        public DbSet<PartnerFacility> PartnerFacilities { get; set; } = null!;
        public DbSet<FacilityContract> FacilityContracts { get; set; } = null!;
        public DbSet<FacilityCertification> FacilityCertifications { get; set; } = null!;

        // 3. Phân vùng Yêu cầu & Pháp lý kiểm dịch
        public DbSet<TransportRequest> TransportRequests { get; set; } = null!;
        public DbSet<RequestHorseMapping> RequestHorseMappings { get; set; } = null!;
        public DbSet<LegalMedicalRecord> LegalMedicalRecords { get; set; } = null!;
        public DbSet<QuarantineBooking> QuarantineBookings { get; set; } = null!;

        // Flow 2: Pháp lý & Thẩm định chuyên sâu
        public DbSet<TripInsurance> TripInsurances { get; set; } = null!;
        public DbSet<DocumentRequest> DocumentRequests { get; set; } = null!;
        public DbSet<TripRequirementSet> TripRequirementSets { get; set; } = null!;
        public DbSet<TripCheckpointClearance> TripCheckpointClearances { get; set; } = null!;
        public DbSet<SpecialistAuditLog> SpecialistAuditLogs { get; set; } = null!;

        // 4. Phân vùng Lộ trình, Phương tiện & Hiện trường
        public DbSet<TripPlan> TripPlans { get; set; } = null!;
        public DbSet<Vehicle> Vehicles { get; set; } = null!;
        public DbSet<TripVehicleAssignment> TripVehicleAssignments { get; set; } = null!;
        public DbSet<RouteSegment> RouteSegments { get; set; } = null!;
        public DbSet<FlightBooking> FlightBookings { get; set; } = null!;
        public DbSet<CustomsClearance> CustomsClearances { get; set; } = null!;
        public DbSet<HealthLog> HealthLogs { get; set; } = null!;
        public DbSet<Incident> Incidents { get; set; } = null!;
        public DbSet<Handover> Handovers { get; set; } = null!;
        public DbSet<HandoverItem> HandoverItems { get; set; } = null!;

        // 5. Phân vùng Flow 3 v2 (Đối tác bay, Lịch bay, Đổi điểm nhận, Idempotency, Lịch sử, Chứng từ)
        public DbSet<AirPartner> AirPartners { get; set; } = null!;
        public DbSet<FlightCatalogItem> FlightCatalogs { get; set; } = null!;
        public DbSet<PickupRelocationProposal> PickupRelocations { get; set; } = null!;
        public DbSet<IdempotencyRecord> IdempotencyRecords { get; set; } = null!;
        public DbSet<TripPlanningHistory> TripPlanningHistories { get; set; } = null!;
        public DbSet<PlanningAttachment> PlanningAttachments { get; set; } = null!;

        // 6. Phân vùng Hợp đồng & Tài chính
        public DbSet<ContractTemplate> ContractTemplates { get; set; } = null!;
        public DbSet<Contract> Contracts { get; set; } = null!;
        public DbSet<CostItem> CostItems { get; set; } = null!;
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;

        // 7. Phân vùng Flow 4 (Hiện trường & Giám sát thực thi)
        public DbSet<TripMilestone> TripMilestones { get; set; } = null!;
        public DbSet<MilestoneCorrectionRequest> MilestoneCorrections { get; set; } = null!;
        public DbSet<EtaProposal> EtaProposals { get; set; } = null!;
        public DbSet<VetAssessment> VetAssessments { get; set; } = null!;
        public DbSet<TripExpense> TripExpenses { get; set; } = null!;
        public DbSet<AirNotice> AirNotices { get; set; } = null!;
        public DbSet<CheckpointDecision> CheckpointDecisions { get; set; } = null!;
        public DbSet<ExecutionAlert> ExecutionAlerts { get; set; } = null!;
        public DbSet<ExecutionContactLog> ExecutionContactLogs { get; set; } = null!;
        public DbSet<ExecutionAttachment> ExecutionAttachments { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Cấu hình composite primary key cho REQUEST_HORSE_MAPPING theo RULE/ID_NAME_RULE.md
            modelBuilder.Entity<RequestHorseMapping>()
                .HasKey(r => new { r.RequestId, r.HorseId });

            modelBuilder.Entity<BusinessPolicy>(b =>
            {
                b.ToTable("BUSINESS_POLICY");
                b.HasKey(x => x.PolicyId);
                b.Property(x => x.PolicyId).HasColumnName("PolicyID");
                b.Property(x => x.ScopeId).HasColumnName("ScopeID");
                b.Property(x => x.NumberValue).HasColumnType("decimal(18,2)");
            });

            // Tự động load các cấu hình IEntityTypeConfiguration nếu có
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(HorseTransportDbContext).Assembly,
                type => type.Namespace == "Infrastructure.Data.Configurations" ||
                    type.Namespace?.StartsWith("Infrastructure.Data.Configurations.", StringComparison.Ordinal) == true);

            // Mặc định DeleteBehavior là Restrict để tránh lỗi multiple cascade paths trong SQL Server
            foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            {
                relationship.DeleteBehavior = DeleteBehavior.Restrict;
            }
        }
    }
}
