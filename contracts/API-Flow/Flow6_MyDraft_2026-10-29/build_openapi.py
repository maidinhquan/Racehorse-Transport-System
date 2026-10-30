"""Explicit Flow6 schemas; generate docs locally, never call backend/database."""
from pathlib import Path
import copy, hashlib, json, re
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]
S={}
def f(sc, purpose, source, value):
    return dict(sc, description=purpose, **{'x-source':source,'example':value})
def text(p,s,e='Nội dung minh họa',n=2000,nullable=False):
    return f({'type':['string','null'] if nullable else 'string','minLength':1,'maxLength':n},p,s,e)
def ident(prefix,p,s):
    return f({'type':'string','pattern':f'^{prefix}_[0-9]{{3,}}$','maxLength':50},p,s,prefix+'_001')
def stamp(p,s,nullable=False):
    return f({'type':['string','null'] if nullable else 'string','format':'date-time','pattern':r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$'},p,s,None if nullable else '2026-11-20T10:00:00Z')
def enum(v,p,s,nullable=False):
    return f({'type':['string','null'] if nullable else 'string','enum':v+([None] if nullable else [])},p,s,None if nullable else v[0])
def money(p,s,e=1000000,positive=False):
    return f({'type':'integer','minimum':1 if positive else 0,'maximum':9999999999},p,s,e)
def flag(p,s,e=False,nullable=False):
    return f({'type':['boolean','null'] if nullable else 'boolean'},p,s,None if nullable else e)
def num(p,s,e=1,lo=1,hi=2147483647):
    return f({'type':'integer','minimum':lo,'maximum':hi},p,s,e)
def R(n):return {'$ref':'#/components/schemas/'+n}
def ref(n,p,s):return dict(R(n),description=p,**{'x-source':s})
def arr(sc,p,s,lo=0):return {'type':'array','items':sc,'minItems':lo,'description':p,'x-source':s}
def obj(n,props,required=None):
    S[n]={'type':'object','properties':props,'required':list(props) if required is None else required,'additionalProperties':False}
def nullable_id(prefix,p,s):return f({'anyOf':[ident(prefix,p,s),{'type':'null'}]},p,s,None)
obj('Receiver',{
 'name':text('Người nhận thực tế; có thể khác Customer.','HANDOVER.ReceiverName','Yuki Tanaka',100),
 'phone':text('Liên hệ người nhận.','HANDOVER.ReceiverPhone','+81312345678',20),
 'authorized':flag('Đã kiểm quyền tại DELIVERY; không sao chép PICKUP.','HANDOVER.IsAuthorized',True),
 'otpEmail':f({'type':'string','format':'email','maxLength':254},'Email actual đã đối chiếu quyền; không nhận email khác ở lệnh gửi mã.','HANDOVER_REVISION.ContentSnapshot.receiver.otpEmail → OtpEmail','receiver@example.com')})
obj('DeliveryItem',{
 'horseId':ident('HORSE','Ngựa đúng Request; mỗi ngựa một dòng.','HANDOVER_ITEM.HorseID'),
 'microchipVerified':flag('Kiểm chip tại DELIVERY; draft mới phải false cho đến khi kiểm.','HANDOVER_ITEM.MicrochipVerified',True),
 'condition':text('Tình trạng thực tế, không phải enum đạt/trượt.','HANDOVER_ITEM.ConditionStatus','Tỉnh táo, không có vết thương mới.',100),
 'assets':text('Tài sản đã đối chiếu, không có phải ghi rõ.','HANDOVER_ITEM.AssetCheck','Một dây dắt'),
 'documents':text('Giấy từng ngựa; không lặp giấy chung.','HANDOVER_ITEM.DocumentsHandedOver',None,2000,True),
 'documentsReceivedAtUtc':stamp('Null nếu không có nhận giấy.','HANDOVER_ITEM.DocumentsReceivedAtUtc',True)})
obj('DeliveryContent',{
 'location':text('Điểm giao thực tế.','HANDOVER.LocationName','Tokyo Racecourse',255),
 'receiver':ref('Receiver','Người nhận lần giao này.','HANDOVER + ContentSnapshot'),
 'commonDocuments':text('Chỉ giấy chung thực giao.','HANDOVER.DocumentsHandedOver',None,2000,True),
 'items':arr(R('DeliveryItem'),'Đủ tập ngựa Request, không trùng horseId.','HANDOVER_ITEM',1)})
obj('Delivery',{
 'id':ident('HANDOVER','Biên bản DELIVERY, khác HandoffEventId.','HANDOVER.HandoverID'),
 'tripId':ident('TRIP','Trip cha.','HANDOVER.TripID'),
 'status':enum(['DRAFT','AWAITING_OTP','CONFIRMED','REFUSED'],'Đồng bộ latest revision.','HANDOVER.Status'),
 'currentRevisionId':ident('HANDOVER_REVISION','Suy ra latest RevisionNo; không có cột current revision mới.','HANDOVER_REVISION ORDER BY RevisionNo DESC')})
obj('Revision',{
 'id':ident('HANDOVER_REVISION','ID bản được xác nhận, không phải ContractVersionID.','HANDOVER_REVISION.HandoverRevisionID'),
 'handoverId':ident('HANDOVER','Biên bản cha.','HANDOVER_REVISION.HandoverID'),
 'number':num('Thứ tự nghiệp vụ trong biên bản, không rowVersion.','HANDOVER_REVISION.RevisionNo'),
 'status':enum(['DRAFT','AWAITING_OTP','CONFIRMED','REFUSED'],'Vòng đời bản.','HANDOVER_REVISION.Status'),
 'content':ref('DeliveryContent','Nội dung chính xác trình người nhận; không lặp ở root.','HANDOVER_REVISION.ContentSnapshot'),
 'createdAtUtc':stamp('Server ghi.','HANDOVER_REVISION.CreatedAtUtc'),
 'confirmedAtUtc':stamp('Null trước OTP đúng.','HANDOVER_REVISION.ConfirmedAtUtc',True),
 'refusalReason':text('Chỉ có khi từ chối.','HANDOVER_REVISION.RefusalReason',None,2000,True),
 'refusedAtUtc':stamp('Null trước từ chối.','HANDOVER_REVISION.RefusedAtUtc',True)})
obj('Lifecycle',{
 'tripStatus':enum(['IN_TRANSIT','COMPLETED'],'Trạng thái Trip khác Request.','TRIP_PLAN.Status'),
 'requestStatus':enum(['IN_PROGRESS','DELIVERED','CLOSED'],'Tiến độ đơn.','TRANSPORT_REQUEST.Status'),
 'contractStatus':enum(['EFFECTIVE','SETTLED','CLOSED'],'Vòng đời tổng; version vẫn SIGNED.','CONTRACT.ContractStatus')})
obj('TripSummary',{'tripId':ident('TRIP','Chuyến được giao.','TRIP_PLAN.TripID'),'requestId':ident('REQUEST','Đơn cha.','TRIP_PLAN.RequestID'),'status':enum(['IN_TRANSIT','COMPLETED'],'Tiến độ chuyến.','TRIP_PLAN.Status')})
obj('Context',{
 'tripId':ident('TRIP','Chuyến tiếp nhận.','TRIP_PLAN.TripID'),
 'requestId':ident('REQUEST','Nguồn ngựa/người nhận.','TRIP_PLAN.RequestID'),
 'contractId':ident('CONTRACT','Đúng Trip/Request/Customer.','CONTRACT.ContractID'),
 'contractVersionNo':num('CurrentVersionNo trỏ SIGNED; không MAX.','CONTRACT.CurrentVersionNo'),
 'lifecycle':ref('Lifecycle','Các status khác nghĩa được gom rõ.','TRIP_PLAN/TRANSPORT_REQUEST/CONTRACT'),
 'pickupHandoverIds':arr(ident('HANDOVER','PICKUP đối chiếu, không thay kiểm DELIVERY.','HANDOVER.HandoverID'),'PICKUP CONFIRMED; thiếu trả [] + warnings.','HANDOVER Type=PICKUP'),
 'horseIds':arr(ident('HORSE','Ngựa cần kiểm.','REQUEST_HORSE_MAPPING.HorseID'),'Tập ngựa Request.','REQUEST_HORSE_MAPPING',1),
 'designatedReceiverName':text('Người chỉ định, không phải actual receiver snapshot.','TRANSPORT_REQUEST.DesignatedReceiverName','Yuki Tanaka',100,True),
 'designatedReceiverPhone':text('Liên hệ chỉ định.','TRANSPORT_REQUEST.DesignatedReceiverPhone','+81312345678',20,True),
 'deliveryId':nullable_id('HANDOVER','Null khi chưa tạo DELIVERY.','HANDOVER Type=DELIVERY'),
 'warnings':arr(text('Cảnh báo, không phải enum DB.','Derived validation','PICKUP_BASELINE_MISSING',100),'Thiếu baseline/hồ sơ/ngoại lệ; không tự chặn mọi incident mở.','Derived read-only')})
obj('OtpState',{'revisionId':ident('HANDOVER_REVISION','Bản được gửi mã.','HANDOVER_REVISION.HandoverRevisionID'),'expiresAtUtc':stamp('Hạn server.','HANDOVER_REVISION.OtpExpiresAtUtc'),'resendAfterUtc':stamp('Giờ được gửi lại.','Derived sentAt + HANDOVER_OTP_RESEND_SECONDS'),'attemptsRemaining':num('Không trả hash/mã.','HANDOVER_OTP_MAX_ATTEMPTS - OtpFailedAttempts',5,0)})
obj('OtpInput',{'otp':f({'type':'string','pattern':'^[0-9]{6}$'},'Mã người nhận cung cấp cho nhân sự tại chỗ; không log.','Transient verification','482913')})
obj('ReasonInput',{'reason':text('Lý do từ chối thực tế.','HANDOVER_REVISION.RefusalReason','Người nhận yêu cầu kiểm tra thêm.')})
obj('ConfirmedDelivery',{'revision':ref('Revision','Bản confirmed.','HANDOVER_REVISION'),'lifecycle':ref('Lifecycle','Kết quả transaction.','TRIP_PLAN/TRANSPORT_REQUEST/CONTRACT')})
obj('Settlement',{
 'id':ident('SETTLEMENT','Một hồ sơ/Contract và Trip.','TRIP_SETTLEMENT.SettlementID'),
 'contractId':ident('CONTRACT','Hợp đồng giá.','TRIP_SETTLEMENT.ContractID'),
 'tripId':ident('TRIP','Chuyến giao.','TRIP_SETTLEMENT.TripID'),
 'contractVersionNo':num('Bản đã ký.','TRIP_SETTLEMENT.ContractVersionNo'),
 'status':enum(['DRAFT','AWAITING_PAYMENT','SETTLED','CLOSED'],'Tiến độ tất toán.','TRIP_SETTLEMENT.Status'),
 'handoverRevisionId':nullable_id('HANDOVER_REVISION','Chỉ DELIVERY CONFIRMED; null khi chuẩn bị.','TRIP_SETTLEMENT.HandoverRevisionID'),
 'finalInvoiceId':nullable_id('INVOICE','Invoice cuối hiện hành.','TRIP_SETTLEMENT.FinalInvoiceID'),
 'settledAtUtc':stamp('Null trước tất toán.','TRIP_SETTLEMENT.SettledAtUtc',True),
 'closedAtUtc':stamp('Null trước đóng.','TRIP_SETTLEMENT.ClosedAtUtc',True),
 'feedbackStartsAtUtc':stamp('Window hiện hành, không history.','TRIP_SETTLEMENT.FeedbackStartedAtUtc',True),
 'feedbackEndsAtUtc':stamp('Hạn BE tính theo policy.','TRIP_SETTLEMENT.FeedbackEndsAtUtc',True)})
obj('Balance',{
 'signedPriceVnd':money('Giá bán đã ký, không giá vốn.','CONTRACT_VERSION.ContentSnapshot',20000000),
 'chargesVnd':money('Tổng CHARGE đã quyết định.','SUM SETTLEMENT_ADJUSTMENT.Amount WHERE CHARGE',0),
 'discountsVnd':money('Tổng DISCOUNT; không tự lấy Incident cost.','SUM SETTLEMENT_ADJUSTMENT.Amount WHERE DISCOUNT',0),
 'depositPaidVnd':money('Cọc verified đúng version.','DEPOSIT INVOICE + SUCCESS PAYMENT',8000000),
 'finalDueVnd':money('Giá sau điều chỉnh trừ cọc, không trừ finalPaid.','Derived formula',12000000),
 'finalPaidVnd':money('Thu verified trên final invoice hiện hành.','SUCCESS PAYMENT',0),
 'remainingVnd':money('Còn phải thu, khác giá hợp đồng.','Derived finalDue-finalPaid',12000000),
 'financialReviewRequired':flag('Có ngoại lệ đối soát.','PAYMENT.FinancialReviewRequired + billing validation')})
obj('Invoice',{'id':ident('INVOICE','Hóa đơn cuối.','INVOICE.InvoiceID'),'settlementId':ident('SETTLEMENT','Suy từ FinalInvoiceID, không thêm cột.','TRIP_SETTLEMENT.FinalInvoiceID'),'totalVnd':money('Nghĩa vụ sau trừ cọc lúc phát hành.','INVOICE.TotalPayableAmount',12000000),'paidVnd':money('Tiền verified invoice này.','INVOICE.PaidAmount',0),'status':enum(['UNPAID','PARTIALLY_PAID','PAID','CANCELLED'],'Không dùng VOID.','INVOICE.PaymentStatus'),'dueAtUtc':stamp('Hạn thu; quá hạn không tự PAID.','INVOICE.DueDate',True)})
obj('InvoiceInput',{'dueAtUtc':stamp('Hạn Manager chọn, phải tương lai.','INVOICE.DueDate')})
obj('PaymentSession',{'paymentId':ident('PAYMENT','Attempt lưu trước redirect.','PAYMENT.PaymentID'),'paymentUrl':f({'type':'string','format':'uri'},'URL adapter, không chứng cứ tiền.','Provider URL','https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?example=1'),'expiresAtUtc':stamp('Hạn attempt.','PAYMENT.VnpayExpiresAtUtc')})
obj('Payment',{'id':ident('PAYMENT','Attempt, không invoice.','PAYMENT.PaymentID'),'invoiceId':ident('INVOICE','Invoice cuối của attempt.','PAYMENT.InvoiceID'),'amountVnd':money('Tiền attempt.','PAYMENT.Amount',12000000,True),'status':enum(['PENDING_GATEWAY','SUCCESS','FAILED','REVIEW_REQUIRED'],'Giữ enum DB; không thêm PROCESSING.','PAYMENT.Status'),'financialReviewRequired':flag('Ngoại lệ cần đối soát.','PAYMENT.FinancialReviewRequired')})
obj('AdjustmentInput',{
 'type':enum(['CHARGE','DISCOUNT','REFUND'],'Manager quyết định trực tiếp; không có Status/Bearer.','SETTLEMENT_ADJUSTMENT.AdjustmentType'),
 'amountVnd':money('VND nguyên dương.','SETTLEMENT_ADJUSTMENT.Amount',1000000,True),
 'reason':text('Lý do phát sinh.','SETTLEMENT_ADJUSTMENT.Reason','Chi phí bổ sung đã đối chiếu.'),
 'decisionReason':text('Căn cứ Manager xác nhận, khác lý do phát sinh.','SETTLEMENT_ADJUSTMENT.DecisionReason','Xác nhận theo thỏa thuận.'),
 'incidentId':ident('INCIDENT','Nguồn tùy chọn cùng Trip.','SETTLEMENT_ADJUSTMENT.IncidentID'),
 'costItemId':ident('COST_ITEM','Nguồn tùy chọn cùng Contract, không dùng lại.','SETTLEMENT_ADJUSTMENT.CostItemID')},['type','amountVnd','reason','decisionReason'])
obj('Adjustment',dict(copy.deepcopy(S['AdjustmentInput']['properties']),
 id=ident('SETTLEMENT_ADJUSTMENT','Khoản đã quyết định, bất biến.','SETTLEMENT_ADJUSTMENT.AdjustmentID'),
 settlementId=ident('SETTLEMENT','Hồ sơ cha.','SETTLEMENT_ADJUSTMENT.SettlementID'),
 originalInvoiceId=nullable_id('INVOICE','Nguồn; null nếu trước phát hành.','SETTLEMENT_ADJUSTMENT.OriginalInvoiceID'),
 adjustedInvoiceId=nullable_id('INVOICE','Invoice thay thế; null trước áp hoặc REFUND.','SETTLEMENT_ADJUSTMENT.AdjustedInvoiceID'),
 refundStatus=enum(['REQUESTED','PROCESSING','COMPLETED'],'Chỉ REFUND, loại khác null.','SETTLEMENT_ADJUSTMENT.RefundStatus',True),
 decidedAtUtc=stamp('Server ghi quyết định.','SETTLEMENT_ADJUSTMENT.DecidedAtUtc')),
 ['id','settlementId','type','amountVnd','reason','decisionReason','originalInvoiceId','adjustedInvoiceId','refundStatus','decidedAtUtc'])
obj('RefundInput',{'reference':text('Mã hoàn thực tế; Flow6 bắt buộc, khác Flow1 status-only.','SETTLEMENT_ADJUSTMENT.RefundReference','REFUND-REAL-001',100),'refundedAtUtc':stamp('Thực hoàn, từ lúc quyết định đến server now.','SETTLEMENT_ADJUSTMENT.RefundedAtUtc')})
obj('Refund',{'adjustmentId':ident('SETTLEMENT_ADJUSTMENT','Khoản hoàn.','SETTLEMENT_ADJUSTMENT.AdjustmentID'),'status':enum(['REQUESTED','PROCESSING','COMPLETED'],'Giữ DB enum.','SETTLEMENT_ADJUSTMENT.RefundStatus'),'reference':text('Null trước hoàn; hoàn xong bất biến.','SETTLEMENT_ADJUSTMENT.RefundReference',None,100,True),'refundedAtUtc':stamp('Null trước hoàn.','SETTLEMENT_ADJUSTMENT.RefundedAtUtc',True)})
obj('CaseInput',{'type':enum(['COMPLAINT','SUPPORT'],'Complaint giữ đơn mở; support sau đóng không mở lại.','CUSTOMER_CASE.CaseType'),'subject':text('Tiêu đề.','CUSTOMER_CASE.Subject','Tình trạng ngựa lúc nhận',200),'description':text('Nội dung Customer báo, không hội thoại.','CUSTOMER_CASE.Description','Cần giải thích tình trạng trong biên bản.')})
obj('Case',dict(copy.deepcopy(S['CaseInput']['properties']),id=ident('CUSTOMER_CASE','Phiếu khác INCIDENT.','CUSTOMER_CASE.CaseID'),settlementId=ident('SETTLEMENT','Chủ lấy qua settlement.','CUSTOMER_CASE.SettlementID'),status=enum(['OPEN','IN_PROGRESS','RESOLVED'],'Manager phản hồi rồi đóng, không chờ accept.','CUSTOMER_CASE.Status'),resolution=text('Kết quả hiện tại.','CUSTOMER_CASE.ResolutionText',None,2000,True),openedAtUtc=stamp('Server ghi lúc tiếp nhận.','CUSTOMER_CASE.OpenedAtUtc'),resolvedAtUtc=stamp('Null trước đóng phiếu.','CUSTOMER_CASE.ResolvedAtUtc',True)))
obj('ResolveInput',{'resolution':text('Phản hồi cuối Manager.','CUSTOMER_CASE.ResolutionText','Đã giải thích và xử lý theo thỏa thuận.')})
obj('FeedbackInput',{'rating':num('Số sao 1..5, không complaint.','CUSTOMER_FEEDBACK.Rating',5,1,5),'comment':text('Lời đánh giá tùy chọn.','CUSTOMER_FEEDBACK.Comment',None,2000,True)},['rating'])
obj('Feedback',dict(copy.deepcopy(S['FeedbackInput']['properties']),id=ident('CUSTOMER_FEEDBACK','Một đánh giá/settlement kể cả reset.','CUSTOMER_FEEDBACK.FeedbackID'),createdAtUtc=stamp('Server ghi.','CUSTOMER_FEEDBACK.CreatedAtUtc')))
obj('CloseResult',{'settlementId':ident('SETTLEMENT','Hồ sơ đã đóng.','TRIP_SETTLEMENT.SettlementID'),'closedAtUtc':stamp('Mốc server.','TRIP_SETTLEMENT.ClosedAtUtc'),'lifecycle':ref('Lifecycle','Request/Contract CLOSED, Trip COMPLETED.','TRIP_PLAN/TRANSPORT_REQUEST/CONTRACT')})
obj('Error',{'success':f({'const':False},'Lỗi.','Envelope',False),'message':text('Hiển thị; không phân nhánh theo message.','Envelope','Không thể thực hiện thao tác.'),'data':f({'type':'null'},'Không có dữ liệu.','Envelope',None),'errorCode':text('Mã ổn định.','Validation','INVALID_STATE',100),'errors':f({'type':'object','additionalProperties':{'type':'array','items':{'type':'string'}}},'Chỉ khi validation theo field.','Validation',{'otp':['Mã không hợp lệ.']})},['success','message','data','errorCode'])
OPS=[]
def op(n,method,path,title,role,response,request=None,guard='',write='',error='INVALID_STATE',code=200):
    OPS.append(dict(id=f'F6-J{n:02}',method=method,path=path,title=title,role=role,response=response,request=request,guard=guard,write=write,error=error,code=code))
W='DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.'
M='LOGISTICS_MANAGER'
C='CUSTOMER sở hữu settlement/Contract'
op(1,'GET','/operations/flow6/trips','Danh sách chuyến giao nhận',W,'TripSummary[]',guard='Chỉ chuyến được phân công, IN_TRANSIT hoặc COMPLETED để đọc hồ sơ cũ.',error='FORBIDDEN_ROLE')
op(2,'GET','/operations/flow6/trips/{tripId}/context','Đầu vào và baseline',W,'Context',guard='Trước thao tác giao kiểm tổ hợp HANDOFF; warnings không thành trạng thái DB.',error='HANDOFF_INCONSISTENT')
op(3,'POST','/operations/flow6/trips/{tripId}/delivery','Tạo DELIVERY và revision đầu',W,'Delivery','DeliveryContent',guard='Trip IN_TRANSIT, Request IN_PROGRESS, deployment CONFIRMED, Contract EFFECTIVE/current version SIGNED, đủ cọc; phân công hợp lệ. Không cần final invoice PAID. Thiếu baseline hiển thị thiếu, không giả dữ liệu. Tổ hợp status không chứng minh xe đã đến.',write='Khóa Trip; tạo HANDOVER DELIVERY DRAFT + ITEM + REVISION DRAFT trong transaction. Nếu đã có DELIVERY trả 409 DELIVERY_EXISTS kèm ID qua errors, không tạo lần hai.',error='DELIVERY_EXISTS',code=201)
op(4,'GET','/operations/flow6/handovers/{handoverId}','Định danh biên bản',W,'Delivery',guard='Quyền theo Trip; không lặp content ở root.',error='NOT_FOUND')
op(5,'GET','/operations/flow6/revisions/{revisionId}','Đọc đúng bản giao nhận',W,'Revision',guard='Quyền qua Handover → Trip. Bản cũ đọc snapshot, không dựng từ item hiện tại.',error='NOT_FOUND')
op(6,'PUT','/operations/flow6/revisions/{revisionId}','Thay nội dung draft',W,'Revision','DeliveryContent',guard='Chỉ latest DRAFT chưa confirmed DELIVERY. horseId unique và đúng mapping; không nhận ID/actor/status FE tự cấp.',write='Khóa Handover/latest revision; đồng bộ HANDOVER/ITEM và ContentSnapshot nguyên tử.',error='REVISION_NOT_EDITABLE')
op(7,'POST','/operations/flow6/revisions/{revisionId}/otp','Gửi hoặc gửi lại OTP',W,'OtpState',guard='Latest DRAFT/AWAITING_OTP; authorized=true, từng chip true, tình trạng/tài sản đã mô tả, đủ ngựa; hồ sơ bắt buộc thực dùng hợp lệ. Email actual được kiểm quyền, không nhập email mới ở đây.',write='Freeze snapshot; revision/Handover AWAITING_OTP. HMAC OTP theo revision/email với secret; resend sau policy, thay hash cũ, KHÔNG reset failed attempts. Không báo email delivered nếu chỉ queued; lỗi gửi trả lỗi, không log OTP.',error='OTP_RESEND_TOO_SOON')
op(8,'POST','/operations/flow6/revisions/{revisionId}/invalidate-otp','Thu hồi OTP để sửa draft',W,'Revision',guard='Latest AWAITING_OTP chưa confirmed. Không sửa content trước thu hồi.',write='Về DRAFT; clear toàn bộ OTP metadata theo CHECK. Reset có chủ đích theo quyền, phải rate limit ngoài DB để không né max attempts. Lệnh này không đổi nội dung.',error='INVALID_STATE')
op(9,'POST','/operations/flow6/revisions/{revisionId}/confirm','Xác nhận nhận ngựa bằng OTP',W,'ConfirmedDelivery','OtpInput',guard='Latest AWAITING_OTP, chưa hết hạn/còn attempts, email/content không đổi; kiểm lại phân công/ngựa/ủy quyền. Nhân sự nhập mã người nhận cung cấp tại chỗ; không giả người nhận có account Customer.',write='Khóa Trip/Handover/revision; đúng OTP → clear hash, revision/Handover CONFIRMED, Trip COMPLETED, Request DELIVERED. Contract EFFECTIVE/version SIGNED. Retry confirmed trả kết quả cũ; không tạo settlement/payment.',error='OTP_INVALID')
op(10,'POST','/operations/flow6/revisions/{revisionId}/refuse','Ghi nhận từ chối nhận',W,'Revision','ReasonInput',guard='Latest DRAFT/AWAITING_OTP chưa confirmed; nhân sự ghi từ chối thực tế, không phải giao thành công.',write='REFUSED và snapshot bất biến; clear OTP/attempts theo CHECK; Handover REFUSED, Trip IN_TRANSIT/Request IN_PROGRESS.',error='INVALID_STATE')
op(11,'POST','/operations/flow6/handovers/{handoverId}/revisions','Lập bản giao lại',W,'Revision','DeliveryContent',guard='Latest REFUSED, Trip IN_TRANSIT. Không tạo version mới sau DELIVERY confirmed.',write='Giữ REFUSED; insert revision số kế tiếp DRAFT TRƯỚC khi sửa ITEM để thỏa trigger. Cùng transaction đồng bộ content và Handover DRAFT.',error='DELIVERY_ALREADY_CONFIRMED',code=201)
op(12,'GET','/customer/flow6/settlements','Hồ sơ của Customer',C,'Settlement[]',guard='CustomerID từ token; chưa có trả [].',error='NOT_FOUND')
op(13,'GET','/customer/flow6/settlements/{settlementId}','Chi tiết tất toán Customer',C,'Settlement',guard='Khác chủ 404; không giá vốn/OTP hash.',error='NOT_FOUND')
op(14,'GET','/manager/flow6/settlements','Danh sách tất toán Manager',M,'Settlement[]',guard='Filter status optional; GET không tạo dòng.',error='FORBIDDEN_ROLE')
op(15,'POST','/manager/flow6/trips/{tripId}/settlement','Chuẩn bị hồ sơ tất toán',M,'Settlement',guard='Contract đúng Trip/Customer/current version SIGNED; được chuẩn bị DRAFT trước DELIVERY. Không mở window trước tất toán.',write='Create-or-get dưới khóa Contract/Trip và unique hiện có; retry cùng hồ sơ. Chỉ link DELIVERY CONFIRMED nếu có.',error='HANDOFF_INCONSISTENT',code=201)
op(16,'GET','/manager/flow6/settlements/{settlementId}','Chi tiết hồ sơ Manager',M,'Settlement',guard='Không lặp Customer/Request/Contract aggregate.',error='NOT_FOUND')
op(17,'GET','/manager/flow6/settlements/{settlementId}/balance','Tính còn phải thu',M,'Balance',guard='Giá signed snapshot và khoản Manager quyết định; thiếu snapshot không fallback giá hiện tại.',error='SIGNED_SNAPSHOT_UNAVAILABLE')
op(18,'GET','/customer/flow6/settlements/{settlementId}/balance','Customer xem nghĩa vụ tiền',C,'Balance',guard='Cùng phép tính Manager; chỉ giá bán, không COST_ITEM giá vốn.',error='NOT_FOUND')
op(19,'POST','/manager/flow6/settlements/{settlementId}/adjustments','Manager xác nhận điều chỉnh',M,'Adjustment','AdjustmentInput',guard='Không CLOSED. CHARGE/DISCOUNT chỉ DRAFT/AWAITING_PAYMENT; có tiền hoặc attempt chưa kết luận trên invoice nguồn thì chặn và đối soát. REFUND cần final invoice đã thu; không refund cọc ở đây. Nguồn cùng Trip/Contract, không tự biến Incident.AdditionalCost thành nợ.',write='CreatedBy=DecidedBy từ token, giờ server. Khoản bất biến, không có Status/Bearer. OriginalInvoiceID từ invoice hiện hành nếu có, REFUND khởi tạo REQUESTED. Không sửa signed Contract.',error='PAYMENT_RECONCILIATION_REQUIRED',code=201)
op(20,'GET','/manager/flow6/settlements/{settlementId}/adjustments','Điều chỉnh đã xác nhận',M,'Adjustment[]',guard='AdjustedInvoiceID null không nghĩa đã áp hóa đơn.',error='NOT_FOUND')
op(21,'GET','/customer/flow6/settlements/{settlementId}/adjustments','Customer xem điều chỉnh',C,'Adjustment[]',guard='Không evidence/giá vốn nội bộ; CostItemID chỉ là nguồn ID, không cấp quyền đọc chi phí.',error='NOT_FOUND')
op(22,'POST','/manager/flow6/settlements/{settlementId}/final-invoice','Phát hành hoặc thay invoice cuối',M,'Invoice','InvoiceInput',guard='DELIVERY CONFIRMED, Trip COMPLETED/Request DELIVERED. Invoice nguồn chỉ thay khi chưa thu và không attempt chưa kết luận. Có tiền cũ trả 409, không phân bổ ngầm.',write='Khóa settlement/invoice/attempt. Nghĩa vụ theo Balance. Hủy invoice cũ TRƯỚC insert để thỏa unique filtered index; tạo FINAL_SETTLEMENT, link adjustments và FinalInvoiceID, AWAITING_PAYMENT nguyên tử. Không thu lại cọc. Retry không có điều chỉnh mới trả invoice hiện tại.',error='PAYMENT_RECONCILIATION_REQUIRED',code=201)
op(23,'GET','/customer/flow6/settlements/{settlementId}/invoice','Đọc invoice cuối hiện hành',C,'Invoice',guard='Chưa phát hành trả 404 FINAL_INVOICE_NOT_FOUND.',error='FINAL_INVOICE_NOT_FOUND')
op(24,'POST','/customer/flow6/invoices/{invoiceId}/payment-session','Tạo phiên VNPay trả số dư',C,'PaymentSession',guard='Current FINAL_SETTLEMENT chưa đủ tiền, settlement AWAITING_PAYMENT. BE lấy remaining; còn attempt chưa kết luận trả 409.',write='Lưu PAYMENT PENDING_GATEWAY trước redirect, TxnRef gắn PaymentID; không nhận amount/method body. Adapter/IPN dùng chung, không confirm tiền thủ công.',error='PAYMENT_IN_PROGRESS',code=201)
op(25,'GET','/customer/flow6/payments/{paymentId}','Đọc thanh toán số dư',C,'Payment',guard='Quyền qua invoice → settlement. Return không cập nhật tiền.',error='NOT_FOUND')
op(26,'POST','/manager/flow6/settlements/{settlementId}/settle','Xác nhận nghiệm thu và tất toán',M,'Settlement',guard='DELIVERY CONFIRMED, final invoice PAID, không nợ/ngoại lệ, mọi điều chỉnh đã áp/hoàn đủ. Complaint mở không cấm ghi đủ tiền nhưng chặn đóng/reset.',write='SETTLED + SettledBy/At, Contract SETTLED, Request DELIVERED. Mở window policy; complaint mở giữ đơn mở và reset sau giải quyết hết. Retry SETTLED không reset window.',error='SETTLEMENT_NOT_READY')
op(27,'POST','/manager/flow6/adjustments/{adjustmentId}/refund-processing','Ghi bắt đầu xử lý hoàn',M,'Refund',guard='Chỉ REFUND REQUESTED với invoice nguồn đúng; không gọi chuyển tiền.',write='REQUESTED → PROCESSING; retry PROCESSING trả hiện tại, không lùi COMPLETED.',error='INVALID_STATE')
op(28,'POST','/manager/flow6/adjustments/{adjustmentId}/refund-complete','Ghi bằng chứng hoàn đủ khoản',M,'Refund','RefundInput',guard='REQUESTED/PROCESSING; một giao dịch đủ Amount, tổng refund <= tiền nguồn. Check reference chống trùng trong transaction; schema chưa hỗ trợ chia nhiều lần chuyển.',write='COMPLETED + RefundedBy token/At/reference; trigger bất biến. Retry cùng bằng chứng trả cũ, khác bằng chứng 409. Không tạo PAYMENT REFUND hoặc sửa SUCCESS → FAILED.',error='REFUND_EVIDENCE_CONFLICT')
op(29,'POST','/customer/flow6/settlements/{settlementId}/cases','Gửi khiếu nại/hỗ trợ',C,'Case','CaseInput',guard='COMPLAINT sau DELIVERY trước CLOSED; còn nợ/chưa có window vẫn gửi được; nếu có window thì phải trước hạn. SUPPORT được tạo sau CLOSED, không mở lại.',write='Khóa settlement cùng close/reset; OPEN. Complaint chặn đóng nhưng không sửa payment. Không chat/accept-result.',error='COMPLAINT_WINDOW_CLOSED',code=201)
op(30,'GET','/customer/flow6/settlements/{settlementId}/cases','Theo dõi phiếu Customer',C,'Case[]',guard='Chỉ chủ; RESOLVED vẫn đọc được.',error='NOT_FOUND')
op(31,'GET','/manager/flow6/cases','Hàng đợi khiếu nại/hỗ trợ',M,'Case[]',guard='Filter status/type optional; không claim độc quyền.',error='FORBIDDEN_ROLE')
op(32,'POST','/manager/flow6/cases/{caseId}/start','Đánh dấu đang xử lý',M,'Case',guard='OPEN/IN_PROGRESS; Manager nào cũng xử lý được.',write='IN_PROGRESS + HandledBy/At server; RESOLVED không mở lại, khách còn ý kiến tạo phiếu mới.',error='INVALID_STATE')
op(33,'POST','/manager/flow6/cases/{caseId}/resolve','Manager phản hồi rồi đóng phiếu',M,'Case','ResolveInput',guard='OPEN/IN_PROGRESS; không cần Customer đồng ý theo rule hiện hành; điều chỉnh tiền là nghiệp vụ riêng.',write='RESOLVED với ResolutionText/HandledBy/HandledAt/ResolvedAt. Complaint cuối + SETTLED + tiền hoàn thành → reset window đủ thời lượng trong transaction. Nếu tiền chưa xong thì J36 xử lý sau; retry không reset thêm.',error='INVALID_STATE')
op(34,'POST','/customer/flow6/settlements/{settlementId}/feedback','Gửi đánh giá thông thường',C,'Feedback','FeedbackInput',guard='SETTLED, server now trong window, một feedback/settlement theo unique kể cả reset. Rating không complaint.',write='Insert rating/comment và giờ server. Không chặn đóng/reset. Đã có trả 409 FEEDBACK_EXISTS.',error='FEEDBACK_EXISTS',code=201)
op(35,'GET','/customer/flow6/settlements/{settlementId}/feedback','Đọc đánh giá đã gửi',C,'Feedback',guard='Chưa có trả 404, không bịa đánh giá.',error='FEEDBACK_NOT_FOUND')
op(36,'POST','/manager/flow6/settlements/{settlementId}/restart-feedback-window','Mở lại window sau khiếu nại/tiền',M,'Settlement',guard='SETTLED, có complaint RESOLVED sau starts hiện hành; không còn complaint mở hoặc nợ/refund. Không reset tùy ý khi refresh.',write='Khóa settlement; max ResolvedAt làm căn cứ chống lặp. starts=server now, ends=starts+policy. Không history window.',error='FEEDBACK_RESET_NOT_DUE')
op(37,'POST','/manager/flow6/settlements/{settlementId}/close','Đóng hồ sơ đủ điều kiện',M,'CloseResult',guard='SETTLED, hết window, không complaint mở/pending refund/adjustment/review/nợ. Nếu complaint resolved sau starts thì reset trước, không đóng.',write='Khóa cùng case/payment; CLOSED + ClosedAt, Request/Contract CLOSED. Trip COMPLETED/version SIGNED. Retry giữ mốc cũ. Worker tự đóng dùng cùng service guard, không public cron endpoint.',error='CLOSE_BLOCKED')
obj('PickupReference',{'handoverId':ident('HANDOVER','PICKUP được dùng đối chiếu, không bản DELIVERY.','HANDOVER.HandoverID'),'receiverName':text('Người đã nhận lúc đầu chuyến.','HANDOVER.ReceiverName','Nguyen Van A',100,True),'items':arr(R('DeliveryItem'),'Dữ liệu lúc PICKUP; chỉ đọc, không sao chép flag sang DELIVERY.','HANDOVER_ITEM',1)})
obj('HealthReference',{'id':ident('HEALTH_LOG','Nguồn sức khỏe đọc từ Flow4.','HEALTH_LOG.LogID'),'horseId':ident('HORSE','Ngựa cùng Request.','HEALTH_LOG.HorseID'),'recordedAtUtc':stamp('LogTime được adapter chuẩn hóa UTC.','HEALTH_LOG.LogTime'),'description':text('Mô tả, không enum HEALTHY.','HEALTH_LOG.Description',None,2000,True),'healthStatus':text('Văn bản, không tự coi null là tốt.','HEALTH_LOG.HealthStatus',None,100,True)})
obj('IncidentReference',{'id':ident('INCIDENT','Nguồn sự cố, không CUSTOMER_CASE.','INCIDENT.IncidentID'),'status':enum(['OPEN','IN_PROGRESS','AWAITING_APPROVAL','RESOLVED'],'Null legacy vẫn chưa xác định; không tự chặn mở giao.','INCIDENT.Status',True),'description':text('Nội dung tham chiếu; không tự thành phí.','INCIDENT.Description',None,2000,True)})
op(38,'GET','/operations/flow6/trips/{tripId}/pickup-baseline','Đọc baseline PICKUP',W,'PickupReference[]',guard='Chỉ PICKUP CONFIRMED cùng Trip. Thiếu trả [] và context warnings; snapshot cũ không có OTP thì không mô tả là đã OTP.',error='NOT_FOUND')
op(39,'GET','/operations/flow6/trips/{tripId}/health-logs','Tham chiếu sức khỏe đã ghi',W,'HealthReference[]',guard='Cùng Trip/ngựa Request; chỉ đọc, không kiểm chuỗi HEALTHY/NORMAL.',error='NOT_FOUND')
op(40,'GET','/operations/flow6/trips/{tripId}/incidents','Tham chiếu sự cố hành trình',W,'IncidentReference[]',guard='Không yêu cầu mọi incident RESOLVED để mở Flow6. Không trả giá vốn/AdditionalCost cho caller này.',error='NOT_FOUND')
op(41,'GET','/customer/flow6/settlements/{settlementId}/delivery','Customer đọc biên bản đã nhận',C,'Revision',guard='Chỉ bản DELIVERY CONFIRMED settlement đang liên kết; không leak draft hoặc OTP hash.',error='DELIVERY_NOT_CONFIRMED')
op(42,'GET','/manager/flow6/settlements/{settlementId}/delivery','Manager đọc biên bản nghiệm thu',M,'Revision',guard='Đúng revision settlement đã liên kết; chưa có confirmed trả 404.',error='DELIVERY_NOT_CONFIRMED')
op(43,'GET','/manager/flow6/settlements/{settlementId}/feedback','Manager đọc đánh giá',M,'Feedback',guard='Chưa có trả 404 FEEDBACK_NOT_FOUND.',error='FEEDBACK_NOT_FOUND')
op(44,'GET','/manager/flow6/settlements/{settlementId}/payments','Manager đọc giao dịch số dư',M,'Payment[]',guard='Tất cả attempt invoice FINAL_SETTLEMENT đúng Contract/version, gồm invoice cũ để đối soát. Chỉ đọc; không confirm/reject thủ công.',error='NOT_FOUND')
op(45,'GET','/operations/flow6/revisions/{revisionId}/pdf','Xuất PDF đúng bản biên bản',W,'Binary',guard='Chỉ revision AWAITING_OTP/CONFIRMED/REFUSED theo phân công; DRAFT chưa freeze trả 409. Render từ ContentSnapshot đúng bản, không từ item hiện tại.',error='REVISION_NOT_FROZEN')
op(46,'GET','/customer/flow6/settlements/{settlementId}/delivery/pdf','Customer tải biên bản đã nhận',C,'Binary',guard='Chỉ DELIVERY CONFIRMED mà settlement liên kết, đúng owner. Render từ snapshot, không mở draft/OTP hash.',error='DELIVERY_NOT_CONFIRMED')
op(47,'GET','/manager/flow6/settlements/{settlementId}/delivery/pdf','Manager tải biên bản nghiệm thu',M,'Binary',guard='Chỉ DELIVERY CONFIRMED được settlement liên kết; chưa có trả 404. Không bịa URL storage hoặc PdfUrl không có SQL.',error='DELIVERY_NOT_CONFIRMED')
for n in ['HealthReference','IncidentReference']:
    S[n]['properties']['description'].pop('maxLength',None)  # SQL NVARCHAR(MAX), never silently truncate evidence.

# Explicit dependency choices: no invisible application marker for pre-invoice adjustments.
for o in OPS:
    if o['id']=='F6-J19':
        o['guard']='Không CLOSED; phải có final invoice hiện hành trước khi quyết định mọi adjustment. CHARGE/DISCOUNT chỉ AWAITING_PAYMENT và invoice nguồn chưa thu/không attempt chưa kết luận; REFUND có thể SETTLED nhưng nguồn đã thu đủ khoản. Nguồn phải đúng Trip/Contract/version. Không refund cọc hoặc tự biến Incident.AdditionalCost thành nợ.'
        o['write']='CreatedBy=DecidedBy từ token, giờ server; OriginalInvoiceID=current final invoice luôn có. Khoản bất biến, không Status/Bearer. REFUND khởi tạo REQUESTED; CHARGE/DISCOUNT chưa áp khi AdjustedInvoiceID null. Chặn tạo payment-session/tất toán đến khi đã áp các khoản này. Không sửa signed Contract.'
    if o['id']=='F6-J24':o['guard']+=' Không có CHARGE/DISCOUNT chưa áp hóa đơn hoặc refund/review chưa đối soát; đối chiếu total invoice với Balance trước redirect.'
    if o['id']=='F6-J22':o['write']+=' Invoice đầu lấy giá ký trừ cọc, chưa có adjustment. Các lần thay chỉ áp batch chưa áp có OriginalInvoiceID=current invoice; khoản nguồn khác bị chặn. BE check số tiền sau công thức không âm hoặc tràn SQL.'
    if o['id'] in ['F6-J11','F6-J19','F6-J29','F6-J34']:
        o['write']+=' Header Idempotency-Key bắt buộc: cùng key/actor/operation và cùng payload trả bản ghi đã tạo; cùng key khác payload trả 409 IDEMPOTENCY_CONFLICT. Module idempotency bền vững phải lưu kết quả trước trả response; chưa tích hợp thì 501, không giả bảo đảm retry.'

# Conditional schemas are authored from rules, never learned from examples.
obj('HorseIdentity',{'name':text('Tên ngựa đóng băng lúc lập bản, không đọc master khi xem cũ.','HANDOVER_REVISION.ContentSnapshot.items.identity.name ← HORSE.Name','Thunderbolt',100),'microchip':text('Mã chip đã dùng đối chiếu tại lần giao.','HANDOVER_REVISION.ContentSnapshot.items.identity.microchip ← HORSE.Microchip_ISO','985112004571029',50)})
obj('SnapshotItem',dict(copy.deepcopy(S['DeliveryItem']['properties']),identity=ref('HorseIdentity','Danh tính BE lấy từ hồ sơ và lưu vào snapshot; caller không được sửa.','HANDOVER_REVISION.ContentSnapshot.items.identity')))
obj('FrozenContent',dict(copy.deepcopy(S['DeliveryContent']['properties']),items=arr(R('SnapshotItem'),'Kiểm tra thực tế cùng danh tính đóng băng; không dựng master khi đọc lại.','HANDOVER_REVISION.ContentSnapshot.items',1)))
S['Revision']['properties']['content']=ref('FrozenContent','Toàn bộ bản trình người nhận; danh tính ngựa BE đóng băng, input không tự cấp.','HANDOVER_REVISION.ContentSnapshot')
S['Adjustment']['properties']['originalInvoiceId']=ident('INVOICE','API mới bắt buộc invoice cơ sở trước quyết định; null SQL chỉ dành dữ liệu cũ chưa tương thích.','SETTLEMENT_ADJUSTMENT.OriginalInvoiceID')
S['Adjustment'].setdefault('allOf',[]).extend([
 {'if':{'properties':{'type':{'const':'REFUND'}}},'then':{'properties':{'refundStatus':{'enum':['REQUESTED','PROCESSING','COMPLETED']},'adjustedInvoiceId':{'type':'null'}}}},
 {'if':{'properties':{'type':{'enum':['CHARGE','DISCOUNT']}}},'then':{'properties':{'refundStatus':{'type':'null'}}}}])
for o in OPS:
    if o['id'] in ['F6-J03','F6-J06','F6-J11']:o['write']+=' BE chụp tên và chip từng ngựa vào content.items.identity; request chỉ có horseId/kết quả kiểm, không nhận identity do FE tự cấp.'
def require_state(name,state,required_nonnull,required_null):
    schema=S[name]
    then={'properties':{k:{'not':{'type':'null'}} for k in required_nonnull}}
    then['properties'].update({k:{'type':'null'} for k in required_null})
    schema.setdefault('allOf',[]).append({'if':{'properties':{'status':{'const':state}},'required':['status']},'then':then})
require_state('Revision','DRAFT',[],['confirmedAtUtc','refusalReason','refusedAtUtc'])
require_state('Revision','AWAITING_OTP',[],['confirmedAtUtc','refusalReason','refusedAtUtc'])
require_state('Revision','CONFIRMED',['confirmedAtUtc'],['refusalReason','refusedAtUtc'])
require_state('Revision','REFUSED',['refusalReason','refusedAtUtc'],['confirmedAtUtc'])
require_state('Settlement','DRAFT',[],['settledAtUtc','closedAtUtc','feedbackStartsAtUtc','feedbackEndsAtUtc'])
require_state('Settlement','AWAITING_PAYMENT',['handoverRevisionId','finalInvoiceId'],['settledAtUtc','closedAtUtc','feedbackStartsAtUtc','feedbackEndsAtUtc'])
require_state('Settlement','SETTLED',['handoverRevisionId','finalInvoiceId','settledAtUtc','feedbackStartsAtUtc','feedbackEndsAtUtc'],['closedAtUtc'])
require_state('Settlement','CLOSED',['handoverRevisionId','finalInvoiceId','settledAtUtc','closedAtUtc','feedbackStartsAtUtc','feedbackEndsAtUtc'],[])
require_state('Case','RESOLVED',['resolution','resolvedAtUtc'],[])
require_state('Case','OPEN',[],['resolvedAtUtc'])
require_state('Case','IN_PROGRESS',[],['resolvedAtUtc'])
require_state('Refund','COMPLETED',['reference','refundedAtUtc'],[])
require_state('Refund','REQUESTED',[],['reference','refundedAtUtc'])
require_state('Refund','PROCESSING',[],['reference','refundedAtUtc'])
# Delivery DTO snapshots are kept separate from operational timestamps.
S['OtpState']['properties']['expiresAtUtc']['example']='2026-11-20T10:05:00Z'
S['OtpState']['properties']['resendAfterUtc']['example']='2026-11-20T10:01:00Z'
S['InvoiceInput']['properties']['dueAtUtc']['example']='2026-11-22T10:00:00Z'
S['PaymentSession']['properties']['expiresAtUtc']['example']='2026-11-20T10:15:00Z'
S['RefundInput']['properties']['refundedAtUtc']['example']='2026-11-20T11:00:00Z'

def example(sc):
    if '$ref' in sc:return example(S[sc['$ref'].split('/')[-1]])
    if 'example' in sc:return copy.deepcopy(sc['example'])
    if 'anyOf' in sc:return example(sc['anyOf'][0])
    if sc.get('type')=='object':return {k:example(v) for k,v in sc['properties'].items() if k in sc.get('required',[])}
    if sc.get('type')=='array':return [example(sc['items'])] if sc.get('minItems',0) else []
    raise ValueError(sc)
def dto(n):return {'type':'array','items':R(n[:-2])} if n.endswith('[]') else R(n)
def result(o):
    if o['response']=='Binary':return None
    d=example(dto(o['response']))
    if o['response'].endswith('[]'):d=[example(R(o['response'][:-2]))]
    if o['response']=='Revision':
        if o['id']=='F6-J10':d.update(status='REFUSED',refusalReason='Người nhận yêu cầu kiểm tra thêm.',refusedAtUtc='2026-11-20T10:05:00Z')
        if o['id'] in ['F6-J41','F6-J42']:d.update(status='CONFIRMED',confirmedAtUtc='2026-11-20T10:04:00Z')
    if o['response']=='ConfirmedDelivery':
        d['revision'].update(status='CONFIRMED',confirmedAtUtc='2026-11-20T10:04:00Z')
        d['lifecycle'].update(tripStatus='COMPLETED',requestStatus='DELIVERED',contractStatus='EFFECTIVE')
    if o['response']=='Settlement' and o['id'] in ['F6-J26','F6-J36']:
        d.update(status='SETTLED',handoverRevisionId='HANDOVER_REVISION_001',finalInvoiceId='INVOICE_001',settledAtUtc='2026-11-20T10:00:00Z',feedbackStartsAtUtc='2026-11-20T10:00:00Z',feedbackEndsAtUtc='2026-11-21T10:00:00Z')
    if o['response']=='Case' and o['id'] in ['F6-J32','F6-J33']:
        d['status']='IN_PROGRESS' if o['id']=='F6-J32' else 'RESOLVED'
        if o['id']=='F6-J33':d.update(resolution='Đã giải thích và xử lý theo thỏa thuận.',resolvedAtUtc='2026-11-20T11:00:00Z')
    if o['response']=='Refund':
        d['status']='PROCESSING' if o['id']=='F6-J27' else 'COMPLETED'
        if o['id']=='F6-J28':d.update(reference='REFUND-REAL-001',refundedAtUtc='2026-11-20T11:00:00Z')
    if o['response']=='CloseResult':d['lifecycle'].update(tripStatus='COMPLETED',requestStatus='CLOSED',contractStatus='CLOSED')
    return {'success':True,'message':o['title']+' thành công','data':d}
PREFIX={'tripId':'TRIP','handoverId':'HANDOVER','revisionId':'HANDOVER_REVISION','settlementId':'SETTLEMENT','invoiceId':'INVOICE','paymentId':'PAYMENT','adjustmentId':'SETTLEMENT_ADJUSTMENT','caseId':'CUSTOMER_CASE'}
def build():
    spec={'openapi':'3.1.0','info':{'title':'Flow 6 — Bàn giao, nghiệm thu và chăm sóc khách hàng','version':'1.0.0','description':'Target contract; chưa chứng nhận backend/database tích hợp.'},'servers':[{'url':'/api'}],'security':[{'bearerAuth':[]}],'paths':{},'components':{'securitySchemes':{'bearerAuth':{'type':'http','scheme':'bearer'}},'schemas':S}}
    for o in OPS:
        if o['response']=='Binary':
            operation={'operationId':o['id'],'summary':o['title'],'description':o['guard'],'x-role':o['role'],'x-implementation-status':'target-unverified','parameters':[], 'responses':{'200':{'description':'Authorized PDF rendered from immutable snapshot; no JSON envelope','content':{'application/pdf':{'schema':{'type':'string','format':'binary'}}}}}}
            for p in re.findall(r'{(\w+)}',o['path']):operation['parameters'].append({'name':p,'in':'path','required':True,'schema':ident(PREFIX[p],'ID tài nguyên đúng quyền.','Resource URL')})
            for code in ['400','401','403','404','409','500','501']:operation['responses'][code]={'description':'JSON error','content':{'application/json':{'schema':R('Error')}}}
            spec['paths'].setdefault(o['path'],{})[o['method'].lower()]=operation
            continue
        S[o['id']+'Response']={'type':'object','required':['success','message','data'],'properties':{'success':{'const':True},'message':{'type':'string'},'data':dto(o['response'])},'additionalProperties':False}
        operation={'operationId':o['id'],'summary':o['title'],'description':o['guard']+'\n'+o['write'],'x-role':o['role'],'x-implementation-status':'target-unverified','parameters':[], 'responses':{str(o['code']):{'description':'Thành công','content':{'application/json':{'schema':R(o['id']+'Response'),'example':result(o)}}}}}
        for param in re.findall(r'{(\w+)}',o['path']):operation['parameters'].append({'name':param,'in':'path','required':True,'schema':ident(PREFIX[param],'ID đúng loại từ URL, không lặp body.','Resource URL')})
        if o['id'] in ['F6-J11','F6-J19','F6-J29','F6-J34']:
            operation['parameters'].append({'name':'Idempotency-Key','in':'header','required':True,'schema':{'type':'string','format':'uuid'},'description':'UUID key từ caller, không phải ID bản ghi hoặc rowVersion; cùng key khác payload trả 409.'})
        if o['request']:operation['requestBody']={'required':True,'content':{'application/json':{'schema':R(o['request']),'example':example(R(o['request']))}}}
        if o['id'] in ['F6-J14','F6-J31']:
            vals=['DRAFT','AWAITING_PAYMENT','SETTLED','CLOSED'] if o['id']=='F6-J14' else ['OPEN','IN_PROGRESS','RESOLVED']
            operation['parameters'].append({'name':'status','in':'query','required':False,'schema':{'type':'string','enum':vals}})
            if o['id']=='F6-J31':operation['parameters'].append({'name':'type','in':'query','required':False,'schema':{'type':'string','enum':['COMPLAINT','SUPPORT']}})
        for code in ['400','401','403','404','409','429','500','501']:
            operation['responses'][code]={'description':'Common error; xem FLOW6.md','content':{'application/json':{'schema':R('Error')}}}
        spec['paths'].setdefault(o['path'],{})[o['method'].lower()]=operation
    return spec
def write_json(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def generate():
    spec=build()
    write_json(ROOT/'flow6.openapi.json',spec)
    lines=['# Flow 6 — JSON Request / Response','', '> Sinh từ build_openapi.py, không sửa ví dụ độc lập. FLOW6.md quy định nghiệp vụ; schema quyết định required/nullable/giới hạn.','', '| ID | Method | Path sau /api | Tác dụng |','|---|---|---|---|']
    for o in OPS:lines.append(f"| {o['id']} | {o['method']} | `{o['path']}` | {o['title']} |")
    for o in OPS:
        lines+=['',f"## {o['id']} — {o['method']} {o['path']}",'',o['title']+'.','', '**Quyền:** '+o['role'],'','**Điều kiện:** '+o['guard'],'','**Ghi dữ liệu / retry:** '+(o['write'] or 'Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.'),'']
        params=re.findall(r'{(\w+)}',o['path'])
        if params:lines+=['**Path parameters:** '+', '.join(f'`{v}={PREFIX[v]}_001`' for v in params)+'. ID chỉ ở URL, không lặp body.','']
        if o['id'] in ['F6-J11','F6-J19','F6-J29','F6-J34']:lines+=['**Header bắt buộc:** `Idempotency-Key: 7b9e8dc2-7357-4ef8-a765-2e7c7ee97001`.','']
        if o['id'] in ['F6-J14','F6-J31']:lines+=['**Query tùy chọn:** status theo enum OpenAPI'+('; type=COMPLAINT/SUPPORT' if o['id']=='F6-J31' else '')+'. Bỏ filter trả toàn bộ trong quyền.','']
        lines+=['**Request:** '+(f"JSON `{o['request']}`" if o['request'] else 'Không gửi body; không gửi {} hoặc null thay thế.')]
        if o['request']:lines+=['','```json',json.dumps(example(R(o['request'])),ensure_ascii=False,indent=2),'```']
        error_http='404' if o['error'].endswith('NOT_FOUND') or o['error'] in ['NOT_FOUND','DELIVERY_NOT_CONFIRMED'] else '429' if o['error']=='OTP_RESEND_TOO_SOON' else '403' if o['error']=='FORBIDDEN_ROLE' else '409'
        lines+=['',f"**Response {o['code']} — {o['response']}**",'']
        if o['response']=='Binary':lines+=['```http','HTTP/1.1 200 OK','Content-Type: application/pdf','Content-Disposition: attachment; filename="delivery.pdf"','','<bytes PDF sinh từ đúng snapshot>','```']
        else:lines+=['```json',json.dumps(result(o),ensure_ascii=False,indent=2),'```']
        lines+=['',f'**Lỗi nghiệp vụ tiêu biểu — HTTP {error_http}**','','```json',json.dumps({'success':False,'message':'Không thể thực hiện thao tác: '+o['title'].lower()+'.','data':None,'errorCode':o['error']},ensure_ascii=False,indent=2),'```']
    (ROOT/'FLOW6-API-JSON.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    lines=['# Flow 6 — Từ điển field / nguồn dữ liệu','', 'Sinh từ explicit schemas. Required=property phải hiện diện; nullable=được nhận null. Optional thiếu thì bỏ, không giả giá trị. Mọi object từ chối property ngoài schema.','', 'ID chỉ ở URL khi mutation định danh resource. Không có alias code/number/id trùng nghĩa: number chỉ RevisionNo. Không history/audit/timeline riêng.','']
    for name,sc in list(S.items()):
        if name.startswith('F6-'):continue
        lines+=['## '+name,'','| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |','|---|---|---|---|---|']
        for k,v in sc['properties'].items():
            kind=v.get('$ref','').split('/')[-1] or str(v.get('type','nullable reference' if 'anyOf' in v else 'const'))
            detail='; '.join(x+'='+str(v[x]) for x in ['enum','minLength','maxLength','minimum','maximum','format'] if x in v)
            lines.append('| `'+k+'` | '+(kind+'; '+detail).replace('|','/')+' | '+('Có' if k in sc.get('required',[]) else 'Không')+' | '+v.get('description','')+' | `'+v.get('x-source','')+'` |')
        lines+=['']
    (ROOT/'FIELD-DICTIONARY.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    sources=['HorseTransportDB/HorseTransportDB_Reviewed.sql','data/HorseTransportDB_Reviewed.sql','data/ID_NAME_RULE_Reviewed.md','data/DATABASE_STATUS_CONVENTION.md','data/FLOW6_DATABASE_DESIGN_Reviewed.md','data/SE2040_Group2_ASM2 (1).docx','contracts/API-Flow/Flow6/FLOW4_TO_FLOW6_HANDOFF.md']
    write_json(ROOT/'source-manifest.json',{p:hashlib.sha256((REPO/p).read_bytes()).hexdigest() for p in sources})
    print(f'Built {len(OPS)} operations, {len(S)} schemas and JSON/dictionary documents.')
if __name__=='__main__':generate()
