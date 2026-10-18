import { expect, test } from "vitest";
import { vnpayCheckoutUrl, type VnpayCheckoutSession } from "./vnpayCheckout";

test("uses the backend paymentUrl field, preserving signed checkout parameters", () => {
  const session = { paymentId: "p123", paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=p123&vnp_Amount=40000000&vnp_SecureHash=test", expiresAtUtc: "2026-11-01T00:00:00Z" };
  expect(vnpayCheckoutUrl(session)).toBe(session.paymentUrl);
});

test.each([undefined, "", "not a URL", "http://sandbox.vnpayment.vn/paymentv2/vpcpay.html", "https://unexpected.invalid/paymentv2/vpcpay.html", "https://sandbox.vnpayment.vn@unexpected.invalid/paymentv2/vpcpay.html", "https://sandbox.vnpayment.vn:8443/paymentv2/vpcpay.html", "https://sandbox.vnpayment.vn/other"])("refuses invalid checkout %s", paymentUrl => {
  expect(() => vnpayCheckoutUrl({ paymentUrl } as VnpayCheckoutSession)).toThrow("Payment URL không hợp lệ.");
});
