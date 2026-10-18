import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveLandingRoute, demoPrice } from '../flow1/landingDraft';
import './LandingPage.css';

// SVG Icons matching CBN Transport (1).html
const Icon = ({ name }: { name: string }) => {
  switch (name) {
    case 'arrow':
      return (
        <svg className="i" style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="M4 12h16M14 6l6 6-6 6" />
        </svg>
      );
    case 'truck':
      return (
        <svg className="i" style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    case 'globe':
      return (
        <svg className="i" style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
      );
    case 'pin':
      return (
        <svg className="i" style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'shield':
      return (
        <svg className="i" style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'check':
      return (
        <svg className="i" style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="m5 12 5 5 9-10" />
        </svg>
      );
    default:
      return null;
  }
};

const ORIGINS = [
  { name: 'Ho Chi Minh City', cc: 'VN' },
  { name: 'Binh Duong', cc: 'VN' },
  { name: 'Hanoi', cc: 'VN' },
  { name: 'Da Nang', cc: 'VN' },
];

const DESTINATIONS = [
  { name: 'Tokyo', cc: 'JP' },
  { name: 'Osaka', cc: 'JP' },
  { name: 'Nagoya', cc: 'JP' },
  { name: 'Sapporo', cc: 'JP' },
  { name: 'Fukuoka', cc: 'JP' },
  { name: 'Hanoi', cc: 'VN' },
  { name: 'Da Nang', cc: 'VN' },
  { name: 'Ho Chi Minh City', cc: 'VN' },
];

const JAPAN_CITIES = ['Tokyo', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka'];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [horseCount, setHorseCount] = useState<number | ''>('');

  // Check login state
  const isLoggedIn = Boolean(localStorage.getItem('accessToken') || localStorage.getItem('userRole'));

  // Calculate quote (matches CBN Transport 1.html formula: $1850 international, $650 domestic, 30% deposit)
  const countNum = typeof horseCount === 'number' ? horseCount : parseInt(String(horseCount), 10) || 0;
  const hasAllFields = Boolean(origin && destination && countNum > 0);
  const isSameLocation = hasAllFields && origin === destination;
  const isValidRoute = hasAllFields && !isSameLocation;

  const isInternational = Boolean(destination && JAPAN_CITIES.includes(destination));
  const pricePerHorse = demoPrice(isInternational ? 'JP' : 'VN', 1);
  const totalPrice = isValidRoute ? pricePerHorse * countNum : 0;
  const depositPrice = Math.round(totalPrice * 0.4);

  const scrollTo = (id: string) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRequestClick = () => {
    if (!isValidRoute) return;

    saveLandingRoute(origin, destination, isInternational ? 'JP' : 'VN', countNum);
    sessionStorage.setItem('preliminaryQuote', JSON.stringify({ origin, destination, horseCount: countNum, totalPrice }));

    const userLoggedIn = Boolean(localStorage.getItem('accessToken') && localStorage.getItem('userRole') === 'CUSTOMER');
    if (userLoggedIn) {
      navigate('/customer/create-request');
    } else {
      navigate('/login?next=flow1');
    }
  };

  return (
    <div className="lp">
      {/* ── STICKY TOPBAR NAV ── */}
      <nav className="lp-nav">
        <button className="lp-brand" onClick={() => scrollTo('top')}>
          <span className="lp-brand-logo">♞</span>
          CBN Transport
        </button>

        <div className="lp-links">
          <button onClick={() => scrollTo('lp-services')}>{lang === 'vi' ? 'Dịch vụ' : 'Services'}</button>
          <button onClick={() => scrollTo('lp-process')}>{lang === 'vi' ? 'Quy trình' : 'Process'}</button>
          <button onClick={() => scrollTo('lp-pricing')}>{lang === 'vi' ? 'Bảng giá' : 'Pricing'}</button>
          <button onClick={() => scrollTo('lp-routes')}>{lang === 'vi' ? 'Tuyến' : 'Routes'}</button>
          <button onClick={() => scrollTo('lp-contact')}>{lang === 'vi' ? 'Liên hệ' : 'Contact'}</button>
        </div>

        <div className="lp-cta">
          <div className="lp-lang-switch">
            <button className={lang === 'vi' ? 'active' : ''} onClick={() => setLang('vi')}>VI</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>

          <button className="btn ghost lg" onClick={() => navigate('/login')} title={lang === 'vi' ? 'Đăng nhập vào hệ thống' : 'Sign in to portal'}>
            {lang === 'vi' ? 'Đăng nhập' : 'Sign in'}
          </button>

          {isLoggedIn ? (
            <button className="btn dark lg" onClick={() => navigate('/customer/home')}>
              {lang === 'vi' ? 'Vào cổng khách hàng' : 'Client Portal'}
            </button>
          ) : (
            <button className="btn dark lg hide-sm" onClick={() => navigate('/register')}>
              {lang === 'vi' ? 'Bắt đầu' : 'Get started'}
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header className="lp-hero">
        <span className="lp-eyebrow">
          <Icon name="truck" />
          {lang === 'vi'
            ? 'Vận chuyển ngựa trong nước và từ Việt Nam đi Nhật Bản'
            : 'Horse transport domestically and Vietnam to Japan'}
        </span>

        <h1>
          {lang === 'vi'
            ? 'Đưa ngựa của bạn đến nơi, an toàn từng chặng'
            : 'Getting your horses there, safe at every leg'}
        </h1>

        <p>
          {lang === 'vi'
            ? 'Đặt chuyến, quản lý hồ sơ ngựa, ký hợp đồng và theo dõi các mốc hành trình trên một cổng khách hàng duy nhất.'
            : 'Book trips, manage horse records, sign contracts and follow confirmed milestones on a single portal.'}
        </p>

        {/* ── QUICK QUOTE CALCULATOR ── */}
        <div className="lp-quote" id="lp-quote">
          <div className="lp-quote-title">
            {lang === 'vi' ? 'Ước tính sơ bộ cho chuyến tiếp theo' : 'Preliminary estimate for your next transport'}
          </div>

          <div className="lp-fields">
            <label>
              {lang === 'vi' ? 'Điểm đi' : 'Origin'}
              <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="">{lang === 'vi' ? '-- Chọn điểm đi --' : '-- Select origin --'}</option>
                {ORIGINS.map((o) => (
                  <option key={o.name} value={o.name}>{o.name}, {o.cc}</option>
                ))}
              </select>
            </label>

            <label>
              {lang === 'vi' ? 'Điểm đến' : 'Destination'}
              <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="">{lang === 'vi' ? '-- Chọn điểm đến --' : '-- Select destination --'}</option>
                {DESTINATIONS.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}, {d.cc}</option>
                ))}
              </select>
            </label>

            <label>
              {lang === 'vi' ? 'Số ngựa' : 'Horses'}
              <input
                type="number"
                min="1"
                max="20"
                placeholder={lang === 'vi' ? 'Nhập số ngựa' : 'Enter count'}
                value={horseCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setHorseCount('');
                  } else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) {
                      setHorseCount(Math.max(1, Math.min(20, parsed)));
                    }
                  }
                }}
              />
            </label>

            <button
              className="btn solid"
              onClick={handleRequestClick}
              disabled={!isValidRoute}
              style={!isValidRoute ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
            >
              {lang === 'vi' ? 'Gửi yêu cầu' : 'Send request'} <Icon name="arrow" />
            </button>
          </div>

          <div className="lp-result">
            {isValidRoute ? (
              <>
                <span>
                  <b>{totalPrice.toLocaleString()}</b> <span className="muted">VND {lang === 'vi' ? 'ước tính sơ bộ' : 'preliminary estimate'}</span>
                </span>
                <span className="muted">
                  {isInternational 
                    ? (lang === 'vi' ? 'Việt Nam ➔ Nhật Bản' : 'Vietnam ➔ Japan') 
                    : (lang === 'vi' ? 'Nội địa Việt Nam' : 'Domestic Vietnam')} • {countNum} {lang === 'vi' ? 'ngựa' : 'horses'} • {lang === 'vi' ? 'Cọc 40%:' : '40% Deposit:'} {depositPrice.toLocaleString()} VND
                </span>
              </>
            ) : isSameLocation ? (
              <span className="muted" style={{ color: '#dc2626' }}>
                {lang === 'vi' ? 'Điểm đến phải khác điểm đi.' : 'Destination must be different from origin.'}
              </span>
            ) : (
              <span className="muted">
                {lang === 'vi'
                  ? 'Vui lòng chọn điểm đi, điểm đến và số ngựa để xem ước tính giá.'
                  : 'Please select origin, destination and number of horses to see estimate.'}
              </span>
            )}
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
            <span>{lang === 'vi' ? 'Đã có tài khoản hoặc là nhân sự điều hành?' : 'Already have an account or staff member?'}</span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: '#ea580c', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              {lang === 'vi' ? 'Đăng nhập ngay tại đây ➔' : 'Sign in here ➔'}
            </button>
          </div>
        </div>

        {/* ── TRUST BADGES ── */}
        <div className="lp-trust">
          <span><Icon name="globe" />{lang === 'vi' ? 'Nội địa Việt Nam và Việt Nam → Nhật Bản' : 'Domestic VN & VN → Japan'}</span>
          <span><Icon name="pin" />{lang === 'vi' ? 'Theo dõi theo mốc hành trình đã xác nhận' : 'Track confirmed milestones'}</span>
          <span><Icon name="shield" />{lang === 'vi' ? 'CBN lo giấy phép xuất nhập khẩu & kiểm dịch' : 'Export & import clearance handled'}</span>
        </div>
      </header>

      {/* ── SECTION: SERVICES ── */}
      <section className="lp-section" id="lp-services">
        <h2>{lang === 'vi' ? 'Một đối tác cho cả chuyến đi của ngựa' : 'One partner for the entire equine journey'}</h2>
        <p className="lp-lead">
          {lang === 'vi'
            ? 'Từ chuồng đi đến chuồng đến, đội ngũ CBN lo xe chuyên dụng, kiểm dịch, hải quan và bàn giao.'
            : 'From origin stable to destination stable, CBN handles custom horse carriers, veterinary checks, customs and delivery.'}
        </p>

        <div className="lp-grid3">
          <div className="lp-service">
            <span className="ic"><Icon name="globe" /></span>
            <h3>{lang === 'vi' ? 'Vận chuyển quốc tế' : 'International Transport'}</h3>
            <p>
              {lang === 'vi'
                ? 'Tuyến từ Việt Nam đi Nhật Bản. CBN chuẩn bị giấy phép xuất khẩu, khai báo hải quan, chuyến bay thuê chuyến và kiểm dịch nhập khẩu.'
                : 'Direct transport from Vietnam to Japan. CBN prepares export permits, customs filings, air charter jet stalls and quarantine.'}
            </p>
          </div>

          <div className="lp-service">
            <span className="ic"><Icon name="truck" /></span>
            <h3>{lang === 'vi' ? 'Vận chuyển nội địa' : 'Domestic Transport'}</h3>
            <p>
              {lang === 'vi'
                ? 'Hồ Chí Minh, Hà Nội, Đà Nẵng, Bình Dương. Xe có ngăn stall riêng biệt, đệm hơi giảm chấn, người áp tải kiêm bác sĩ thú y đi cùng suốt chặng.'
                : 'Ho Chi Minh City, Hanoi, Da Nang, Binh Duong. Air-ride suspension trucks, individual stalls, qualified veterinarian accompanying.'}
            </p>
          </div>

          <div className="lp-service">
            <span className="ic"><Icon name="pin" /></span>
            <h3>{lang === 'vi' ? 'Theo dõi từng chặng' : 'Milestone Telemetry'}</h3>
            <p>
              {lang === 'vi'
                ? 'Xem mốc hành trình gần nhất do đội vận chuyển xác nhận: kiểm dịch, hải quan, thú y nơi đến và bàn giao, kèm giờ dự kiến đến thời gian thực.'
                : 'Real-time confirmed milestones: customs clearance, health inspection, handover signature and telemetry GPS tracking.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION: PROCESS ── */}
      <section className="lp-section" id="lp-process">
        <h2>{lang === 'vi' ? 'Bốn bước từ yêu cầu đến bàn giao' : 'Four steps from request to delivery'}</h2>
        <p className="lp-lead">
          {lang === 'vi'
            ? 'Mọi bước đều làm trên cổng khách hàng, bạn luôn biết yêu cầu đang ở đâu.'
            : 'Everything is managed on the client portal, giving complete visibility at every stage.'}
        </p>

        <ol className="lp-steps">
          <li>
            <b>{lang === 'vi' ? 'Gửi yêu cầu đầy đủ' : '1. Submit Request'}</b>
            <span>{lang === 'vi' ? 'Chọn tuyến, ngày, ngựa và yêu cầu chăm sóc. Ước tính sơ bộ chỉ để tham khảo.' : 'Select route, transport date, horses and care notes.'}</span>
          </li>
          <li>
            <b>{lang === 'vi' ? 'Nhận hợp đồng dự thảo' : '2. Receive Contract'}</b>
            <span>{lang === 'vi' ? 'Quản lý xem xét yêu cầu và gửi hợp đồng dịch vụ chính thức kèm mức giá chi tiết.' : 'Manager reviews the transport plan and issues the official contract.'}</span>
          </li>
          <li>
            <b>{lang === 'vi' ? 'Ký OTP và đặt cọc' : '3. OTP Sign & Deposit'}</b>
            <span>{lang === 'vi' ? 'Bạn ký hợp đồng bằng mã OTP và thanh toán đặt cọc 40% qua VNPay.' : 'Sign securely with OTP and pay the 40% deposit to lock the schedule.'}</span>
          </li>
          <li>
            <b>{lang === 'vi' ? 'Theo dõi và nhận ngựa' : '4. Track & Handover'}</b>
            <span>{lang === 'vi' ? 'Theo dõi các mốc hành trình đã xác nhận đến khi bàn giao có chữ ký xác nhận tận nơi.' : 'Follow live milestones until verified handover at the destination.'}</span>
          </li>
        </ol>
      </section>

      {/* ── SECTION: PRICING ── */}
      <section className="lp-section" id="lp-pricing">
        <h2>{lang === 'vi' ? 'Giá rõ ràng theo từng con ngựa' : 'Clear transparent pricing per horse'}</h2>
        <p className="lp-lead">
          {lang === 'vi'
            ? 'Ước tính sơ bộ tính theo tuyến và số ngựa, không có giá trị ràng buộc. Giá chính thức ghi trong hợp đồng dịch vụ.'
            : 'Preliminary estimate based on route and horse count. Official price is locked in the service contract.'}
        </p>

        <div className="lp-prices">
          <div className="lp-price feature">
            <div className="eyebrow">Việt Nam ➔ Nhật Bản (International)</div>
            <div className="amount">
              46.250.000 <small>VND / ngựa</small>
            </div>
            <ul>
              <li><Icon name="check" /><span>Giấy phép xuất khẩu, khai báo hải quan, giấy phép nhập khẩu</span></li>
              <li><Icon name="check" /><span>Thủ tục nhập khẩu và kiểm tra thú y tại Nhật Bản</span></li>
              <li><Icon name="check" /><span>Theo dõi theo mốc hành trình và hồ sơ y tế chuyên dụng</span></li>
              <li><Icon name="check" /><span>Bố trí 2 chặng đường bộ độc lập tại VN và Nhật Bản</span></li>
            </ul>
          </div>

          <div className="lp-price">
            <div className="eyebrow">Nội địa Việt Nam (Domestic)</div>
            <div className="amount">
              16.250.000 <small>VND / ngựa</small>
            </div>
            <ul>
              <li><Icon name="check" /><span>Giấy kiểm dịch nội địa & xe chuyên dụng đệm hơi</span></li>
              <li><Icon name="check" /><span>Người áp tải kiêm Bác sĩ thú y đi cùng suốt chặng</span></li>
              <li><Icon name="check" /><span>Bàn giao tận chuồng, ký nhận điện tử thời gian thực</span></li>
              <li><Icon name="check" /><span>Bảo hiểm trách nhiệm vận chuyển ngựa đua</span></li>
            </ul>
          </div>
        </div>

        <p className="lp-note">
          {lang === 'vi'
            ? 'Giá ước tính sơ bộ, không ràng buộc. Đặt cọc 40% theo hạn ghi trong hợp đồng đã ký; phần còn lại thanh toán sau khi bàn giao được xác minh.'
            : 'Preliminary non-binding estimate. 40% deposit upon contract signature; remainder due after verified delivery.'}
        </p>
      </section>

      {/* ── SECTION: ROUTES ── */}
      <section className="lp-section" id="lp-routes">
        <h2>{lang === 'vi' ? 'Các tuyến nhận đặt mới' : 'Supported Routes'}</h2>
        <p className="lp-lead">
          {lang === 'vi'
            ? 'Điểm đi tại Việt Nam; điểm đến trong Việt Nam hoặc tại Nhật Bản.'
            : 'Origins across Vietnam; destinations domestic or to major equine centers in Japan.'}
        </p>

        <div className="lp-routes">
          {DESTINATIONS.map((d) => (
            <span key={d.name}>
              {d.name} <small>{d.cc}</small>
            </span>
          ))}
        </div>
      </section>

      {/* ── CONVERSION CTA BANNER ── */}
      <div className="lp-band">
        <div>
          <h2>
            {lang === 'vi' ? 'Sẵn sàng cho chuyến đi tiếp theo của ngựa?' : 'Ready for your horse’s next journey?'}
          </h2>
          <p>
            {lang === 'vi'
              ? 'Tạo tài khoản để lưu hồ sơ ngựa và gửi yêu cầu vận chuyển đầu tiên.'
              : 'Create an account to manage horse passports and place your first transport request.'}
          </p>
        </div>

        <div className="lp-cta">
          <button className="btn ghost lg" onClick={() => navigate('/login')}>
            {lang === 'vi' ? 'Đăng nhập' : 'Sign in'}
          </button>
          <button className="btn solid lg" onClick={() => navigate(isLoggedIn ? '/customer/create-request' : '/register')}>
            {isLoggedIn 
              ? (lang === 'vi' ? 'Tạo yêu cầu vận chuyển' : 'Create Request')
              : (lang === 'vi' ? 'Bắt đầu ngay' : 'Get started')}
          </button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="lp-foot" id="lp-contact">
        <div>
          <b>CBN Transport</b>
          <br />
          {lang === 'vi' ? 'Hệ thống vận chuyển ngựa đua chuyên nghiệp' : 'Professional racehorse transport system'}
        </div>

        <div>
          Hotline: <span>+84 28 5550 0100</span>
          <br />
          Email: <span>support@cbntransport.example</span>
        </div>

        <div>
          {lang === 'vi' ? 'Hệ thống vận hành và cổng dịch vụ khách hàng.' : 'Equine transport operations & customer portal.'}
          <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="lp-portal" onClick={() => navigate('/login')}>
              {lang === 'vi' ? 'Đăng nhập hệ thống (Portal Login) ➔' : 'Portal Login ➔'}
            </button>
            {isLoggedIn && (
              <button className="lp-portal" onClick={() => navigate('/customer/home')}>
                {lang === 'vi' ? 'Cổng khách hàng ➔' : 'Client Portal ➔'}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
