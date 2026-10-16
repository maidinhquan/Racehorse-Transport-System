import { useState } from 'react';
import './SpecialistDashboard.css';

function SpecialistDashboard() {
  // --------------------------------------------------------
  // 1. STATE QUẢN LÝ DỮ LIỆU & GIAO DIỆN
  // --------------------------------------------------------
  // activeMenu: Điều hướng giữa các trang (Dashboard, Documents, Customs...)
  const [activeMenu, setActiveMenu] = useState('documents');
  
  // rejectingDocId: Lưu ID của tài liệu đang được bấm "Từ chối" để mở khung nhập lý do
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  
  // rejectReasonText: Lưu nội dung lý do từ chối do chuyên viên gõ vào textarea
  const [rejectReasonText, setRejectReasonText] = useState('');

  // documents: Mảng mô phỏng dữ liệu giấy tờ của 1 chuyến do khách hàng tải lên
  const [documents, setDocuments] = useState([
    { id: 'doc-1', name: 'Hộ chiếu ngựa (Equine Passport)', type: 'Bắt buộc', status: 'pending', file: 'passport_scan.pdf', reason: '' },
    { id: 'doc-2', name: 'Sổ tiêm phòng (Vaccination Record)', type: 'Bắt buộc', status: 'approved', file: 'vaccine_record.jpg', reason: '' },
    { id: 'doc-3', name: 'Giấy chứng nhận sở hữu', type: 'Thương mại', status: 'pending', file: 'ownership.pdf', reason: '' },
  ]);

  // --------------------------------------------------------
  // 2. CÁC HÀM XỬ LÝ NGHIỆP VỤ (BUSINESS LOGIC)
  // --------------------------------------------------------

  /**
   * Cập nhật tiêu đề Top Bar dựa vào menu đang chọn
   */
  const getTopBarTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'Tổng quan Hồ sơ';
      case 'assigned': return 'Yêu cầu được phân công';
      case 'documents': return 'Thẩm định Tài liệu (Document Review)';
      case 'customs': return 'Thông quan & Hải quan (Customs)';
      case 'history': return 'Lịch sử xử lý';
      default: return 'Specialist Dashboard';
    }
  };

  /**
   * Xử lý bấm nút "Duyệt" (Approve) 1 giấy tờ
   */
  const handleApprove = (id: string) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, status: 'approved', reason: '' } : d));
    setRejectingDocId(null); // Đóng khung từ chối nếu đang mở
  };

  /**
   * Mở khung nhập lý do từ chối
   */
  const openRejectForm = (id: string) => {
    setRejectingDocId(id);
    setRejectReasonText(''); // Xóa text cũ
  };

  /**
   * Xác nhận "Từ chối" (Reject) sau khi đã nhập lý do
   */
  const confirmReject = (id: string) => {
    if (!rejectReasonText.trim()) {
      alert("Vui lòng nhập lý do từ chối để khách hàng biết đường sửa!");
      return;
    }
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, status: 'rejected', reason: rejectReasonText } : d));
    setRejectingDocId(null);
  };

  /**
   * Gom toàn bộ kết quả thẩm định và Gửi lên hệ thống (Submit)
   * Chặn gửi nếu còn giấy tờ đang ở trạng thái 'pending'
   */
  const handleSubmitPackage = () => {
    const hasPending = documents.some(d => d.status === 'pending');
    const hasRejected = documents.some(d => d.status === 'rejected');

    if (hasPending) {
      alert("⚠️ LỖI: Vui lòng thẩm định (Duyệt/Từ chối) tất cả các tài liệu trước khi gửi!");
      return;
    }

    if (hasRejected) {
      alert("❌ ĐÃ GỬI HỆ THỐNG: Có giấy tờ bị từ chối. Hệ thống đã gửi thông báo kèm lý do về cho khách hàng yêu cầu bổ sung.");
    } else {
      alert("✅ THÀNH CÔNG: Bộ hồ sơ hợp lệ 100%. Đã chốt hồ sơ và chuyển trạng thái chuyến sang 'Sẵn sàng khởi hành'.");
    }
  };

  // --------------------------------------------------------
  // 3. CÁC HÀM RENDER GIAO DIỆN CON
  // --------------------------------------------------------

  /**
   * Giao diện chính: Thẩm định Giấy tờ (Document Review)
   */
  const renderDocumentReview = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thẩm định Hồ sơ (Mã chuyến: TRP-2026)</h1>
          <p className="page-subtitle">Kiểm tra tài liệu từ khách hàng, duyệt hoặc yêu cầu bổ sung trước khi chốt hồ sơ.</p>
        </div>
        <button className="btn-primary" onClick={handleSubmitPackage}>
          📤 Hoàn tất & Gửi hệ thống
        </button>
      </div>

      <div className="dashboard-card">
        <h2 className="section-title" style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
          Hồ sơ cá thể: Thunderbolt (Chip: 982001928374)
        </h2>
        
        <div>
          {documents.map((doc) => (
            <div key={doc.id} className="doc-item">
              <div className="doc-item-main">
                
                <div className="doc-info">
                  <div className="doc-icon">📄</div>
                  <div>
                    <h3 className="doc-title">{doc.name}</h3>
                    <p className="doc-desc">Phân loại: {doc.type} | Tệp đính kèm: <span className="doc-link">{doc.file}</span></p>
                  </div>
                </div>

                <div className="doc-actions">
                  {doc.status === 'approved' && <span className="badge badge-approved">✅ Đã duyệt</span>}
                  {doc.status === 'rejected' && <span className="badge badge-rejected">❌ Đã từ chối</span>}
                  
                  {doc.status === 'pending' && (
                    <>
                      <button className="btn-success" onClick={() => handleApprove(doc.id)}>Duyệt</button>
                      <button className="btn-outline-danger" onClick={() => openRejectForm(doc.id)}>Từ chối</button>
                    </>
                  )}
                </div>
              </div>

              {/* Khung Từ chối (Chỉ hiện khi bấm nút Từ chối) */}
              {rejectingDocId === doc.id && doc.status === 'pending' && (
                <div className="reject-box fade-in">
                  <label className="reject-label">
                    Lý do từ chối (Khách hàng sẽ nhận được nội dung này để bổ sung):
                  </label>
                  <textarea 
                    className="reject-input"
                    placeholder="Ví dụ: Ảnh chụp bị mờ, không rõ sơ đồ nhận dạng. Vui lòng scan lại bản gốc..."
                    value={rejectReasonText}
                    onChange={(e) => setRejectReasonText(e.target.value)}
                  ></textarea>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button className="btn-ghost" onClick={() => setRejectingDocId(null)}>Hủy</button>
                    <button className="btn-danger" onClick={() => confirmReject(doc.id)}>Xác nhận Từ chối</button>
                  </div>
                </div>
              )}

              {/* Hiển thị lý do nếu đã bị từ chối */}
              {doc.status === 'rejected' && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#991B1B', padding: '8px 12px', backgroundColor: '#FEF2F2', borderLeft: '3px solid #DC2626' }}>
                  <strong>Lý do:</strong> {doc.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /**
   * Giao diện Check-in Hải Quan (Customs)
   */
  const renderCustoms = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Theo dõi Kiểm dịch & Thông quan</h1>
          <p className="page-subtitle">Cập nhật trạng thái pháp lý khi xe đi qua các điểm kiểm soát cơ quan chức năng.</p>
        </div>
      </div>
      <div className="dashboard-card">
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Tiến độ Thủ tục Cửa khẩu</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Trạm kiểm dịch động vật Mộc Bài</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Cập nhật lần cuối: 10:30 AM, 15/10/2026</p>
          </div>
          <button className="btn-success">✅ Đã kiểm dịch xong</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px dashed #D1D5DB', borderRadius: '8px', backgroundColor: '#F9FAFB' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Hải quan Cửa khẩu Bavet (Campuchia)</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Đang chờ xe đến để làm thủ tục nhập cảnh...</p>
          </div>
          <button className="btn-primary" style={{ backgroundColor: '#3B82F6' }}>📍 Check-in Trạng thái</button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'documents': return renderDocumentReview();
      case 'customs': return renderCustoms();
      default: return (
        <div className="fade-in" style={{ textAlign: 'center', marginTop: '80px', color: '#6B7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
          <h2>Chức năng này đang được tích hợp API...</h2>
        </div>
      );
    }
  };

  // --------------------------------------------------------
  // 4. RENDER LAYOUT CHÍNH
  // --------------------------------------------------------
  return (
    <div className="specialist-layout">
      {/* SIDEBAR BÊN TRÁI */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-title">CNB <span>TRANSPORT</span></h2>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-group-title">QUẢN LÝ TỔNG QUAN</div>
          <button className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveMenu('dashboard')}>
            Dashboard
          </button>
          <button className={`nav-item ${activeMenu === 'assigned' ? 'active' : ''}`} onClick={() => setActiveMenu('assigned')}>
            Assigned Requests
          </button>

          <div className="nav-group-title">THẨM ĐỊNH HỒ SƠ</div>
          <button className={`nav-item ${activeMenu === 'documents' ? 'active' : ''}`} onClick={() => setActiveMenu('documents')}>
            <span>Document Review</span>
            <span className="badge-alert">3</span>
          </button>
          <button className={`nav-item ${activeMenu === 'customs' ? 'active' : ''}`} onClick={() => setActiveMenu('customs')}>
            Quarantine & Customs
          </button>
          <button className={`nav-item ${activeMenu === 'checklists' ? 'active' : ''}`} onClick={() => setActiveMenu('checklists')}>
            Requirement Checklist
          </button>

          <div className="nav-group-title">HỆ THỐNG</div>
          <button className={`nav-item ${activeMenu === 'history' ? 'active' : ''}`} onClick={() => setActiveMenu('history')}>
            History / Audit Log
          </button>
        </nav>
      </aside>

      {/* KHỐI NỘI DUNG BÊN PHẢI */}
      <div className="content-wrapper">
        
        {/* TOP BAR */}
        <header className="top-bar">
          <h1 className="top-bar-title">{getTopBarTitle()}</h1>
          <div className="top-bar-right">
            <button className="notification-btn">🔔</button>
            <div className="user-profile">
              <div className="avatar">TS</div>
              <div className="user-info">
                <span className="user-name">Phạm Chuyên Viên</span>
                <span className="user-role">Transport Specialist</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT THAY ĐỔI THEO MENU */}
        <main className="main-content">
          <p><a href="/specialist/flow1-work">Tiếp nhận chuyến và hồ sơ từ Flow 1</a></p>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default SpecialistDashboard;
