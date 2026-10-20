import React, { useState, useMemo } from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';
import { mockCustomerHorses } from '../../data/mockData';
import type { CustomerHorse } from '../../types';
import { HorseModal } from './HorseModal';
import './MyHorsesPage.css';

type HorseFilterTab = 'all' | 'submitted' | 'unsubmitted';

export const MyHorsesPage: React.FC = () => {
  const [horses, setHorses] = useState<CustomerHorse[]>(mockCustomerHorses);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<HorseFilterTab>('all');

  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'view' | 'add' | 'edit';
    selectedHorse: CustomerHorse | null;
  }>({
    isOpen: false,
    mode: 'view',
    selectedHorse: null,
  });

  const filteredHorses = useMemo(() => {
    return horses.filter((horse) => {
      const matchSearch =
        horse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horse.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horse.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horse.microchip.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'submitted' && horse.submissionStatus === 'submitted') ||
        (activeTab === 'unsubmitted' && horse.submissionStatus === 'unsubmitted');

      return matchSearch && matchTab;
    });
  }, [horses, searchTerm, activeTab]);

  const handleOpenAdd = () => {
    setModalState({
      isOpen: true,
      mode: 'add',
      selectedHorse: null,
    });
  };

  const handleOpenView = (horse: CustomerHorse) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      selectedHorse: horse,
    });
  };

  const handleOpenEdit = (horse: CustomerHorse) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      selectedHorse: horse,
    });
  };

  const handleSaveHorse = (horseData: CustomerHorse) => {
    if (modalState.mode === 'add') {
      setHorses((prev) => [horseData, ...prev]);
    } else {
      setHorses((prev) =>
        prev.map((h) => (h.id === horseData.id ? horseData : h))
      );
    }
  };

  return (
    <CustomerLayout pageTitle="Ngựa của tôi" activeNav="horses">
      <div className="customer-horses-page my-horses-page">
        {/* ==================== PAGE HEADER ==================== */}
        <section className="customer-horses-header my-horses-header">
          <div className="customer-horses-titles">
            <h2 className="customer-horses-title my-horses-title">Ngựa của tôi</h2>
            <p className="customer-horses-subtitle my-horses-subtitle">
              Hồ sơ ngựa cá nhân. Thêm hoặc sửa ngựa không gửi đến chuyên viên. Chỉ khi đơn vận chuyển được kích hoạt, chuyên viên mới kiểm tra hồ sơ gắn với đơn.
            </p>
          </div>

          <button type="button" className="btn-add-horse" onClick={handleOpenAdd}>
            <span className="btn-add-horse-icon">+</span>
            <span>Thêm ngựa</span>
          </button>
        </section>

        {/* ==================== SEARCH & FILTER TABS ==================== */}
        <div className="horses-filter-row">
          <div className="horses-search-box">
            <svg
              className="horses-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="horses-search-input"
              placeholder="Tìm theo tên, mã, giống hoặc vi mạch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="horses-filter-buttons-group">
            <button
              type="button"
              className={`horses-filter-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả ngựa
            </button>
            <button
              type="button"
              className={`horses-filter-btn ${activeTab === 'submitted' ? 'active' : ''}`}
              onClick={() => setActiveTab('submitted')}
            >
              Đã nộp cùng đơn
            </button>
            <button
              type="button"
              className={`horses-filter-btn ${activeTab === 'unsubmitted' ? 'active' : ''}`}
              onClick={() => setActiveTab('unsubmitted')}
            >
              Chưa nộp
            </button>
          </div>
        </div>

        {/* ==================== HORSES CARDS GRID ==================== */}
        <div className="horses-grid">
          {filteredHorses.length > 0 ? (
            filteredHorses.map((horse) => {
              const isMissingMicrochip =
                !horse.microchip || horse.microchip === 'Chưa cung cấp';

              return (
                <div key={horse.id} className="horse-card">
                  {/* Image container */}
                  <div className="horse-image-container">
                    <span className="horse-placeholder-label">Ảnh ngựa</span>
                    <span
                      className={`horse-submission-badge ${
                        horse.submissionStatus === 'unsubmitted' ? 'unsubmitted' : 'submitted'
                      }`}
                    >
                      {horse.submissionBadgeText}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="horse-card-body">
                    <div className="horse-title-row">
                      <h3 className="horse-name">{horse.name}</h3>
                      <span className="horse-code">Mã: {horse.id}</span>
                    </div>

                    <p className="horse-breed-line">
                      {horse.breed} • {horse.gender} • {horse.age} tuổi
                    </p>

                    {/* Specifications */}
                    <div className="horse-specs-list">
                      <div className="spec-item">
                        <span className="spec-name">Vi mạch</span>
                        <span className="spec-val">
                          {horse.microchip}
                        </span>
                      </div>

                      <div className="spec-item">
                        <span className="spec-name">Hồ sơ</span>
                        <span className="spec-val">{horse.profileStatus}</span>
                      </div>

                      <div className="spec-item">
                        <span className="spec-name">Bản quét hộ chiếu</span>
                        <span className="spec-val">{horse.passportScanStatus}</span>
                      </div>

                      <div className="spec-item">
                        <span className="spec-name">Hồ sơ y tế cơ bản</span>
                        <span className="spec-val">{horse.medicalRecordStatus}</span>
                      </div>
                    </div>

                    {/* Transport Usage */}
                    <div className="horse-usage-card">
                      <span className="usage-title">
                        {horse.usageCount > 0
                          ? `Đã dùng trong ${horse.usageCount} yêu cầu vận chuyển`
                          : 'Chưa dùng trong yêu cầu nào'}
                      </span>
                      {horse.latestRoute && (
                        <span className="usage-route">
                          Gần nhất: {horse.latestRoute}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="horse-card-actions">
                      <button
                        type="button"
                        className="btn-card-view"
                        onClick={() => handleOpenView(horse)}
                      >
                        Xem chi tiết
                      </button>
                      <button
                        type="button"
                        className="btn-card-edit"
                        onClick={() => handleOpenEdit(horse)}
                      >
                        {isMissingMicrochip ? 'Hoàn thiện hồ sơ' : 'Sửa thông tin'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-horses-box">
              Không tìm thấy hồ sơ ngựa nào phù hợp với bộ lọc hiện tại.
            </div>
          )}
        </div>
      </div>

      {/* Horse Modal for View / Add / Edit */}
      <HorseModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        horse={modalState.selectedHorse}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onSave={handleSaveHorse}
      />
    </CustomerLayout>
  );
};

export default MyHorsesPage;
