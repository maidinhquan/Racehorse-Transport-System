import React from 'react';
import type { TransportRequestItem } from '../../types';

interface RequestDetailModalProps {
  request: TransportRequestItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (id: string) => void;
  onRequestRevision?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  isOpen,
  onClose,
  onAccept,
  onRequestRevision,
  onReject,
}) => {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#1a1b1f] border border-[#2e2f38] rounded-xl shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2b33] bg-[#141518]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold text-orange-400">{request.id}</span>
            <span className="text-xs px-2.5 py-1 rounded bg-[#252830] text-gray-300 border border-[#373a46]">
              {request.statusLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#25262c] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Customer & Route summary */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[#22242b] border border-[#2d303b]">
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Khách hàng:</span>
              <span className="text-sm font-semibold text-white">{request.customerName}</span>
              <span className="text-xs text-gray-400 block mt-0.5">{request.contactPerson} • {request.phone}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Tuyến đường & Khởi hành:</span>
              <span className="text-sm font-semibold text-white">{request.routeDisplay}</span>
              <span className="text-xs text-orange-400 block mt-0.5">Khởi hành: {request.departureDate} ({request.daysRemainingText})</span>
            </div>
          </div>

          {/* Horses */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Danh sách ngựa vận chuyển ({request.horses?.length || 0})
            </h4>
            <div className="space-y-2">
              {request.horses?.map((horse) => (
                <div key={horse.id} className="p-3 rounded-lg bg-[#151619] border border-[#272832] flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-white">{horse.name}</span>
                    <span className="text-xs text-gray-400 ml-2">({horse.breed}, {horse.age} tuổi)</span>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">Microchip: {horse.microchipId}</div>
                  </div>
                  <div className="flex gap-1.5 text-[11px]">
                    <span className={`px-2 py-0.5 rounded ${horse.documents.passport ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                      Hộ chiếu
                    </span>
                    <span className={`px-2 py-0.5 rounded ${horse.documents.quarantineCert ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                      Kiểm dịch
                    </span>
                    <span className={`px-2 py-0.5 rounded ${horse.documents.bloodTest ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                      Xét nghiệm máu
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Requirements */}
          {request.specialRequirements && (
            <div className="p-3 rounded-lg bg-[#191b22] border border-[#272935]">
              <span className="text-xs text-gray-400 block mb-1">Yêu cầu đặc biệt từ khách hàng:</span>
              <p className="text-xs text-gray-300 leading-relaxed">{request.specialRequirements}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2b33] bg-[#141518]">
          <div className="flex items-center gap-2">
            {onReject && request.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => {
                  onReject(request.id);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/30 transition-colors"
              >
                Từ chối
              </button>
            )}
            {onRequestRevision && request.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => {
                  onRequestRevision(request.id);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg border border-amber-500/30 transition-colors"
              >
                Yêu cầu sửa đổi
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-300 bg-[#25262d] hover:bg-[#2d2f38] rounded-lg transition-colors"
            >
              Đóng
            </button>
            {onAccept && request.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => {
                  onAccept(request.id);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-lg shadow-orange-600/30 transition-colors"
              >
                Chấp nhận yêu cầu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailModal;
