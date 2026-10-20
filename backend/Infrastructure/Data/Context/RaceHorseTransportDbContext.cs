using Domain.Entities;
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

        // 2. Phân vùng Đối tác & Trạm dừng / Y tế
        public DbSet<PartnerFacility> PartnerFacilities { get; set; } = null!;
        public DbSet<FacilityContract> FacilityContracts { get; set; } = null!;
        public DbSet<FacilityCertification> FacilityCertifications { get; set; } = null!;

        // 3. Phân vùng Yêu cầu & Pháp lý kiểm dịch
        public DbSet<TransportRequest> TransportRequests { get; set; } = null!;
        public DbSet<RequestHorseMapping> RequestHorseMappings { get; set; } = null!;
        public DbSet<LegalMedicalRecord> LegalMedicalRecords { get; set; } = null!;
        public DbSet<QuarantineBooking> QuarantineBookings { get; set; } = null!;

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

        // 5. Phân vùng Hợp đồng & Tài chính
        public DbSet<ContractTemplate> ContractTemplates { get; set; } = null!;
        public DbSet<Contract> Contracts { get; set; } = null!;
        public DbSet<CostItem> CostItems { get; set; } = null!;
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Tự động load các cấu hình IEntityTypeConfiguration nếu có
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(HorseTransportDbContext).Assembly);

            // Mặc định DeleteBehavior là Restrict để tránh lỗi multiple cascade paths trong SQL Server
            foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            {
                relationship.DeleteBehavior = DeleteBehavior.Restrict;
            }
        }
    }
}
