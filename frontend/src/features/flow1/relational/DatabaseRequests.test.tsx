import {beforeEach,expect,test,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import {DatabaseRequests} from './DatabaseRequests';
import {relational} from './api';
import type {Request,WorkflowContract} from './api';
vi.mock('../../../shared/layouts/CustomerLayout/CustomerLayout',()=>({default:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock('./api',()=>({relational:{list:vi.fn(),action:vi.fn()},download:vi.fn()}));
vi.mock('../api',()=>({flow1Error:(e:Error)=>e.message}));
beforeEach(()=>vi.clearAllMocks());
function fixture(paid=false):Request{
 const contract={contractId:'database-contract',version:'version-one',status:'PENDING_SIGNATURE',isCurrent:true,totalPrice:1000000,depositAmount:300000,depositPercent:30,insuranceAmount:10000,terms:'Insurance included',termsAcceptedAtUtc:paid?'2026-01-01':null,workflowVersion:1,contractVersion:1,signDeadline:'2099-01-01',depositDeadline:'2099-01-01',signedAt:null,pdfSha256:'test-pdf-hash',paidAmount:paid?300000:0,currency:'VND',payments:[],trip:null,changes:[],history:[]} as unknown as WorkflowContract;
 return {requestId:'from-sql',version:'request-version',status:'AWAITING_DEPOSIT',departure:'Pickup from DB',destination:'Delivery from DB',horses:[],contracts:[contract],documents:[]} as unknown as Request;
}
test('unpaid contract offers content acceptance and never offers OTP signing',async()=>{
 vi.mocked(relational.list).mockResolvedValue([fixture()]);render(<MemoryRouter><DatabaseRequests/></MemoryRouter>);
 await screen.findByRole('button',{name:'Đồng ý nội dung hợp đồng'});expect(screen.queryByRole('button',{name:'Gửi OTP ký hợp đồng'})).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Đồng ý nội dung hợp đồng'}));expect(relational.action).toHaveBeenCalledWith('/customer/contracts/database-contract/accept-terms',{version:'version-one',reason:'',pdfSha256:'test-pdf-hash'});
});
test('verified deposit enables OTP without claiming the trip is already activated',async()=>{
 vi.mocked(relational.list).mockResolvedValue([fixture(true)]);render(<MemoryRouter><DatabaseRequests/></MemoryRouter>);
 await screen.findByRole('button',{name:'Gửi OTP ký hợp đồng'});expect(screen.getByText(/Chưa ký hợp đồng; chưa tạo chuyến/)).toBeVisible();expect(screen.queryByRole('button',{name:'Thanh toán cọc qua VNPay'})).not.toBeInTheDocument();
});
test('API failure shows the error and never substitutes sample requests',async()=>{
 vi.mocked(relational.list).mockRejectedValue(new Error('Database offline'));render(<MemoryRouter><DatabaseRequests/></MemoryRouter>);
 expect(await screen.findByRole('alert')).toBeVisible();expect(screen.queryByText(/Thunder Strike|Alex Equine|TR-2026/)).not.toBeInTheDocument();
});
test('manager revision editor unlocks only sections selected by the customer',async()=>{
 const r=fixture();(r.contracts[0] as WorkflowContract).changes=[{changeId:'change-db',status:'PENDING',reason:'Adjust terms',decision:null,sections:['TERMS']}];
 vi.mocked(relational.list).mockResolvedValue([r]);render(<MemoryRouter><DatabaseRequests manager/></MemoryRouter>);
 expect(await screen.findByLabelText('Giá trọn gói')).toBeDisabled();expect(screen.getByLabelText('Điều khoản')).toBeEnabled();expect(screen.getByLabelText('Bảo hiểm')).toBeDisabled();
});
