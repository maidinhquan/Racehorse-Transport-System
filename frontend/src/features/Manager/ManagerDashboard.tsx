import { ManagerPortal } from './pages/dashboard/ManagerPortal';

// Gộp ManagerDashboard và ManagerPortal thành một thực thể duy nhất
const ManagerDashboard = () => {
  return <ManagerPortal />;
};

export default ManagerDashboard;
export { ManagerPortal };