import { useState } from 'react';
import './SpecialistDashboard.css';

function SpecialistDashboard() {
  const [activeMenu, setActiveMenu] = useState('documents');
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);

  const [documents, setDocuments] = useState([
    { id: 'doc-1', name: 'Hộ chiếu ngựa (Equine Passport)', type: 'Bắt buộc', status: 'pending', file: 'passport_scan.pdf' },
    { id: 'doc-2', name: 'Sổ tiêm phòng (Vaccination Record)', type: 'Bắt buộc', status: 'approved', file: 'vaccine_record.jpg' },
    { id: 'doc-3', name: 'Giấy chứng nhận sở hữu', type: 'Tùy chọn', status: 'pending', file: 'ownership.pdf' },
  ]);

  const handleApprove = (id: string) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, status: 'approved' } : d));
    setRejectingDocId(null);
  };

  const handleReject = (id: string) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, status: 'rejected' } : d));
    setRejectingDocId(null);
  };

  const handleSubmitPackage = () => {
    const hasPending = documents.some(d => d.status === 'pending');
    const hasRejected = documents.some(d => d.status === 'rejected');

    if (hasPending) {
      alert("⚠️ Vui lòng duyệt hoặc từ chối tất cả các tài liệu trước khi gửi hệ thống!");
      return;
    }

    if (hasRejected) {
      alert("❌ Yêu cầu Khách hàng bổ sung các giấy tờ bị từ chối.");
    } else {
      alert("✅ Bộ hồ sơ hợp lệ. Chuyển trạng thái sang 'Sẵn sàng khởi hành'.");
    }
  };

  const renderDocumentReview = () => (
    <div className="fade-in flex-col-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thẩm định Hồ sơ (Mã chuyến: TRP-2026)</h1>
          <p className="page-subtitle">Kiểm tra tài liệu từ khách hàng, duyệt hoặc yêu cầu bổ sung trước khi chốt hồ sơ.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSubmitPackage}>
          📤 Hoàn tất & Gửi hệ thống
        </button>
      </div>

      <div className="data-section">
        <h2 className="section-title">Hồ sơ cá thể: Thunderbolt (Chip: 982001928374)</h2>
        
        <div className="doc-list">
          {documents.map((doc) => (
            <div key={doc.id} className="doc-item">
              <div className="doc-item-main">
                <div className="doc-info">
                  <div className="doc-icon">📄</div>
                  <div>
                    <h3 className="doc-title">{doc.name}</h3>
                    <p className="doc-desc">
                      Loại: {doc.type} | Tệp đính kèm: <span className="doc-link">{doc.file}</span>
                    </p>
                  </div>
                </div>

                <div className="doc-actions">
                  {doc.status === 'approved' && <span className="badge badge-approved">✅ Đã duyệt</span>}
                  {doc.status === 'rejected' && <span className="badge badge-rejected">❌ Đã từ chối</span>}
                  
                  {doc.status === 'pending' && (
                    <>
                      <button className="btn btn-success" onClick={() => handleApprove(doc.id)}>
                        Duyệt
                      </button>
                      <button 
                        className="btn btn-outline-danger" 
                        onClick={() => setRejectingDocId(rejectingDocId === doc.id ? null : doc.id)}
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                </div>
              </div>

              {rejectingDocId === doc.id && doc.status === 'pending' && (
                <div className="reject-box fade-in">
                  <label className="reject-label">
                    Lý do từ chối (Khách hàng sẽ nhận được thông báo này):
                  </label>
                  <textarea 
                    className="reject-input"
                    placeholder="Ví dụ: Ảnh chụp bị mờ, không rõ sơ đồ nhận dạng. Vui lòng scan lại bản gốc..."
                  ></textarea>
                  <div className="reject-actions">
                    <button className="btn btn-ghost" onClick={() => setRejectingDocId(null)}>Hủy</button>
                    <button className="btn btn-danger" onClick={() => handleReject(doc.id)}>Xác nhận Từ chối</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = (title: string) => (
    <div className="fade-in" style={{ textAlign: 'center', marginTop: '80px', color: '#6B7280' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
      <h2 style={{ color: '#111827' }}>Chức năng {title}</h2>
      <p>Module này đang trong quá trình phát triển.</p>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return renderPlaceholder('Tổng quan Hồ sơ (Dashboard)');
      case 'documents': return renderDocumentReview();
      case 'customs': return renderPlaceholder('Thông quan & Hải quan');
      case 'checklists': return renderPlaceholder('Tra cứu Quy định (Checklists)');
      default: return renderDocumentReview();
    }
  };

  return (
    <div className="specialist-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-title">CNB <span>TRANSPORT</span></h2>
          <p className="role-title">Specialist Portal</p>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveMenu('dashboard')}>
            <span>📊 Dashboard</span>
          </button>
          
          <button className={`nav-item ${activeMenu === 'documents' ? 'active' : ''}`} onClick={() => setActiveMenu('documents')}>
            <span>📝 Thẩm định Hồ sơ</span>
            <span className="badge-alert">3</span>
          </button>
          
          <button className={`nav-item ${activeMenu === 'customs' ? 'active' : ''}`} onClick={() => setActiveMenu('customs')}>
            <span>🛂 Thông quan & Hải quan</span>
          </button>

          <button className={`nav-item ${activeMenu === 'checklists' ? 'active' : ''}`} onClick={() => setActiveMenu('checklists')}>
            <span>🔍 Tra cứu Quy định</span>
          </button>
        </nav>
      </aside>

      {/* NỘI DUNG CHÍNH */}
      <div className="content-wrapper">
        <header className="top-bar">
          <h1 className="top-bar-title">Quản lý Pháp lý & Kiểm dịch</h1>
          <div className="top-bar-right">
            <div className="user-profile">
              <div className="avatar">TS</div>
              <div className="user-info">
                <span className="user-name">Phạm Chuyên Viên</span>
                <span className="user-role">Transport Specialist</span>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default SpecialistDashboard;