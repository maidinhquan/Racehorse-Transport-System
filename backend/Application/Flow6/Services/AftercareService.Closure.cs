using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using System.Text.Json.Nodes;
namespace Application.Flow6.Services;
public sealed partial class AftercareService
{
    public async Task<int> CloseDue(CancellationToken ct)
    {
        var candidates=await Q("SELECT SettlementID FROM TRIP_SETTLEMENT WHERE Status='SETTLED' AND FeedbackEndsAtUtc<=@now",ct,("@now",Now));var closed=0;
        foreach(var candidate in candidates)
        {
            try {await db.Transaction(async()=>{await SettlementDispatch("F6-J37","SYSTEM",S(candidate,"SettlementID")!,null,"127.0.0.1",ct);return true;},ct);closed++;}
            catch(AftercareException ex)when(ex.Status==409) { /* Obligation still open: leave the record intact. */ }
        }
        return closed;
    }
}
