import { ReviewInbox } from '../../../../shared/components/RequestReview/ReviewInbox';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';

export function CoordinatorRequestReviewsPage() {
  return (
    <CoordinatorLayout title="Thẩm định yêu cầu">
      <ReviewInbox role="coordinator" button="btn" />
    </CoordinatorLayout>
  );
}
