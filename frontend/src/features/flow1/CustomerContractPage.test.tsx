import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import PaymentPage from "../user-dashboard/page/transport-request-page/payment/PaymentPage";
import ContractPage from "../user-dashboard/page/transport-request-page/contract/ContractPage";
import { relational } from "./relational/api";
import type { Request, Contract } from "./relational/api";
vi.mock("../../shared/layouts/CustomerLayout/CustomerLayout",()=>({default:({children}:{children:ReactNode})=><main>{children}</main>}));
afterEach(()=>vi.restoreAllMocks());
const contract={contractId:"real-contract",version:"rv",status:"PENDING_SIGNATURE",isCurrent:true,relationalTermsReady:true,hasAcceptanceEvidence:false,pdfSha256:"a".repeat(64),totalPrice:100000000,depositAmount:40000000,currency:"VND",paidAmount:0,payments:[]} as unknown as Contract;
const request={requestId:"real-r",customerName:"Actual Customer",departure:"API A",destination:"API B",horses:[],contracts:[contract]} as unknown as Request;
function mount(){render(<MemoryRouter initialEntries={["/customer/requests/real-r/contract"]}><Routes><Route path="/customer/requests/:requestId/contract" element={<ContractPage/>}/></Routes></MemoryRouter>);}
it("upstream contract card renders owned API facts and requires PDF plus agreement before sending an OTP",async()=>{
 vi.spyOn(relational,"detail").mockResolvedValue(request);
 const otp=vi.spyOn(relational,"action").mockResolvedValue({});mount();await screen.findByText("Actual Customer");expect(relational.detail).toHaveBeenCalledWith("real-r");
 expect(document.querySelector(".contract-info-grid")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Sign Contract"})).toBeDisabled();
 expect(screen.getByText("real-contract")).toBeInTheDocument();expect(otp).not.toHaveBeenCalled();expect(screen.queryByText("CT-8931")).not.toBeInTheDocument();
});
it("unauthorized API failure cannot display a fixture contract or enable signing",async()=>{
 vi.spyOn(relational,"detail").mockRejectedValue(new Error("Request not found"));mount();expect(await screen.findByRole("alert")).toHaveTextContent("Request not found");expect(screen.queryByRole("button",{name:"Sign Contract"})).not.toBeInTheDocument();expect(screen.queryByText("CT-8931")).not.toBeInTheDocument();
});
it("clicking agreement alone cannot sign or request OTP",async()=>{
 vi.spyOn(relational,"detail").mockResolvedValue(request);const action=vi.spyOn(relational,"action").mockResolvedValue({});mount();await screen.findByText("Actual Customer");await userEvent.click(screen.getByRole("checkbox"));expect(screen.getByRole("button",{name:"Sign Contract"})).toBeDisabled();expect(action).not.toHaveBeenCalled();
});

it("legacy payment screen preserves stored currency and cannot reopen VNPay from unverified history",async()=>{
 vi.spyOn(relational,"detail").mockResolvedValue({...request,contracts:[{...contract,isCurrent:false,relationalTermsReady:false,hasAcceptanceEvidence:false,status:"SIGNED",signedAt:"2026-10-01T00:00:00Z",currency:"USD",totalPrice:100,depositAmount:0,paidAmount:20,payments:[]}]});
 render(<MemoryRouter initialEntries={["/customer/requests/real-r/payment"]}><Routes><Route path="/customer/requests/:requestId/payment" element={<PaymentPage/>}/></Routes></MemoryRouter>);
 await screen.findByText(/Giá trị trong hồ sơ: 20 USD/);expect(document.querySelector(".payment-deposit-box")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Thanh toán qua VNPay"})).toBeDisabled();
});
