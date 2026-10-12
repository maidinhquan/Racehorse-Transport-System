import { type JSX } from 'react';
import ThemeToggle from '../../shared/components/ThemeToggle/ThemeToggle';
import './DriverDashboard.css';

const DriverDashboard = (): JSX.Element => {
  return (
    <div className="driver-dashboard-container dashboard-container min-h-screen bg-[#F8F9FA] font-inter p-4 pb-8">
      <header className="driver-dashboard-header dashboard-header bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm mb-6 flex justify-between items-center">
        <div>
          <h1 className="header-title text-[20px] font-semibold text-[#111827]">Mã chuyến: TRP-2026</h1>
          <p className="header-status text-[14px] text-[#6B7280] mt-1">Trạng thái: Đang di chuyển</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="space-y-4">
        <button className="w-full h-[44px] bg-[#F57C00] hover:bg-[#E65100] text-white font-medium rounded-lg transition-colors shadow-sm">
          Cập nhật mốc hành trình
        </button>

        <button className="w-full h-[44px] bg-white border border-[#E5E7EB] text-[#111827] font-medium rounded-lg shadow-sm">
          Ghi nhật ký y tế (Equine Health)
        </button>

        <button className="w-full h-[44px] bg-white border border-[#E5E7EB] text-[#111827] font-medium rounded-lg shadow-sm">
          Xác nhận bàn giao (Nhập OTP)
        </button>

        <button className="w-full h-[44px] bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors mt-6 shadow-sm">
          Gửi cảnh báo SOS
        </button>
      </div>
    </div>
  );
};

export default DriverDashboard;