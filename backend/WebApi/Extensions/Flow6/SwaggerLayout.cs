using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Any;
using Swashbuckle.AspNetCore.SwaggerGen;
namespace WebApi.Extensions.Flow6;
public sealed class SwaggerLayout : IOperationFilter,IDocumentFilter
{
    public void Apply(OpenApiOperation operation,OperationFilterContext context)
    {
        if(context.MethodInfo.DeclaringType!=typeof(Controllers.Flow6.AftercareController))return;
        var id="F6-"+context.MethodInfo.Name;operation.OperationId=id;JourneyOrder.Apply(operation,id);
        foreach(var (name,schema) in ApiContract.Schemas)context.SchemaRepository.Schemas["Flow6_"+name]=Convert(schema!);
        if(ApiContract.Operations[id]?["schema"] is JsonNode body)operation.RequestBody=new(){Required=true,Content=new Dictionary<string,OpenApiMediaType>{{"application/json",new(){Schema=Convert(body)}}}};
        foreach(var p in ApiContract.Operations[id]!["parameters"]!.AsArray())
        {
            var name=p!["name"]!.GetValue<string>();var location=p["in"]!.GetValue<string>();
            var old=operation.Parameters.FirstOrDefault(x=>x.Name==name);if(old is not null)operation.Parameters.Remove(old);
            var schema = Convert(p["schema"]!);
            var param = new OpenApiParameter
            {
                Name = name,
                In = location == "path" ? ParameterLocation.Path : location == "header" ? ParameterLocation.Header : ParameterLocation.Query,
                Required = p["required"]?.GetValue<bool>() ?? false,
                Schema = schema
            };
            if (name.Equals("Idempotency-Key", StringComparison.OrdinalIgnoreCase))
            {
                var sampleKey = Guid.NewGuid().ToString("D");
                schema.Example = new OpenApiString(sampleKey);
                schema.Default = new OpenApiString(sampleKey);
                param.Example = new OpenApiString(sampleKey);
            }
            operation.Parameters.Add(param);
        }
        operation.Responses.Clear();var status=id is "F6-J03" or "F6-J11" or "F6-J15" or "F6-J19" or "F6-J24" or "F6-J29" or "F6-J34"?"201":"200";
        operation.Responses[status]=new(){Description="Success",Content=new Dictionary<string,OpenApiMediaType>{{id is "F6-J45" or "F6-J46" or "F6-J47"?"application/pdf":"application/json",new(){Schema=id is "F6-J45" or "F6-J46" or "F6-J47"?new(){Type="string",Format="binary"}:new(){Reference=new(){Type=ReferenceType.Schema,Id="Flow6_"+id+"Response"}}}}}};
        foreach(var error in new[]{"400","401","403","404","409","429","501","503"})operation.Responses[error]=new(){Description="Flow 6 error",Content=new Dictionary<string,OpenApiMediaType>{{"application/json",new(){Schema=new(){Reference=new(){Type=ReferenceType.Schema,Id="Flow6_Error"}}}}}};
    }
    public void Apply(OpenApiDocument document,DocumentFilterContext context)
    {foreach(var (name,schema) in ApiContract.Schemas)document.Components.Schemas["Flow6_"+name]=Convert(schema!);JourneyOrder.Apply(document);}
    private static OpenApiSchema Convert(JsonNode schema)
    {
        if(schema["$ref"] is JsonNode r)return new(){Reference=new(){Type=ReferenceType.Schema,Id="Flow6_"+r.GetValue<string>().Split('/').Last()}};
        var types=schema["type"] is JsonArray a?a.Select(x=>x!.GetValue<string>()).ToArray():new[]{schema["type"]?.GetValue<string>()};
        var result=new OpenApiSchema{Type=types.FirstOrDefault(x=>x!="null"),Nullable=types.Contains("null"),Description=schema["description"]?.GetValue<string>(),Format=schema["format"]?.GetValue<string>(),Pattern=schema["pattern"]?.GetValue<string>()};
        if(schema["properties"] is JsonObject props)foreach(var (name,p) in props)result.Properties[name]=Convert(p!);
        if(schema["required"] is JsonArray req)foreach(var name in req)result.Required.Add(name!.GetValue<string>());
        if(schema["additionalProperties"] is JsonValue v && v.TryGetValue<bool>(out var additional))result.AdditionalPropertiesAllowed=additional;
        if(schema["items"] is JsonNode items)result.Items=Convert(items);
        result.MinLength=schema["minLength"]?.GetValue<int>();result.MaxLength=schema["maxLength"]?.GetValue<int>();result.MinItems=schema["minItems"]?.GetValue<int>();
        result.Minimum=schema["minimum"]?.GetValue<decimal>();result.Maximum=schema["maximum"]?.GetValue<decimal>();
        if(schema["enum"] is JsonArray en)foreach(var value in en)result.Enum.Add(value is null?new OpenApiNull():new OpenApiString(value.GetValue<string>()));
        if(schema["anyOf"] is JsonArray choices)foreach(var choice in choices)result.AnyOf.Add(Convert(choice!));
        if(schema["example"] is JsonValue ex && ex.TryGetValue<string>(out var sample))result.Example=new OpenApiString(sample);
        return result;
    }
}
