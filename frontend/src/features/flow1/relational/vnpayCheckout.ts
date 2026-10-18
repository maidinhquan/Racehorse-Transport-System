export type VnpayCheckoutSession = { paymentId: string; paymentUrl: string; expiresAtUtc: string };

export function vnpayCheckoutUrl(session: VnpayCheckoutSession): string {
  let url: URL;
  try { url = new URL(session.paymentUrl); }
  catch { throw new Error("Payment URL không hợp lệ."); }
  if (url.protocol !== "https:" || url.hostname !== "sandbox.vnpayment.vn" || url.username || url.password || url.port || url.pathname !== "/paymentv2/vpcpay.html")
    throw new Error("Payment URL không hợp lệ.");
  return url.href;
}
