using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class CreateHorseRequestDto
    {
        [Required(ErrorMessage = "Tên ngựa không được để trống")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Tên ngựa từ 1 đến 100 ký tự")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Giống ngựa không được để trống")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Giống ngựa từ 1 đến 100 ký tự")]
        public string Breed { get; set; } = string.Empty;

        [Required(ErrorMessage = "Giới tính ngựa không được để trống")]
        [RegularExpression("^(STALLION|MARE|GELDING)$", ErrorMessage = "Giới tính phải là STALLION, MARE hoặc GELDING")]
        public string Sex { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ngày sinh không được để trống")]
        [RegularExpression(@"^(\d{4}-\d{2}-\d{2})?$", ErrorMessage = "Ngày sinh phải theo định dạng YYYY-MM-DD")]
        public string Dob { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mã Microchip không được để trống")]
        [RegularExpression(@"^\d{15}$", ErrorMessage = "Mã Microchip ISO phải gồm đúng 15 chữ số")]
        public string Microchip { get; set; } = string.Empty;

        [Required(ErrorMessage = "Giá trị khai báo không được để trống")]
        [RegularExpression(@"^[1-9]\d{0,9}$", ErrorMessage = "Giá trị khai báo không hợp lệ")]
        public string Value { get; set; } = string.Empty;

        [Required(ErrorMessage = "Đơn vị tiền tệ không được để trống")]
        public string Currency { get; set; } = "VND";

        [StringLength(2000, ErrorMessage = "Điều kiện/Ghi chú tối đa 2000 ký tự")]
        public string Conditions { get; set; } = string.Empty;

        [Required(ErrorMessage = "Thông tin hộ chiếu không được để trống")]
        public HorsePassportInputDto Passport { get; set; } = new();
    }

    public class HorsePassportInputDto
    {
        [Required(ErrorMessage = "Số hộ chiếu không được để trống")]
        public string Number { get; set; } = string.Empty;

        [Required(ErrorMessage = "Cơ quan cấp không được để trống")]
        public string Authority { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ngày cấp không được để trống")]
        [RegularExpression(@"^(\d{4}-\d{2}-\d{2})?$", ErrorMessage = "Ngày cấp phải theo định dạng YYYY-MM-DD")]
        public string IssueDate { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ngày hết hạn không được để trống")]
        [RegularExpression(@"^(\d{4}-\d{2}-\d{2})?$", ErrorMessage = "Ngày hết hạn phải theo định dạng YYYY-MM-DD")]
        public string ExpiryDate { get; set; } = string.Empty;
    }

    public class HorseFileRefDto
    {
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
    }

    public class HorsePassportResponseDto
    {
        public string Number { get; set; } = string.Empty;
        public string Authority { get; set; } = string.Empty;
        public string IssueDate { get; set; } = string.Empty;
        public string ExpiryDate { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public HorseFileRefDto? Scan { get; set; }
    }

    /// <summary>
    /// Response 201 Created khi mới tạo ngựa theo F1-J12 (chưa có file upload đính kèm)
    /// </summary>
    public class HorseCreateResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Breed { get; set; } = string.Empty;
        public string Sex { get; set; } = string.Empty;
        public string Dob { get; set; } = string.Empty;
        public string Microchip { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string Currency { get; set; } = "VND";
        public string Conditions { get; set; } = string.Empty;
        public HorsePassportResponseDto Passport { get; set; } = new();

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? Color { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? FluDate { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? VetName { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? VetPhone { get; set; }

        public string[] UnsupportedFields { get; set; } = new[] { "color", "fluDate", "vetName", "vetPhone" };
    }

    /// <summary>
    /// Response chi tiết hoặc trong danh sách ngựa (F1-J02, F1-J11, F1-J13)
    /// </summary>
    public class HorseDetailResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Breed { get; set; } = string.Empty;
        public string Sex { get; set; } = string.Empty;
        public string Dob { get; set; } = string.Empty;
        public string Microchip { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string Currency { get; set; } = "VND";
        public string Conditions { get; set; } = string.Empty;
        public HorsePassportResponseDto Passport { get; set; } = new();

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public HorseFileRefDto? Photo { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public HorseFileRefDto? Ownership { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public HorseFileRefDto? ValueProof { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public HorseFileRefDto? Flu { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public HorseFileRefDto? Health { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? Color { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? FluDate { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? VetName { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? VetPhone { get; set; }

        public string[] UnsupportedFields { get; set; } = new[] { "color", "fluDate", "vetName", "vetPhone" };
    }

    /// <summary>
    /// Response khi upload file thành công theo F1-J15
    /// </summary>
    public class HorseFileUploadResponseDto
    {
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response ngựa khả dụng cho ngày vận chuyển theo F1-J14
    /// </summary>
    public class SelectableHorseResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool Selectable { get; set; } = true;

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public object? Conflict { get; set; }

        public object[] DocumentWarnings { get; set; } = Array.Empty<object>();
    }
}
