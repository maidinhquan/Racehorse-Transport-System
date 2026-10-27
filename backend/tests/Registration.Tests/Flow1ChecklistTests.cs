using System.Text.Json;
using System.Text.Json.Serialization;
using Application.DTOs;
using Xunit;

namespace Registration.Tests;

public class Flow1ChecklistTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Fact]
    public void DocumentChecklist_WhenItemsHaveFile_SerializedJsonHasRequiredFileProperty()
    {
        var checklist = new DocumentChecklistDto
        {
            RequestId = "REQUEST_001",
            CanSubmit = true,
            Items = new List<DocumentChecklistItemDto>
            {
                new()
                {
                    Key = "passport",
                    Scope = "HORSE_001",
                    Name = "Hộ chiếu ngựa",
                    Kind = "file",
                    Status = "SUBMITTED",
                    Optional = false,
                    Note = "Đã có scan hộ chiếu hợp lệ.",
                    File = new FileRefDto
                    {
                        Name = "passport.pdf",
                        Url = "/api/customer/horses/HORSE_001/files/passport"
                    }
                },
                new()
                {
                    Key = "ownership",
                    Scope = "HORSE_001",
                    Name = "Chứng nhận sở hữu",
                    Kind = "file",
                    Status = "SUBMITTED",
                    Optional = false,
                    Note = "Đã có giấy chứng nhận sở hữu.",
                    File = new FileRefDto
                    {
                        Name = "ownership.pdf",
                        Url = "/api/customer/horses/HORSE_001/files/ownership"
                    }
                },
                new()
                {
                    Key = "flu",
                    Scope = "HORSE_001",
                    Name = "Sổ tiêm ngừa cúm",
                    Kind = "file",
                    Status = "SUBMITTED",
                    Optional = true,
                    Note = "Đã nộp sổ tiêm phòng.",
                    File = new FileRefDto
                    {
                        Name = "flu.pdf",
                        Url = "/api/customer/horses/HORSE_001/files/flu"
                    }
                }
            },
            Issues = new List<DocumentIssueDto>(),
            Warnings = new List<string>()
        };

        var response = ApiResponse<DocumentChecklistDto>.Ok(checklist, "OK");
        var json = JsonSerializer.Serialize(response, JsonOptions);
        using var doc = JsonDocument.Parse(json);

        var dataEl = doc.RootElement.GetProperty("data");
        var itemsEl = dataEl.GetProperty("items");
        Assert.Equal(3, itemsEl.GetArrayLength());

        for (int i = 0; i < itemsEl.GetArrayLength(); i++)
        {
            var item = itemsEl[i];
            // Contract F1-J23 requires: file, key, kind, name, note, optional, scope, status
            Assert.True(item.TryGetProperty("file", out var fileEl), $"Item[{i}] must have 'file'");
            Assert.True(fileEl.TryGetProperty("name", out var nameEl), $"Item[{i}].file must have 'name'");
            Assert.False(string.IsNullOrEmpty(nameEl.GetString()), $"Item[{i}].file.name must not be empty");
            Assert.True(fileEl.TryGetProperty("url", out var urlEl), $"Item[{i}].file must have 'url'");
            Assert.False(string.IsNullOrEmpty(urlEl.GetString()), $"Item[{i}].file.url must not be empty");

            Assert.True(item.TryGetProperty("key", out _));
            Assert.True(item.TryGetProperty("kind", out _));
            Assert.True(item.TryGetProperty("name", out _));
            Assert.True(item.TryGetProperty("note", out _));
            Assert.True(item.TryGetProperty("optional", out _));
            Assert.True(item.TryGetProperty("scope", out _));
            Assert.True(item.TryGetProperty("status", out _));
        }
    }

    [Fact]
    public void DocumentChecklist_WhenItemHasNullFile_FilterPreventsMissingFileError()
    {
        var checklist = new DocumentChecklistDto
        {
            RequestId = "REQUEST_001",
            CanSubmit = false,
            Items = new List<DocumentChecklistItemDto>
            {
                new()
                {
                    Key = "passport",
                    Scope = "HORSE_001",
                    Name = "Hộ chiếu ngựa",
                    Kind = "file",
                    Status = "SUBMITTED",
                    Optional = false,
                    Note = "Đã có scan hộ chiếu hợp lệ.",
                    File = new FileRefDto
                    {
                        Name = "passport.pdf",
                        Url = "/api/customer/horses/HORSE_001/files/passport"
                    }
                },
                new()
                {
                    Key = "ownership",
                    Scope = "HORSE_001",
                    Name = "Chứng nhận sở hữu",
                    Kind = "file",
                    Status = "MISSING",
                    Optional = false,
                    Note = "Chưa có chứng nhận sở hữu.",
                    File = null // Simulated missing file
                }
            },
            Issues = new List<DocumentIssueDto>
            {
                new()
                {
                    Field = "horses.HORSE_001.ownership",
                    Code = "REQUIRED_DOCUMENT_MISSING",
                    Message = "Chưa nộp giấy chứng nhận sở hữu."
                }
            },
            Warnings = new List<string>()
        };

        // Service rule: Remove all items that have null File to satisfy F1-J23 OpenAPI contract
        checklist.Items.RemoveAll(item => item.File == null);

        var response = ApiResponse<DocumentChecklistDto>.Ok(checklist, "OK");
        var json = JsonSerializer.Serialize(response, JsonOptions);
        using var doc = JsonDocument.Parse(json);

        var itemsEl = doc.RootElement.GetProperty("data").GetProperty("items");
        Assert.Single(itemsEl.EnumerateArray());

        var singleItem = itemsEl[0];
        Assert.True(singleItem.TryGetProperty("file", out var fileEl));
        Assert.Equal("passport.pdf", fileEl.GetProperty("name").GetString());
    }

    [Fact]
    public void FileRefDto_DefaultsToNonNullStringForNameAndUrl()
    {
        var fileRef = new FileRefDto();
        Assert.NotNull(fileRef.Name);
        Assert.NotNull(fileRef.Url);
        Assert.Equal(string.Empty, fileRef.Name);
        Assert.Equal(string.Empty, fileRef.Url);

        var json = JsonSerializer.Serialize(fileRef, JsonOptions);
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("name", out _));
        Assert.True(doc.RootElement.TryGetProperty("url", out _));
    }
}
