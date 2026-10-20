namespace Application.Common.Flow1;

// Stable catalogue identities: SQL 002 seeds missing rows only, never overwrites edits.
public static class RequiredContractClauses
{
    public static IReadOnlyList<string> Ids { get; } = Array.AsReadOnly(
        Enumerable.Range(1, 12).Select(i => $"flow1-required-clause-{i:00}").ToArray());

    public static int? Order(string id)
    {
        for (var i = 0; i < Ids.Count; i++)
            if (Ids[i] == id) return i + 1;
        return null;
    }
}
