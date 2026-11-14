import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ReviewInbox } from './ReviewInbox';

const api = vi.hoisted(() => ({ queue: vi.fn(), detail: vi.fn(), specialist: vi.fn(), coordinator: vi.fn() }));
vi.mock('../../api/requestReviewApi', () => ({ requestReviewApi: api }));

const source = { checklistItemId: 'HOR_1:PASSPORT', horseId: 'HOR_1', horseName: 'Bạch Long', documentType: 'PASSPORT', stage: 'BEFORE_CONTRACT', fileAvailable: true, expiryDate: null, usable: true };
const detail = {
  reviewId: 'R1', requestId: 'REQUEST_001', requestRevision: 1, status: 'SPECIALIST_PENDING',
  origin: 'Hà Nội', destination: 'TP.HCM', horseCount: 1, mode: 'ROAD',
  expectedTransportDate: '2026-11-12', expectedDeliveryDate: '2026-11-15',
  options: [{ scheduleOptionId: 'O1', isOriginal: true, mode: 'ROAD', expectedTransportDate: '2026-11-12', expectedDeliveryDate: '2026-11-15',
    coordinatorResult: 'FEASIBLE', coordinatorReason: 'ok', specialistResult: null, checklistVersion: 'v1', checklist: [source] }],
};

beforeEach(() => {
  api.queue.mockResolvedValue([{ reviewId: 'R1', requestId: 'REQUEST_001', requestRevision: 1, origin: 'Hà Nội', destination: 'TP.HCM', expectedTransportDate: '2026-11-12' }]);
  api.detail.mockResolvedValue(detail);
  api.specialist.mockRejectedValue(new Error('Lỗi máy chủ'));
});

it('giữ nguyên dữ liệu đã nhập khi gửi bị lỗi', async () => {
  render(<ReviewInbox role="specialist" button="btn" />);
  fireEvent.click(await screen.findByRole('button', { name: /Thẩm định/ }));
  const note = await screen.findByPlaceholderText(/Ý kiến chuyên môn/);
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'VERIFIED' } });
  fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'FEASIBLE' } });
  fireEvent.change(note, { target: { value: 'ghi chú của tôi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá hồ sơ' }));
  await waitFor(() => expect(api.specialist).toHaveBeenCalled());
  await screen.findByText('Lỗi máy chủ');
  expect((screen.getByPlaceholderText(/Ý kiến chuyên môn/) as HTMLTextAreaElement).value).toBe('ghi chú của tôi');
  expect((screen.getAllByRole('combobox')[1] as HTMLSelectElement).value).toBe('FEASIBLE');
});
