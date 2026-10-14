import { useNavigate } from 'react-router-dom';
import './BrandLogo.css';

interface BrandLogoProps {
  compact?: boolean;
}

export const BrandLogo = ({ compact = false }: BrandLogoProps) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="brand-logo-btn"
      onClick={() => navigate('/')}
      title="Quay về Trang chủ CNB"
    >
      <div className="brand-logo-icon">CNB</div>
      {!compact && (
        <div>
          <span className="brand-logo-title">CNB Equine</span>
          <span className="brand-logo-subtitle">Cross-Border Transport</span>
        </div>
      )}
    </button>
  );
};