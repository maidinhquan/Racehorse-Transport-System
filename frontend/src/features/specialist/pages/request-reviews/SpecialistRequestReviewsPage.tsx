import { ReviewInbox } from '../../../../shared/components/RequestReview/ReviewInbox';
import { SpecialistLayout } from '../../components/SpecialistLayout';

export function SpecialistRequestReviewsPage() {
  return (
    <SpecialistLayout title="Thẩm định yêu cầu">
      <ReviewInbox role="specialist" button="spc-btn" />
    </SpecialistLayout>
  );
}
