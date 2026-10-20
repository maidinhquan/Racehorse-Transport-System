using System.Security.Cryptography;
using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Infrastructure.Storage;
using Xunit;

namespace Flow1.Tests;

public sealed class RelationalPdfTests
{
    [LocalSqlFact]
    public async Task Real_pdf_contains_twelve_required_and_additional_clauses_in_immutable_private_bytes()
    {

        await using var f=await RelationalFlow1Tests.Fixture.Create();await f.Published();var snapshot=f.Renderer.Last!;
        string[] additional=["Liên hệ người nhận ít nhất 30 phút trước khi giao ngựa.\nChuẩn bị nước uống theo thỏa thuận.","Nội dung bổ sung hiển thị nguyên văn: <không phải HTML> & không bị rút gọn."];
        var optionsJson=new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var model=snapshot.FrozenSnapshot.Deserialize<ContractPdfModel>(optionsJson)! with {AdditionalClauses=additional};
        snapshot=snapshot with {FrozenSnapshot=JsonSerializer.SerializeToElement(model,optionsJson)};
        var directory=new DirectoryInfo(Directory.GetCurrentDirectory());while(directory is not null&&!File.Exists(Path.Combine(directory.FullName,"backend/Backend.slnx")))directory=directory.Parent;
        Assert.NotNull(directory);var web=Path.Combine(directory.FullName,"backend/WebApi");
        var output=Path.Combine(web,"App_Data/flow1/relational-pdf-qa");Directory.CreateDirectory(output);
        var files=new LocalFlow1PrivateFileStore(Path.Combine(output,"bytes"));
        var options=new Application.Common.Flow1.Flow1ContractOptions{WorkRoot=Path.Combine(output,"conversion")};
        var result=await new CodeContractDocumentGenerator(web,options,files).GenerateAsync(snapshot);
        var bytes=await files.ReadAsync(new(result.PrivateStorageKey,result.Sha256,"application/pdf",checked((int)result.SizeBytes)),default);
        Assert.True(bytes.AsSpan().StartsWith("%PDF-"u8));Assert.Equal(result.Sha256,Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant());
        Assert.Equal(12,PublishedClauseSelection.Read(bytes).Count(x=>x.IsRequired));
        Assert.Equal(additional,PublishedClauseSelection.ReadAdditional(bytes));
        Assert.True(bytes.Length>10000);await File.WriteAllBytesAsync(Path.Combine(output,"contract-v3.pdf"),bytes);
        await File.WriteAllTextAsync(Path.Combine(output,"sha256.txt"),result.Sha256);
        var current=new Flow1CurrentFiles(Path.Combine(output,"bytes"),files);var key="private/"+result.PrivateStorageKey+".pdf";
        Assert.Equal(bytes,(await current.ReadAsync(key,default)).Bytes);
        await Assert.ThrowsAnyAsync<Exception>(()=>current.ReadAsync("private/../../public.pdf",default));
        var path=Path.Combine(output,"bytes",result.PrivateStorageKey+".bin");await File.AppendAllTextAsync(path,"tampered");
        await Assert.ThrowsAnyAsync<Exception>(()=>current.ReadAsync(key,default));
        await File.WriteAllBytesAsync(path,bytes);
    }
}
