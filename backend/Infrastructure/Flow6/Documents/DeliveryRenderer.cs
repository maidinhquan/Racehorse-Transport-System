using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
namespace Infrastructure.Flow6.Documents;
public sealed class DeliveryRenderer(string executable) : IDeliveryRenderer
{
    public byte[] Render(JsonObject revision)
    {
        if(!File.Exists(executable))throw new AftercareException("FEATURE_NOT_SUPPORTED","Configure Flow6:LibreOfficeExecutable for immutable delivery PDF rendering.",501);
        var folder=Path.Combine(Path.GetTempPath(),"flow6-pdf-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(folder);
        try
        {
            var html="<!doctype html><html><head><meta charset='utf-8'><style>body{font-family:Arial,sans-serif}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>Biên bản bàn giao</h1><pre>"+WebUtility.HtmlEncode(revision.ToJsonString(new(){WriteIndented=true}))+"</pre></body></html>";
            var source=Path.Combine(folder,"delivery.html");File.WriteAllText(source,html,Encoding.UTF8);
            var start=new ProcessStartInfo(executable){UseShellExecute=false,CreateNoWindow=true};
            foreach(var arg in new[]{"-env:UserInstallation="+new Uri(Path.Combine(folder,"profile")).AbsoluteUri,"--headless","--convert-to","pdf","--outdir",folder,source})start.ArgumentList.Add(arg);
            using var process=Process.Start(start)??throw new InvalidOperationException("PDF renderer did not start.");
            if(!process.WaitForExit(30000)){process.Kill(true);throw new AftercareException("PDF_RENDER_FAILED","PDF rendering timed out.",503);}
            var output=Path.Combine(folder,"delivery.pdf");
            if(process.ExitCode!=0||!File.Exists(output))throw new AftercareException("PDF_RENDER_FAILED","PDF rendering failed.",503);
            return File.ReadAllBytes(output);
        }
        finally {Directory.Delete(folder,true);}
    }
}
