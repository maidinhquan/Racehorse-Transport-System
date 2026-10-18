using System.Text.Json;
using System.Text.RegularExpressions;
using Infrastructure.Data.Context;
using Infrastructure.Storage;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

// No appsettings loading, ambient default DB, automatic migration, filesystem mutation or source deletion.
if (args is ["--help"])
{
    Console.WriteLine("Flow1StateImport --connection-env ENV_NAME --confirm-database EXACT_DB --source-root ABS_PATH --private-files-root ABS_PATH [--dry-run | --apply --offline-confirmed --reviewed-fingerprint SHA256]. Default: read-only dry-run. Back up DB and private files; stop all writers before apply. No migrations are applied.");
    return 0;
}
try
{
    var flags = new HashSet<string>(StringComparer.Ordinal); var values = new Dictionary<string, string>(StringComparer.Ordinal);
    var switches = new[] { "--apply", "--dry-run", "--offline-confirmed" };
    var options = new[] { "--connection-env", "--confirm-database", "--source-root", "--private-files-root", "--reviewed-fingerprint" };
    for (var i = 0; i < args.Length; i++)
    {
        if (switches.Contains(args[i])) { if (!flags.Add(args[i])) throw new ArgumentException(); }
        else if (options.Contains(args[i]) && i + 1 < args.Length && !args[i + 1].StartsWith("--"))
        { var option = args[i++]; if (!values.TryAdd(option, args[i])) throw new ArgumentException(); }
        else throw new ArgumentException();
    }
    foreach (var required in options.Take(4)) if (!values.ContainsKey(required)) throw new ArgumentException();
    var apply = flags.Contains("--apply");
    if (apply && (flags.Contains("--dry-run") || !flags.Contains("--offline-confirmed") ||
        !Regex.IsMatch(values.GetValueOrDefault("--reviewed-fingerprint") ?? "", @"\A[A-F0-9]{64}\z")) ||
        !apply && (flags.Contains("--offline-confirmed") || values.ContainsKey("--reviewed-fingerprint"))) throw new ArgumentException();
    var connection = Environment.GetEnvironmentVariable(values["--connection-env"]);
    if (string.IsNullOrWhiteSpace(connection)) throw new ArgumentException();
    var target = new SqlConnectionStringBuilder(connection);
    if (target.InitialCatalog != values["--confirm-database"] || new[] { "master", "model", "msdb", "tempdb" }.Contains(target.InitialCatalog, StringComparer.OrdinalIgnoreCase))
        throw new ArgumentException();
    var root = values["--source-root"]; var bytes = values["--private-files-root"];
    if (!Path.IsPathFullyQualified(root) || !Path.IsPathFullyQualified(bytes) || !Directory.Exists(root) || !Directory.Exists(bytes)) throw new ArgumentException();
    await using var context = new HorseTransportDbContext(new DbContextOptionsBuilder<HorseTransportDbContext>().UseSqlServer(connection).Options);
    var importer = new Flow1LegacyStateImporter(context, root, bytes);
    var report = apply ? await importer.ImportAsync(values["--reviewed-fingerprint"]) : await importer.InventoryAsync();
    Console.WriteLine(JsonSerializer.Serialize(report, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
    return report.Issues.Length == 0 ? 0 : 2;
}
catch (Exception e)
{
    // Do not print SQL/provider exception text, connection strings, source payloads or any OTP material.
    var code = e is ArgumentException ? "INVALID_ARGUMENTS_OR_TARGET" : e is InvalidDataException && Regex.IsMatch(e.Message, @"\A[A-Z_]{1,80}\z") ? e.Message : "IMPORT_FAILED";
    Console.Error.WriteLine(JsonSerializer.Serialize(new { code, exceptionType = e.GetType().Name }));
    return 1;
}
