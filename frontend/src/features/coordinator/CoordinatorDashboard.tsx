import { CoordinatorPortal } from './pages/dashboard/CoordinatorPortal';

// Gộp CoordinatorDashboard và CoordinatorPortal thành một thực thể duy nhất
const CoordinatorDashboard = () => {
  return <CoordinatorPortal />;
};

export default CoordinatorDashboard;
export { CoordinatorPortal };