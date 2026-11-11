using Infrastructure.Services;
using Xunit;

namespace Flow1.Tests;

public class StaffDirectoryLinksTests
{
    [Theory]
    [InlineData("EMP-21", "USER_012")]
    [InlineData("EMP-22", "USER_013")]
    [InlineData("EMP-35", "USER_014")]
    [InlineData("EMP-23", "USER_015")]
    [InlineData("EMP-25", "USER_016")]
    [InlineData("EMP-26", "USER_017")]
    [InlineData("EMP-31", "USER_018")]
    [InlineData("EMP-32", "USER_019")]
    [InlineData("EMP-28", "USER_030")]
    [InlineData("EMP-36", "USER_031")]
    [InlineData(" emp-21 ", "USER_012")]
    public void Directory_staff_maps_to_their_login_account(string code, string userId)
    {
        Assert.Equal(userId, StaffDirectoryLinks.UserIdFor(code));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("EMP-99")]
    [InlineData("USER_012")]
    public void Staff_without_a_linked_account_map_to_nothing(string? code)
    {
        Assert.Null(StaffDirectoryLinks.UserIdFor(code));
    }

    [Fact]
    public void Each_account_is_linked_to_at_most_one_directory_member()
    {
        var codes = new[] { "EMP-21", "EMP-22", "EMP-23", "EMP-25", "EMP-26", "EMP-31", "EMP-32", "EMP-35" };
        var users = codes.Select(StaffDirectoryLinks.UserIdFor).ToList();
        Assert.All(users, Assert.NotNull);
        Assert.Equal(users.Count, users.Distinct().Count());
    }
}
