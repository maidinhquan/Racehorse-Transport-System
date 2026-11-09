import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ReviewInbox } from './ReviewInbox';

const api = vi.hoisted(() => ({
  queue: vi.fn(), detail: vi.fn(), specialist: vi.fn(), coordinator: vi.fn(),
}));
vi.mock('../../api/requestReviewApi', () => ({ requestReviewApi: api }));

const detail = {
  reviewId: 'REQUEST_REVIEW_001', requestId: 'REQUEST_001', requestRevision: 1,
  status: 'SPECIALIST_PENDING', origin: 'Hà Nội', destination: 'TP.HCM', horseCount: 1,
  mode: 'ROAD', expectedTransportDate: '2026-11-12', expectedDeliveryDate: '2026-11-15',
  options: [{ scheduleOptionId: 'REQUEST_SCHEDULE_OPTION_001', isOriginal: true, mode: 'ROAD',
    expectedTransportDate: '2026-11-12', expectedDeliveryDate: '2026-11-15',
    coordinatorResult: 'FEASIBLE', coordinatorReason: 'Có xe', specialistResult: null,
    checklist: [], checklistVersion: null as string | null }],
};

beforeEach(() => {
  api.queue.mockResolvedValue([{ reviewId: 'REQUEST_REVIEW_001', requestId: 'REQUEST_001', requestRevision: 1,
    origin: 'Hà Nội', destination: 'TP.HCM', expectedTransportDate: '2026-11-12' }]);
  api.detail.mockResolvedValue(detail);
});

async function openReview() {
  render(<ReviewInbox role="specialist" button="btn" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mở xét duyệt' }));
  await screen.findByRole('button', { name: 'Gửi đánh giá hồ sơ' });
  fireEvent.change(screen.getByLabelText('Kết luận hồ sơ'), { target: { value: 'FEASIBLE' } });
}

it('explains why a review cannot be sent when the checklist version is missing', async () => {
  await openReview();
  fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá hồ sơ' }));
  const form = screen.getByRole('button', { name: 'Gửi đánh giá hồ sơ' }).closest('form')!;
  expect(await within(form).findByRole('alert')).toHaveTextContent('Chưa tải được danh sách giấy tờ. Bấm Tải lại rồi gửi đánh giá.');
  expect(api.specialist).not.toHaveBeenCalled();
});

it('shows an API rejection beside the submit button', async () => {
  api.detail.mockResolvedValueOnce({ ...detail, options: [{ ...detail.options[0], checklistVersion: 'version-1' }] });
  api.specialist.mockRejectedValue(new Error('Hồ sơ đã thay đổi. Tải lại checklist.'));
  await openReview();
  fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá hồ sơ' }));
  const form = screen.getByRole('button', { name: 'Gửi đánh giá hồ sơ' }).closest('form')!;
  expect(await within(form).findByRole('alert')).toHaveTextContent('Hồ sơ đã thay đổi. Tải lại checklist.');
  await waitFor(() => expect(api.specialist).toHaveBeenCalledOnce());
});

it('hides flight schedule in coordinator review', async () => {
  api.detail.mockResolvedValueOnce({
    ...detail,
    status: 'COORDINATOR_PENDING',
    resources: {
      vehicles: [{ id: 'VEH_01', type: 'Xe chuyên dụng', plateNumber: '29B-12345', operatingCountry: 'VN', capacityStalls: 2 }],
      flights: [{
        id: 'FL_01', airline: 'Vietnam Airlines', providerFlightCode: 'VN123',
        originAirportPlaceId: 'HAN', destinationAirportPlaceId: 'SGN',
        departureTime: '08:00', arrivalTime: '10:00', departureTimeZone: 'ICT', arrivalTimeZone: 'ICT', capacityHorses: 4,
      }],
    },
  });

  render(<ReviewInbox role="coordinator" button="btn" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mở xét duyệt' }));

  expect(await screen.findByText(/Xe sẵn sàng theo quốc gia và sức chứa/)).toBeInTheDocument();
  expect(screen.queryByText(/Danh mục chuyến bay/)).not.toBeInTheDocument();
  expect(screen.queryByText(/VN123/)).not.toBeInTheDocument();
});

it('hides health certificate and vaccination from specialist checklist and submits valid defaults', async () => {
  const sources = [
    { checklistItemId: 'HOR_1:PASSPORT', horseId: 'HOR_1', horseName: 'Ngựa Bạch Long', documentType: 'PASSPORT', stage: 'BEFORE_CONTRACT', fileAvailable: true, expiryDate: '2027-01-01', usable: true },
    { checklistItemId: 'HOR_1:HEALTH_CERTIFICATE', horseId: 'HOR_1', horseName: 'Ngựa Bạch Long', documentType: 'HEALTH_CERTIFICATE', stage: 'BEFORE_DEPARTURE', fileAvailable: false, expiryDate: null, usable: false },
    { checklistItemId: 'HOR_1:VACCINATION', horseId: 'HOR_1', horseName: 'Ngựa Bạch Long', documentType: 'VACCINATION', stage: 'BEFORE_DEPARTURE', fileAvailable: false, expiryDate: null, usable: false },
  ];

  api.detail.mockResolvedValueOnce({
    ...detail,
    options: [{
      ...detail.options[0],
      checklistVersion: 'v1',
      checklist: sources,
    }],
  });
  api.specialist.mockResolvedValueOnce({ ...detail, status: 'MANAGER_PENDING' });

  render(<ReviewInbox role="specialist" button="btn" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mở xét duyệt' }));

  // PASSPORT should be rendered
  expect(await screen.findByText(/Ngựa Bạch Long · Hộ chiếu FEI/)).toBeInTheDocument();

  // HEALTH_CERTIFICATE and VACCINATION must be hidden from UI
  expect(screen.queryByText(/Ngựa Bạch Long · Giấy kiểm dịch \/ sức khỏe/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Ngựa Bạch Long · Sổ tiêm chủng/)).not.toBeInTheDocument();

  // Set status for visible document (PASSPORT)
  fireEvent.change(screen.getByLabelText('Trạng thái giấy tờ'), { target: { value: 'VERIFIED' } });
  fireEvent.change(screen.getByLabelText('Kết luận hồ sơ'), { target: { value: 'FEASIBLE' } });

  fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá hồ sơ' }));

  await waitFor(() => {
    expect(api.specialist).toHaveBeenCalledWith(
      'REQUEST_REVIEW_001',
      'REQUEST_SCHEDULE_OPTION_001',
      expect.objectContaining({
        result: 'FEASIBLE',
        items: expect.arrayContaining([
          expect.objectContaining({ checklistItemId: 'HOR_1:PASSPORT', status: 'VERIFIED' }),
          expect.objectContaining({ checklistItemId: 'HOR_1:HEALTH_CERTIFICATE', status: 'NEEDS_FOLLOW_UP', requiredByDate: '2026-11-12' }),
          expect.objectContaining({ checklistItemId: 'HOR_1:VACCINATION', status: 'NEEDS_FOLLOW_UP', requiredByDate: '2026-11-12' }),
        ]),
      }),
    );
  });
});
