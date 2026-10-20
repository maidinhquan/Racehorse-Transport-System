namespace Domain.Enums
{
    public static class UserRoles
    {
        public const string Customer = "CUSTOMER";
        public const string LogisticsManager = "LOGISTICS_MANAGER";
        public const string TransportSpecialist = "TRANSPORT_SPECIALIST";
        public const string FleetRouteCoordinator = "FLEET_ROUTE_COORDINATOR";
        public const string DriverEscort = "DRIVER_ESCORT";
        public const string Admin = "ADMIN";

        /// <summary>
        /// Chuẩn hóa Role từ database (hoặc từ client) về đúng định dạng contract của Frontend
        /// </summary>
        public static string NormalizeRole(string? role)
        {
            if (string.IsNullOrWhiteSpace(role)) return Customer;

            var r = role.Trim().ToUpperInvariant();
            return r switch
            {
                "ADMIN" => Admin,
                "CUSTOMER" or "CUST" => Customer,
                "MANAGER" or "LOGISTICS_MANAGER" => LogisticsManager,
                "SPECIALIST" or "TRANSPORT_SPECIALIST" => TransportSpecialist,
                "COORDINATOR" or "FLEET_ROUTE_COORDINATOR" => FleetRouteCoordinator,
                "DRIVER" or "ESCORT" or "DRIVER_ESCORT" => DriverEscort,
                _ => Customer
            };
        }
    }
}

