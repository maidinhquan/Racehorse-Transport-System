using Application.Flow6.Exceptions;
using System.Globalization;
using System.Net.Mail;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using static Application.Flow6.Rules.BusinessRules;
namespace Application.Flow6.Contracts;
public static partial class ApiContract
{
    public static void Validate(JsonNode? value, JsonNode schema, string field = "body")
    {
        if(schema["$ref"] is JsonNode reference) { Validate(value,Schemas[reference.GetValue<string>().Split('/').Last()]!,field); return; }
        if(schema["anyOf"] is JsonArray choices)
        {
            foreach(var choice in choices) { try { Validate(value,choice!,field); return; } catch(AftercareException) {} }
            throw new AftercareException("VALIDATION_ERROR",$"Invalid {field}.",400);
        }
        var types=schema["type"] is JsonArray a ? a.Select(x=>x!.GetValue<string>()).ToArray() : new[]{schema["type"]?.GetValue<string>()};
        if(value is null) { Require(types.Contains("null"),"VALIDATION_ERROR",$"{field} cannot be null.",400); return; }
        if(schema["enum"] is JsonArray en) Require(en.Any(x=>JsonNode.DeepEquals(value,x)),"VALIDATION_ERROR",$"Invalid {field} enum.",400);
        if(types.Contains("object"))
        {
            Require(value is JsonObject,"VALIDATION_ERROR",$"{field} must be an object.",400);
            var obj=value.AsObject(); var props=schema["properties"]!.AsObject();
            foreach(var required in schema["required"]!.AsArray()) Require(obj.ContainsKey(required!.GetValue<string>()),"VALIDATION_ERROR",$"Missing {field}.{required}.",400);
            foreach(var prop in obj) { Require(props.ContainsKey(prop.Key),"VALIDATION_ERROR",$"Unknown {field}.{prop.Key}.",400); Validate(prop.Value,props[prop.Key]!,field+"."+prop.Key); }
        }
        else if(types.Contains("array"))
        {
            Require(value is JsonArray,"VALIDATION_ERROR",$"{field} must be an array.",400); var items=value.AsArray();
            Require(items.Count >= (schema["minItems"]?.GetValue<int>()??0),"VALIDATION_ERROR",$"Too few {field} items.",400);
            foreach(var item in items) Validate(item,schema["items"]!,field+"[]");
        }
        else if(types.Contains("string"))
        {
            Require(value is JsonValue j && j.TryGetValue<string>(out _),"VALIDATION_ERROR",$"{field} must be a string.",400);
            var str=value.GetValue<string>();
            Require(str.Length >= (schema["minLength"]?.GetValue<int>()??0) && str.Length <= (schema["maxLength"]?.GetValue<int>()??int.MaxValue),"VALIDATION_ERROR",$"Invalid {field} length.",400);
            if(schema["minLength"]?.GetValue<int>() > 0) Require(!string.IsNullOrWhiteSpace(str),"VALIDATION_ERROR",$"{field} is blank.",400);
            if(schema["pattern"] is JsonNode pat) Require(Regex.IsMatch(str,pat.GetValue<string>(),RegexOptions.CultureInvariant,TimeSpan.FromMilliseconds(100)),"VALIDATION_ERROR",$"Invalid {field} format.",400);
            if(schema["format"]?.GetValue<string>()=="date-time") Require(DateTimeOffset.TryParse(str,CultureInfo.InvariantCulture,DateTimeStyles.RoundtripKind,out _),"VALIDATION_ERROR",$"Invalid {field} date.",400);
            if(schema["format"]?.GetValue<string>()=="email") Require(MailAddress.TryCreate(str,out var email) && email.Address==str,"VALIDATION_ERROR",$"Invalid {field} email.",400);
        }
        else if(types.Contains("integer"))
        {
            Require(value is JsonValue j && j.TryGetValue<decimal>(out var _),"VALIDATION_ERROR",$"{field} must be a number.",400);
            var n=value.GetValue<decimal>();
            Require(n==decimal.Truncate(n) && n >= (schema["minimum"]?.GetValue<decimal>()??decimal.MinValue) && n <= (schema["maximum"]?.GetValue<decimal>()??decimal.MaxValue),"VALIDATION_ERROR",$"Invalid {field} range.",400);
        }
        else if(types.Contains("boolean")) Require(value is JsonValue j && j.TryGetValue<bool>(out _),"VALIDATION_ERROR",$"{field} must be boolean.",400);
    }
}
