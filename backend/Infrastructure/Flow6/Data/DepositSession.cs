using System.Linq.Expressions;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using Infrastructure.Flow1.Data;
namespace Infrastructure.Flow6.Data;
// Compatibility boundary: old deposit services/workers must never reconcile or cancel
// a FINAL_SETTLEMENT using Flow 1's deposit-only transaction reference and guards.
public sealed class DepositSession(SqlSession inner) : IDataSession
{
    public async Task<T?> FindAsync<T>(CancellationToken ct,params object[] key) where T:class
    {
        var row=await inner.FindAsync<T>(ct,key);
        if(row is Payment p && await IsFinal(p.InvoiceID,ct))return null;
        return row;
    }
    public async Task<List<T>> ListAsync<T>(Expression<Func<T,bool>> predicate,CancellationToken ct) where T:class
    {
        var rows=await inner.ListAsync(predicate,ct);
        if(typeof(T)!=typeof(Payment))return rows;
        var invoices=(await inner.ListAsync<Invoice>(x=>x.InvoiceType=="FINAL_SETTLEMENT",ct)).Select(x=>x.InvoiceID).ToHashSet();
        return rows.Where(x=>!invoices.Contains(((Payment)(object)x).InvoiceID)).ToList();
    }
    private async Task<bool> IsFinal(string invoice,CancellationToken ct)=>(await inner.FindAsync<Invoice>(ct,invoice))?.InvoiceType=="FINAL_SETTLEMENT";
    public void Add<T>(T row)where T:class=>inner.Add(row);
    public void Remove<T>(T row)where T:class=>inner.Remove(row);
    public Task SaveAsync(CancellationToken ct)=>inner.SaveAsync(ct);
    public Task<T> WriteAsync<T>(Func<CancellationToken,Task<T>> action,CancellationToken ct)=>inner.WriteAsync(action,ct);
}
