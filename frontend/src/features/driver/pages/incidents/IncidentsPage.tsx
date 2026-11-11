import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DriverLayout, Icon } from '../../components/DriverLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { IncidentLocationPicker } from '../../components/IncidentLocationPicker/IncidentLocationPicker';
import { PhotoPicker } from '../../components/PhotoPicker/PhotoPicker';
import { Modal } from '../../components/Modals/Modal';
import { PickupAccessOrderBanner } from '../../components/PickupAccessOrderBanner';
import { useDriver } from '../../hooks/useDriver';
import { driverApi } from '../../api/driverApi';
import { INCIDENT_TYPE_LABEL, SEVERITY_LABEL, defaultSegmentRatio, fmtDateTime, incidentWhere, nowStamp, segmentPickable } from '../../hooks/driverRules';
import { apiClient } from '../../../../shared/api/apiClient';
import { notifySync } from '../../../../shared/utils/syncChannel';
import type { HorseHealthIssue, Incident, IncidentSeverity, IncidentType, Photo, Trip } from '../../types';
import './IncidentsPage.css';

const TYPES = Object.keys(INCIDENT_TYPE_LABEL) as IncidentType[];
const SEVERITIES = Object.keys(SEVERITY_LABEL) as IncidentSeverity[];

export const HORSE_HEALTH_ISSUES: Array<{ id: HorseHealthIssue; label: string; desc: string }> = [
  { id: 'HORSE_FEVER', label: 'Ngựa sốt', desc: 'Thân nhiệt cao (>38.5°C), mệt mỏi, thở dốc' },
  { id: 'HORSE_COLIC', label: 'Ngựa đau', desc: 'Đau bụng, co thắt cơ, bồn chồn, ngoái nhìn bụng' },
  { id: 'HORSE_SHOCK', label: 'Ngựa sốc', desc: 'Sốc nhiệt, tụt huyết áp, mạch nhanh yếu, hoảng loạn' },
];

export const HEALTH_ISSUE_LABEL: Record<string, string> = {
  HORSE_FEVER: 'Ngựa sốt',
  HORSE_COLIC: 'Ngựa đau (Đau bụng / Co thắt)',
  HORSE_SHOCK: 'Ngựa sốc (Sốc nhiệt / Hạ huyết áp)',
};

export interface VetStationInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  country: string;
  province?: string;
  region: 'NORTH' | 'CENTRAL' | 'SOUTH' | 'INTERNATIONAL' | 'OTHER';
  near?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  isSuggested?: boolean;
}

export const AVAILABLE_VET_STATIONS: VetStationInfo[] = [
  // --- Miền Nam ---
  {
    id: 'FACILITY_VN_NLU',
    name: 'Bệnh viện Thú y – Trường Đại học Nông Lâm TP.HCM',
    address: 'Khu phố 6, P. Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    phone: '028 3896 6780',
    country: 'VN',
    province: 'TP.HCM',
    region: 'SOUTH',
    near: 'TP. Thủ Đức, TP.HCM, Bình Dương, Đồng Nai',
    lat: 10.87,
    lng: 106.79,
  },
  {
    id: 'FACILITY_VN_RAHO6',
    name: 'Cơ quan Thú y Vùng VI – Cục Thú y (Tân Sơn Nhất)',
    address: '521/1 Hoàng Văn Thụ, Phường 4, Q. Tân Bình, TP. Hồ Chí Minh',
    phone: '028 3844 4024',
    country: 'VN',
    province: 'TP.HCM',
    region: 'SOUTH',
    near: 'Sân bay Quốc tế Tân Sơn Nhất (SGN), Tân Bình',
    lat: 10.7981,
    lng: 106.6578,
  },
  {
    id: 'FACILITY_VN_HCMC_CLINIC',
    name: 'Trạm Chẩn đoán, Xét nghiệm & Điều trị Động vật TP.HCM',
    address: '151 Lý Thường Kiệt, Phường 7, Quận 11, TP. Hồ Chí Minh',
    phone: '028 3855 2408',
    country: 'VN',
    province: 'TP.HCM',
    region: 'SOUTH',
    near: 'Trung tâm Quận 5, Quận 10, Quận 11, TP.HCM',
    lat: 10.7612,
    lng: 106.6589,
  },
  {
    id: 'FACILITY_003',
    name: 'Trạm Tiếp nhận & Cấp cứu Thú y Củ Chi',
    address: 'Khu tiếp nhận ngựa Củ Chi, H. Củ Chi, TP. Hồ Chí Minh',
    phone: '0918 776 655',
    country: 'VN',
    province: 'TP.HCM',
    region: 'SOUTH',
    near: 'Củ Chi, Tây Ninh, Bình Dương, Hóc Môn',
    lat: 10.97,
    lng: 106.5,
  },
  {
    id: 'FACILITY_VN_BDG_VET',
    name: 'Chi cục Chăn nuôi, Thú y & Thủy sản Tỉnh Bình Dương',
    address: 'Đại lộ Bình Dương, P. Phú Hòa, TP. Thủ Dầu Một, Bình Dương',
    phone: '0274 3822 556',
    country: 'VN',
    province: 'Bình Dương',
    region: 'SOUTH',
    near: 'TP. Thủ Dầu Một, Thuận An, Dĩ An, Bến Cát',
    lat: 10.9805,
    lng: 106.6519,
  },
  {
    id: 'FACILITY_VN_DNAI_VET',
    name: 'Chi cục Chăn nuôi và Thú y Tỉnh Đồng Nai',
    address: 'Nguyễn Ái Quốc, P. Trảng Dài, TP. Biên Hòa, Đồng Nai',
    phone: '0251 3822 411',
    country: 'VN',
    province: 'Đồng Nai',
    region: 'SOUTH',
    near: 'TP. Biên Hòa, Long Thành, Trảng Bom, Cao tốc Dầu Giây',
    lat: 10.9625,
    lng: 106.8431,
  },
  {
    id: 'FACILITY_VN_MOCBAI',
    name: 'Trạm Kiểm dịch Động vật Cửa khẩu Quốc tế Mộc Bài',
    address: 'Khu kinh tế Cửa khẩu Mộc Bài, Xã Lợi Thuận, H. Bến Cầu, Tây Ninh',
    phone: '0276 3876 123',
    country: 'VN',
    province: 'Tây Ninh',
    region: 'SOUTH',
    near: 'Cửa khẩu Mộc Bài (Tây Ninh) – Bavet (Campuchia), Gò Dầu',
    lat: 11.0822,
    lng: 106.1783,
  },
  {
    id: 'FACILITY_VN_CTU',
    name: 'Bệnh viện Thú y – Trường ĐH Cần Thơ',
    address: 'Khu II, Đường 3/2, P. Xuân Khánh, Q. Ninh Kiều, TP. Cần Thơ',
    phone: '0292 3832 641',
    country: 'VN',
    province: 'Cần Thơ',
    region: 'SOUTH',
    near: 'Cần Thơ, Hậu Giang, Vĩnh Long, Sóc Trăng, ĐBSCL',
    lat: 10.0305,
    lng: 105.7689,
  },

  // --- Miền Trung ---
  {
    id: 'FACILITY_VN_HUAF',
    name: 'Bệnh viện Thú y – Trường ĐH Nông Lâm Huế',
    address: '102 Phùng Hưng, P. Thuận Thành, TP. Huế, Thừa Thiên Huế',
    phone: '0234 3522 535',
    country: 'VN',
    province: 'Thừa Thiên Huế',
    region: 'CENTRAL',
    near: 'Thừa Thiên Huế, Quảng Trị, Quảng Bình',
    lat: 16.4712,
    lng: 107.575,
  },
  {
    id: 'FACILITY_004',
    name: 'Trung tâm Thú y Vùng IV – TP. Đà Nẵng',
    address: 'Số 88 Bùi Thị Xuân, Q. Sơn Trà, TP. Đà Nẵng',
    phone: '0902 223 344',
    country: 'VN',
    province: 'Đà Nẵng',
    region: 'CENTRAL',
    near: 'Đà Nẵng, Quảng Nam, Sân bay Đà Nẵng',
    lat: 16.05,
    lng: 108.2,
  },
  {
    id: 'FACILITY_VN_QN_VET',
    name: 'Chi cục Chăn nuôi và Thú y Tỉnh Quảng Nam',
    address: 'Đường Hùng Vương, TP. Tam Kỳ, Tỉnh Quảng Nam',
    phone: '0235 3852 467',
    country: 'VN',
    province: 'Quảng Nam',
    region: 'CENTRAL',
    near: 'Tam Kỳ, Hội An, Quảng Ngãi',
    lat: 15.5689,
    lng: 108.4811,
  },
  {
    id: 'FACILITY_VN_BD_VET',
    name: 'Chi cục Chăn nuôi và Thú y Tỉnh Bình Định',
    address: 'Đường Tây Sơn, TP. Quy Nhơn, Tỉnh Bình Định',
    phone: '0256 3846 543',
    country: 'VN',
    province: 'Bình Định',
    region: 'CENTRAL',
    near: 'Quy Nhơn, Phú Yên, Gia Lai',
    lat: 13.782,
    lng: 109.2195,
  },
  {
    id: 'FACILITY_VN_KH_VET',
    name: 'Chi cục Chăn nuôi và Thú y Tỉnh Khánh Hòa',
    address: '04 Hoàng Diệu, P. Vĩnh Nguyên, TP. Nha Trang, Khánh Hòa',
    phone: '0258 3881 321',
    country: 'VN',
    province: 'Khánh Hòa',
    region: 'CENTRAL',
    near: 'Nha Trang, Cam Ranh, Ninh Thuận, Đắk Lắk',
    lat: 12.2285,
    lng: 109.1967,
  },

  // --- Miền Bắc ---
  {
    id: 'FACILITY_VN_VNUA',
    name: 'Bệnh viện Thú y – Học viện Nông nghiệp Việt Nam (VNUA)',
    address: 'Ngô Xuân Quảng, TT. Trâu Quỳ, H. Gia Lâm, Hà Nội',
    phone: '024 3876 9621',
    country: 'VN',
    province: 'Hà Nội',
    region: 'NORTH',
    near: 'Hà Nội, Sóc Sơn, Bắc Ninh, Hưng Yên',
    lat: 21.0055,
    lng: 105.9325,
  },
  {
    id: 'FACILITY_VN_NCVD',
    name: 'Trung tâm Chẩn đoán Thú y Trung ương – Cục Thú y',
    address: 'Số 521 Hoàng Hoa Thám, P. Vĩnh Phúc, Q. Ba Đình, Hà Nội',
    phone: '024 3832 9494',
    country: 'VN',
    province: 'Hà Nội',
    region: 'NORTH',
    near: 'Hà Nội, Sân bay Nội Bài, Vĩnh Phúc',
    lat: 21.0427,
    lng: 105.8142,
  },
  {
    id: 'FACILITY_VN_TUAF',
    name: 'Bệnh viện Thú y – Trường ĐH Nông Lâm Thái Nguyên',
    address: 'Xã Quyết Thắng, TP. Thái Nguyên, Tỉnh Thái Nguyên',
    phone: '0208 3855 564',
    country: 'VN',
    province: 'Thái Nguyên',
    region: 'NORTH',
    near: 'Thái Nguyên, Bắc Kạn, Tuyên Quang, Cao Bằng',
    lat: 21.5833,
    lng: 105.8167,
  },
  {
    id: 'FACILITY_VN_HUU_NGHI',
    name: 'Trạm Kiểm dịch Động vật Cửa khẩu Quốc tế Hữu Nghị',
    address: 'Cửa khẩu Quốc tế Hữu Nghị, TT. Đồng Đăng, H. Cao Lộc, Lạng Sơn',
    phone: '0205 3851 234',
    country: 'VN',
    province: 'Lạng Sơn',
    region: 'NORTH',
    near: 'Cửa khẩu Hữu Nghị, TP. Lạng Sơn, Bắc Giang',
    lat: 21.9842,
    lng: 106.7125,
  },
  {
    id: 'FACILITY_VN_MONG_CAI',
    name: 'Trạm Kiểm dịch Động vật Cửa khẩu Quốc tế Móng Cái',
    address: 'P. Trần Phú, TP. Móng Cái, Quảng Ninh',
    phone: '0203 3881 245',
    country: 'VN',
    province: 'Quảng Ninh',
    region: 'NORTH',
    near: 'TP. Móng Cái, Hạ Long, Cẩm Phả, Hải Phòng',
    lat: 21.5283,
    lng: 107.9692,
  },

  // --- Quốc tế ---
  {
    id: 'FACILITY_002',
    name: 'Trạm Thú y Tiếp nhận Sân bay Narita',
    address: 'Khu tiếp nhận động vật Narita, Chiba, Japan',
    phone: '+81 90 1111 2222',
    country: 'JP',
    province: 'Chiba',
    region: 'INTERNATIONAL',
    near: 'Sân bay Quốc tế Narita (NRT), Chiba, Tokyo',
    lat: 35.772,
    lng: 140.3929,
  },
  {
    id: 'FACILITY_JP_MIHO',
    name: 'JRA Miho Training Center Equine Hospital (Bệnh viện Thú y Miho – JRA)',
    address: '2500-2 Mikoma, Miho-mura, Inashiki-gun, Ibaraki 300-0493, Japan',
    phone: '+81 29 885 2111',
    country: 'JP',
    province: 'Ibaraki',
    region: 'INTERNATIONAL',
    near: 'Sân bay Quốc tế Narita (NRT), Tokyo',
    lat: 36.0028,
    lng: 140.3541,
  },
  {
    id: 'FACILITY_JP_RITTO',
    name: 'JRA Ritto Training Center Equine Hospital (Bệnh viện Thú y Ritto – JRA)',
    address: '1028 Mikogawa, Ritto-shi, Shiga 520-3085, Japan',
    phone: '+81 77 558 1111',
    country: 'JP',
    province: 'Shiga',
    region: 'INTERNATIONAL',
    near: 'Sân bay Quốc tế Kansai (KIX), Osaka, Kyoto',
    lat: 35.0167,
    lng: 135.9833,
  },
  {
    id: 'FACILITY_JP_SHADAI',
    name: 'Shadai Horse Clinic (Bệnh viện Thú y Ngựa Shadai – Hokkaido)',
    address: '100-12 Uenae, Tomakomai-shi, Hokkaido 059-1365, Japan',
    phone: '+81 144 58 2211',
    country: 'JP',
    province: 'Hokkaido',
    region: 'INTERNATIONAL',
    near: 'Sân bay New Chitose (CTS), Trại ngựa đua Hokkaido',
    lat: 42.75,
    lng: 141.7167,
  },
  {
    id: 'FACILITY_TH_KASETSART',
    name: 'Kasetsart University Large Animal Teaching Hospital',
    address: '1 Malaiman Road, Kamphaeng Saen, Nakhon Pathom 73140, Thailand',
    phone: '+66 34 351 901',
    country: 'TH',
    province: 'Nakhon Pathom',
    region: 'INTERNATIONAL',
    near: 'Bangkok, Sân bay Suvarnabhumi (BKK)',
    lat: 14.0167,
    lng: 99.9833,
  },
];

/** Tự động nhận diện Tỉnh/Thành phố của chuyến đi hiện tại để ưu tiên đề xuất trạm thú y */
export const detectCurrentProvince = (trip?: Trip | null): string => {
  if (!trip) return 'TP.HCM';

  // 1. Kiểm tra qua các điểm dừng (stops)
  if (trip.stops && trip.stops.length > 0) {
    for (const stop of trip.stops) {
      const name = (stop.name || '').toLowerCase();
      if (name.includes('hồ chí minh') || name.includes('tp.hcm') || name.includes('hcm') || name.includes('tân sơn nhất')) return 'TP.HCM';
      if (name.includes('hà nội') || name.includes('nội bài')) return 'Hà Nội';
      if (name.includes('đà nẵng')) return 'Đà Nẵng';
      if (name.includes('bình dương')) return 'Bình Dương';
      if (name.includes('đồng nai')) return 'Đồng Nai';
      if (name.includes('huế')) return 'Thừa Thiên Huế';
      if (name.includes('tây ninh') || name.includes('mộc bài')) return 'Tây Ninh';
      if (name.includes('cần thơ')) return 'Cần Thơ';
      if (name.includes('nha trang') || name.includes('khánh hòa')) return 'Khánh Hòa';
    }
  }

  // 2. Kiểm tra origin, destination, pickup hoặc delivery
  const fullText = `${trip.origin || ''} ${trip.destination || ''} ${trip.pickup?.name || ''} ${trip.pickup?.address || ''} ${trip.delivery?.name || ''} ${trip.delivery?.address || ''}`.toLowerCase();
  if (fullText.includes('hồ chí minh') || fullText.includes('tp.hcm') || fullText.includes('hcm') || fullText.includes('củ chi') || fullText.includes('tân sơn nhất')) return 'TP.HCM';
  if (fullText.includes('hà nội') || fullText.includes('nội bài') || fullText.includes('sóc sơn')) return 'Hà Nội';
  if (fullText.includes('đà nẵng') || fullText.includes('hải vân')) return 'Đà Nẵng';
  if (fullText.includes('bình dương') || fullText.includes('thủ dầu một')) return 'Bình Dương';
  if (fullText.includes('đồng nai') || fullText.includes('biên hòa')) return 'Đồng Nai';
  if (fullText.includes('huế')) return 'Thừa Thiên Huế';
  if (fullText.includes('tây ninh') || fullText.includes('mộc bài')) return 'Tây Ninh';
  if (fullText.includes('cần thơ')) return 'Cần Thơ';
  if (fullText.includes('nha trang') || fullText.includes('khánh hòa')) return 'Khánh Hòa';
  if (fullText.includes('thái nguyên')) return 'Thái Nguyên';
  if (fullText.includes('lạng sơn')) return 'Lạng Sơn';
  if (fullText.includes('quảng ninh') || fullText.includes('móng cái')) return 'Quảng Ninh';

  return 'TP.HCM';
};

const PLAN_TYPE_LABEL: Record<string, string> = {
  NO_CHANGE: 'Khắc phục tại chỗ, giữ nguyên kế hoạch',
  VEHICLE_SWAP: 'Thay xe vận chuyển',
  CREW_SWAP: 'Thay đổi nhân sự tổ xe',
  VEHICLE_AND_CREW_SWAP: 'Thay cả xe và nhân sự',
  ROUTE_ADJUST: 'Điều chỉnh lộ trình trong tuyến pháp lý đã duyệt',
  COORDINATOR_APPLIED: 'Phương án xử lý được Điều phối viên phê duyệt',
  VET_TRANSFER: 'Chuyển viện khẩn cấp đến cơ sở y tế chuyên khoa',
  PICKUP_RELOCATE: 'Dắt bộ ra điểm hẹn mới',
};

/** Form báo cáo sự cố cho chuyến đang hoạt động */
const ReportForm: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { incidentPhotos, actions, me, horses } = useDriver();

  // Phân biệt thẩm quyền báo cáo: Bác sĩ thú y (vấn đề ngựa) vs Tài xế (vấn đề xe & đường)
  const isVet = React.useMemo(() => {
    if (me?.role === 'VETERINARIAN') return true;
    const fn = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : '') || me?.name || '';
    const em = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : '') || '';
    return /BS\.|Bác sĩ|thú y|escort|vet/i.test(fn) || /escort|vet/i.test(em);
  }, [me]);

  const allowedTypes = React.useMemo(() => {
    return isVet ? (['HORSE_HEALTH'] as IncidentType[]) : TYPES.filter((t) => t !== 'HORSE_HEALTH');
  }, [isVet]);

  const tripHorseIds = trip.horses || [];

  const [type, setType] = useState<IncidentType | ''>(() => (isVet ? 'HORSE_HEALTH' : ''));
  const [selectedHorseId, setSelectedHorseId] = useState<string>(() => tripHorseIds[0] || '');
  const [healthIssue, setHealthIssue] = useState<HorseHealthIssue>('HORSE_FEVER');
  const [immediateCare, setImmediateCare] = useState<string>('');
  const [severity, setSeverity] = useState<IncidentSeverity | ''>(() => (isVet ? 'HIGH' : ''));
  const [locationDetail, setLocationDetail] = useState('');
  const [ratio, setRatio] = useState(() => defaultSegmentRatio(trip));
  const pickable = segmentPickable(trip);
  const [description, setDescription] = useState('');
  const [safe, setSafe] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // Cho loại sự cố tiếp cận điểm đón (PICKUP_ACCESS_BLOCKED)
  const [actionProposal, setActionProposal] = useState<'RELOCATE' | 'WAIT_COORDINATOR'>('RELOCATE');
  const [proposedPlaceName, setProposedPlaceName] = useState('');
  const [blockedPhotos, setBlockedPhotos] = useState<Photo[]>([]);
  const [relocationPhotos, setRelocationPhotos] = useState<Photo[]>([]);

  const selectedHorse = horses.find((h) => h.id === selectedHorseId);

  const isHorseIssue = isVet || type === 'HORSE_HEALTH';

  const send = async () => {
    if (isHorseIssue) {
      if (!selectedHorseId && tripHorseIds.length > 0) { setError('Vui lòng chọn con ngựa gặp sự cố.'); return; }
      if (!healthIssue) { setError('Vui lòng chọn loại sự cố sức khỏe.'); return; }
      if (!severity) { setError('Vui lòng chọn mức độ nghiêm trọng.'); return; }
      if (!immediateCare.trim()) { setError('Vui lòng nhập biện pháp sơ cứu khẩn cấp đã tiến hành.'); return; }
      if (description.trim().length < 5) { setError('Vui lòng mô tả triệu chứng lâm sàng quan sát được.'); return; }
      if (!safe) { setError('Xác nhận đã bắt đầu sơ cứu và đảm bảo an toàn cho ngựa.'); return; }
    } else if (type === 'PICKUP_ACCESS_BLOCKED') {
      if (!severity) { setError('Vui lòng chọn mức độ sự cố.'); return; }
      if (description.trim().length < 5) { setError('Vui lòng mô tả chi tiết lý do không thể tiếp cận (ít nhất 5 ký tự).'); return; }
      if (blockedPhotos.length === 0) {
        setError('Vui lòng tải lên ít nhất 1 ảnh chụp vị trí bị cản trở không thể vào.');
        return;
      }
      if (actionProposal === 'RELOCATE') {
        if (!proposedPlaceName.trim()) {
          setError('Vui lòng nhập tên hoặc mô tả chỗ dời địa điểm đề xuất.');
          return;
        }
        if (relocationPhotos.length === 0) {
          setError('Vui lòng tải lên ít nhất 1 ảnh chụp chỗ dời địa điểm đề xuất.');
          return;
        }
      }
    } else {
      if (!type || !severity) { setError('Chọn loại và mức độ sự cố.'); return; }
      if (description.trim().length < 5) { setError('Vui lòng mô tả sự việc ít nhất 5 ký tự.'); return; }
      if (!safe) { setError('Xác nhận người và ngựa đã an toàn hoặc đã bắt đầu sơ cứu.'); return; }
    }

    setSending(true);
    const blockedImg = blockedPhotos[0]?.url || blockedPhotos[0]?.name || undefined;
    const relocationImg = relocationPhotos[0]?.url || relocationPhotos[0]?.name || undefined;
    const customPhotos = type === 'PICKUP_ACCESS_BLOCKED'
      ? [...blockedPhotos.map((p) => p.url || p.name), ...relocationPhotos.map((p) => p.url || p.name)]
      : undefined;

    if (type === 'PICKUP_ACCESS_BLOCKED') {
      const cleanKey = trip.id.replace(/-/g, '_');
      try {
        localStorage.setItem(`rts_driver_pickup_status_${cleanKey}`, 'BLOCKED');
        localStorage.setItem(`rts_driver_pickup_status_${trip.id}`, 'BLOCKED');
        localStorage.setItem(`rts_pickup_evidence_${cleanKey}`, JSON.stringify({
          blockedImageUrl: blockedImg,
          relocationImageUrl: relocationImg,
          proposedPlaceName: actionProposal === 'RELOCATE' ? proposedPlaceName.trim() : undefined,
          reportedAt: new Date().toISOString(),
        }));
      } catch {}
      try {
        await driverApi.reportPickupAccessBlocked(trip.id, {
          reason: description.trim(),
          latitude: trip.stops[0]?.lat || 10.7769,
          longitude: trip.stops[0]?.lng || 106.7009,
          blockedImageUrl: blockedImg,
          relocationImageUrl: relocationImg,
          imageUrl: blockedImg,
          proposedRelocationPlaceName: actionProposal === 'RELOCATE' ? proposedPlaceName.trim() : undefined,
          notes: locationDetail || undefined,
        });
      } catch {}
    }

    const horseName = selectedHorse ? selectedHorse.name : selectedHorseId;
    const r = await actions.reportIncident(trip.id, {
      type: isHorseIssue ? 'HORSE_HEALTH' : (type as IncidentType),
      severity: severity as IncidentSeverity,
      description: description.trim(),
      locationDetail,
      safe,
      ratio: pickable ? ratio : 0,
      horseId: isHorseIssue ? selectedHorseId : undefined,
      horseName: isHorseIssue ? horseName : undefined,
      healthIssueType: isHorseIssue ? healthIssue : undefined,
      immediateCare: isHorseIssue ? immediateCare.trim() : undefined,
      proposedRelocationPlaceName: actionProposal === 'RELOCATE' ? proposedPlaceName.trim() : undefined,
      blockedImageUrl: blockedImg,
      relocationImageUrl: relocationImg,
      customPhotos,
    });
    setSending(false);
    if (!r.ok) { setError(r.message); return; }
    setError('');
    setType(isVet ? 'HORSE_HEALTH' : '');
    setSeverity(isVet ? 'HIGH' : '');
    setLocationDetail('');
    setDescription('');
    setImmediateCare('');
    setSafe(false);
    setProposedPlaceName('');
    setBlockedPhotos([]);
    setRelocationPhotos([]);
    setRatio(defaultSegmentRatio(trip));
  };

  return (
    <div className="drv-card">
      <h3 className="drv-card__title">{isVet ? 'Báo cáo sự cố sức khỏe ngựa' : 'Báo cáo sự cố'}</h3>
      <div className="drv-note drv-note--red" style={{ marginTop: 0, marginBottom: 10 }}>
        <Icon name="alert" />
        <div>
          <b>An toàn trước tiên</b>
          Đảm bảo an toàn cho người và ngựa, bắt đầu sơ cứu rồi mới báo cáo. Cứu hộ khẩn cấp không bao giờ phải chờ phê duyệt.
        </div>
      </div>
      <div className="drv-note drv-note--blue" style={{ marginTop: 0, marginBottom: 14 }}>
        <Icon name="info" />
        <div>
          <b>{isVet ? 'Thẩm quyền Bác sĩ thú y / Hộ tống' : 'Thẩm quyền Tài xế vận hành'}</b>
          {isVet
            ? 'Bác sĩ thú y chuyên trách theo dõi, sơ cứu và báo cáo sự cố sức khỏe ngựa. Thông tin được gửi trực tiếp đến Điều phối viên.'
            : 'Tài xế chuyên trách báo cáo các sự cố về phương tiện, đường sá và cửa khẩu. Các sự cố sức khỏe ngựa do Bác sĩ thú y báo cáo.'}
        </div>
      </div>

      {!isVet && (
        <div className="drv-field" style={{ marginBottom: 12 }}>
          <label htmlFor="inc-type">Loại sự cố *</label>
          <select
            id="inc-type"
            className="drv-select"
            value={type}
            onChange={(e) => {
              const val = e.target.value as IncidentType;
              setType(val);
              if (val === 'HORSE_HEALTH') {
                setSeverity('HIGH');
              }
            }}
          >
            <option value="">Chọn loại sự cố</option>
            {allowedTypes.map((t) => <option key={t} value={t}>{INCIDENT_TYPE_LABEL[t]}</option>)}
          </select>
        </div>
      )}

      {isHorseIssue ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Chọn con ngựa trên chuyến */}
          <div className="drv-field">
            <label htmlFor="inc-horse">Con ngựa gặp sự cố y tế *</label>
            <select
              id="inc-horse"
              className="drv-select"
              value={selectedHorseId}
              onChange={(e) => setSelectedHorseId(e.target.value)}
            >
              {tripHorseIds.length === 0 && <option value="">Không có dữ liệu ngựa trên chuyến</option>}
              {tripHorseIds.map((hId) => {
                const hObj = horses.find((h) => h.id === hId);
                return (
                  <option key={hId} value={hId}>
                    {hObj ? `${hObj.name} (${hObj.id}) • Giống ${hObj.breed}` : hId}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Chọn 3 loại sự cố sức khỏe ngựa */}
          <div className="drv-form-grid">
            <div className="drv-field">
              <label htmlFor="inc-health-issue">Loại sự cố sức khỏe *</label>
              <select
                id="inc-health-issue"
                className="drv-select"
                value={healthIssue}
                onChange={(e) => setHealthIssue(e.target.value as HorseHealthIssue)}
              >
                {HORSE_HEALTH_ISSUES.map((hi) => (
                  <option key={hi.id} value={hi.id}>
                    {hi.label} ({hi.desc.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>
            <div className="drv-field">
              <label htmlFor="inc-sev">Mức độ nguy cấp *</label>
              <select
                id="inc-sev"
                className="drv-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              >
                <option value="">Chọn</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ô nhập sơ cứu tại chỗ */}
          <div className="drv-field">
            <label htmlFor="inc-care">Biện pháp sơ cứu khẩn cấp đã tiến hành tại chỗ *</label>
            <textarea
              id="inc-care"
              className="drv-textarea"
              style={{ minHeight: 65 }}
              value={immediateCare}
              onChange={(e) => setImmediateCare(e.target.value)}
              placeholder="VD: Đã cho uống nước điện giải, chườm lạnh hạ nhiệt, tiêm thuốc giảm đau theo chỉ định..."
            />
          </div>

          {/* Ô nhập triệu chứng lâm sàng */}
          <div className="drv-field">
            <label htmlFor="inc-desc">Triệu chứng lâm sàng quan sát được *</label>
            <textarea
              id="inc-desc"
              className="drv-textarea"
              style={{ minHeight: 75 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Thân nhiệt đo được 39.8°C, thở dốc 45 nhịp/phút, mắt lờ đờ, bồn chồn ngoái nhìn bụng..."
            />
          </div>
        </div>
      ) : (
        <div className="drv-form-grid">
          <div className="drv-field">
            <label htmlFor="inc-sev">Mức độ *</label>
            <select id="inc-sev" className="drv-select" value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}>
              <option value="">Chọn</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="drv-inc-where" style={{ marginTop: 12 }}>
        <div><span>Thời điểm</span><b>{fmtDateTime(nowStamp())}</b></div>
        <div><span>Vị trí</span><b>{incidentWhere(trip, pickable ? ratio : 0)}</b></div>
      </div>
      {pickable && <IncidentLocationPicker trip={trip} ratio={ratio} onChange={setRatio} />}
      <div className="drv-field" style={{ marginTop: 10 }}>
        <label htmlFor="inc-loc">Chi tiết vị trí (không bắt buộc)</label>
        <input id="inc-loc" className="drv-input" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="VD: km 42, gần cây xăng Petrolimex" />
      </div>

      {!isHorseIssue && (
        <div className="drv-field">
          <label htmlFor="inc-desc">
            {type === 'PICKUP_ACCESS_BLOCKED' ? 'Chi tiết lý do cản trở đường vào *' : 'Chuyện gì đã xảy ra *'}
          </label>
          <textarea
            id="inc-desc"
            className="drv-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              type === 'PICKUP_ACCESS_BLOCKED'
                ? 'VD: Đường ngõ hẹp xe 10 tấn không vào được, cổng trang trại khóa không có người mở, cầu yếu...'
                : 'Mô tả tình huống, tình trạng xe và những gì bạn đã làm'
            }
          />
        </div>
      )}

      {type === 'PICKUP_ACCESS_BLOCKED' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
          {/* Lựa chọn phương án thực địa */}
          <div className="drv-field">
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Phương án đề xuất của tài xế:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="pickup-action-prop-form"
                  checked={actionProposal === 'RELOCATE'}
                  onChange={() => setActionProposal('RELOCATE')}
                />
                <span>
                  <b>Đề xuất dời địa điểm hẹn đón</b> (Dắt bộ ra chỗ xe đỗ chờ ngoài đường lớn)
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="pickup-action-prop-form"
                  checked={actionProposal === 'WAIT_COORDINATOR'}
                  onChange={() => setActionProposal('WAIT_COORDINATOR')}
                />
                <span>
                  <b>Chờ Điều phối viên khảo sát điểm hẹn đón mới</b>
                </span>
              </label>
            </div>
          </div>

          {/* Nhập tên chỗ dời địa điểm nếu tài xế chọn dời */}
          {actionProposal === 'RELOCATE' && (
            <div className="drv-field">
              <label htmlFor="proposed-reloc-place-inc" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Tên / Vị trí chỗ dời địa điểm đề xuất *
              </label>
              <input
                id="proposed-reloc-place-inc"
                type="text"
                className="drv-input"
                value={proposedPlaceName}
                onChange={(e) => setProposedPlaceName(e.target.value)}
                placeholder="VD: Cây xăng Petrolimex đầu ngõ 15, Bãi đất trống ngã ba liên xã..."
              />
            </div>
          )}

          {/* 1. Phần upload hình ảnh KHÔNG THỂ VÀO */}
          <div className="drv-field" style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '10px 12px', borderRadius: 8 }}>
            <label style={{ fontWeight: 700, display: 'block', marginBottom: 4, color: '#9f1239' }}>
              1. Ảnh chụp vị trí không thể vào (vật cản / đường hẹp / cấm tải / cổng khóa) *
            </label>
            <small style={{ color: '#be123c', display: 'block', marginBottom: 6 }}>
              Chụp cận cảnh biển cấm, đoạn đường hẹp hoặc chướng ngại vật khiến xe tải lớn không vào được.
            </small>
            <PhotoPicker
              photos={blockedPhotos}
              onAdd={(photo) => setBlockedPhotos((prev) => [...prev, photo])}
              onRemove={(idx) => setBlockedPhotos((prev) => prev.filter((_, i) => i !== idx))}
            />
          </div>

          {/* 2. Phần upload hình ảnh CHỌN CHỖ DỜI ĐỊA ĐIỂM (khi chọn dời địa điểm) */}
          {actionProposal === 'RELOCATE' && (
            <div className="drv-field" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: 8 }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 4, color: '#166534' }}>
                2. Ảnh chụp chỗ dời địa điểm đề xuất (bãi đỗ chờ / điểm hẹn dắt ngựa ra) *
              </label>
              <small style={{ color: '#15803d', display: 'block', marginBottom: 6 }}>
                Chụp vị trí xe đang đỗ an toàn ngoài đường lớn để Điều phối viên và Khách hàng nhận diện điểm đón mới.
              </small>
              <PhotoPicker
                photos={relocationPhotos}
                onAdd={(photo) => setRelocationPhotos((prev) => [...prev, photo])}
                onRemove={(idx) => setRelocationPhotos((prev) => prev.filter((_, i) => i !== idx))}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="drv-field" style={{ marginTop: 10 }}>
          <label>Ảnh hiện trường</label>
          <PhotoPicker photos={incidentPhotos} onAdd={actions.addIncidentPhoto} onRemove={actions.removeIncidentPhoto} />
        </div>
      )}

      {type !== 'PICKUP_ACCESS_BLOCKED' && (
        <label className="drv-check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
          {isHorseIssue ? 'Đã bắt đầu sơ cứu và đảm bảo an toàn cho ngựa' : 'Người và ngựa đã an toàn hoặc đã bắt đầu sơ cứu'}
        </label>
      )}
      {error && <p className="drv-error" role="alert">{error}</p>}
      <button
        type="button"
        className="drv-btn drv-btn--danger-solid drv-btn--lg drv-btn--block"
        style={{ marginTop: 12 }}
        disabled={sending}
        onClick={send}
      >
        {sending ? 'Đang gửi…' : (isVet ? 'Gửi báo cáo sự cố sức khỏe cho Điều phối' : 'Gửi báo cáo')}
      </button>
    </div>
  );
};

export const IncidentsPage: React.FC = () => {
  const { tripId } = useParams<{ tripId?: string }>();
  const navigate = useNavigate();
  const { activeTrips, myTrips, incidents, actions, me, horses } = useDriver();
  const trip = activeTrips.find((t) => t.id === tripId) ?? activeTrips[0] ?? myTrips[0];

  const isTripMatch = (incTripId?: string, currentTripId?: string, incId?: string, incAt?: string) => {
    // Sự cố mới tạo trong phiên hoặc vừa gửi: luôn hiển thị (hỗ trợ cả INC- và INC_)
    if (incId && (incId.startsWith('INC-') || incId.startsWith('INC_') || incId.startsWith('TEMP-'))) return true;
    if (incAt) {
      const parsedAt = new Date(incAt.replace(' ', 'T')).getTime();
      const diffMs = Date.now() - parsedAt;
      if (!isNaN(diffMs) && diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) return true;
    }
    if (!incTripId || !currentTripId) return true;
    const a = incTripId.trim().toUpperCase().replace(/[-_]/g, '');
    const b = currentTripId.trim().toUpperCase().replace(/[-_]/g, '');
    if (a === b || a.includes(b) || b.includes(a)) return true;
    if (activeTrips.length <= 1) return true;
    return false;
  };

  const list = trip
    ? incidents.filter((i) => isTripMatch(i.tripId, trip.id, i.id, i.at))
    : incidents;

  React.useEffect(() => {
    const handleReload = () => {
      actions.reload();
    };
    window.addEventListener('rts_incident_created', handleReload);
    window.addEventListener('rts_incident_pins_changed', handleReload);
    window.addEventListener('rts_requests_updated', handleReload);
    window.addEventListener('rts_vet_status_changed', handleReload);
    return () => {
      window.removeEventListener('rts_incident_created', handleReload);
      window.removeEventListener('rts_incident_pins_changed', handleReload);
      window.removeEventListener('rts_requests_updated', handleReload);
      window.removeEventListener('rts_vet_status_changed', handleReload);
    };
  }, [actions]);

  const isVetUser = React.useMemo(() => {
    if (me?.role === 'VETERINARIAN') return true;
    const fn = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : '') || me?.name || '';
    const em = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : '') || '';
    return /BS\.|Bác sĩ|thú y|escort|vet/i.test(fn) || /escort|vet/i.test(em);
  }, [me]);

  const actorRoleLabel = isVetUser ? 'Bác sĩ thú y' : 'Tài xế';

  // Phân quyền độc lập: Bác sĩ chỉ xem sự cố y tế của ngựa; Tài xế chỉ xem sự cố kỹ thuật xe cộ / giao thông
  const roleFilteredList = React.useMemo(() => {
    return list.filter((i) => {
      const isHorseHealth =
        i.type === 'HORSE_HEALTH' ||
        (i as any).reporterRole === 'VETERINARIAN' ||
        Boolean(i.horseId) ||
        Boolean(i.healthIssueType);
      if (isVetUser) {
        return isHorseHealth;
      }
      return !isHorseHealth;
    });
  }, [list, isVetUser]);

  // Sắp xếp sự cố mới nhất lên trên đầu (theo updatedAt hoặc at)
  const sortedList = [...roleFilteredList].sort((a, b) => {
    const parseTime = (val?: string | number | null) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const t = new Date(val).getTime();
      return isNaN(t) ? 0 : t;
    };
    const tA = Math.max(parseTime((a as any).updatedAt), parseTime(a.at));
    const tB = Math.max(parseTime((b as any).updatedAt), parseTime(b.at));
    if (tB !== tA) return tB - tA;
    return b.id.localeCompare(a.id);
  });

  const [viewingPlanIncident, setViewingPlanIncident] = useState<Incident | null>(null);
  const [acknowledgedIncidents, setAcknowledgedIncidents] = useState<Record<string, boolean>>({});
  const [acking, setAcking] = useState(false);

  // State xử lý của Bác sĩ thú y
  const [resolvingIncident, setResolvingIncident] = useState<Incident | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const [referralIncident, setReferralIncident] = useState<Incident | null>(null);
  const [stations, setStations] = useState<VetStationInfo[]>(AVAILABLE_VET_STATIONS);
  const [selectedStationId, setSelectedStationId] = useState(AVAILABLE_VET_STATIONS[0].id);
  const [customStationName, setCustomStationName] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [referring, setReferring] = useState(false);

  const currentProvince = React.useMemo(() => detectCurrentProvince(trip), [trip]);

  // Tải danh mục trạm thú y trực tiếp từ backend hoặc fallback danh sách chuẩn
  React.useEffect(() => {
    let active = true;
    driverApi.getVetFacilities({ tripId: trip?.id, province: currentProvince }).then((data) => {
      if (active && Array.isArray(data) && data.length > 0) {
        const mapped: VetStationInfo[] = data.map((d: any) => ({
          id: d.facilityId || d.id,
          name: d.name,
          address: d.address || '',
          phone: d.contactPhone || d.phone || '',
          country: d.countryCode || d.country || 'VN',
          province: d.stateProvince || d.province || '',
          region: d.region || 'OTHER',
          near: d.city || '',
          lat: d.latitude,
          lng: d.longitude,
          distanceKm: d.distanceKm,
          isSuggested: d.isSuggested,
        }));
        setStations(mapped);
      }
    });
    return () => {
      active = false;
    };
  }, [trip?.id, currentProvince]);

  const handleOpenReferralModal = (inc: Incident) => {
    setReferralIncident(inc);
    setReferralReason('');

    // Tự động tìm và chọn trạm thú y đề xuất gần nhất với tỉnh hiện tại
    const suggested = stations.find((st) => {
      if (st.isSuggested) return true;
      const p = (st.province || '').toLowerCase();
      const cp = currentProvince.toLowerCase();
      return p.includes(cp) || cp.includes(p) || (st.near && st.near.toLowerCase().includes(cp));
    });

    if (suggested) {
      setSelectedStationId(suggested.id);
    } else if (stations.length > 0) {
      setSelectedStationId(stations[0].id);
    }
  };

  // Local storage flags tracking
  const [resolvedMap, setResolvedMap] = useState<Record<string, boolean>>({});
  const [referralMap, setReferralMap] = useState<Record<string, { station: string; reason: string }>>({});
  const [transferApprovedMap, setTransferApprovedMap] = useState<Record<string, boolean>>({});
  const [continueAllowedMap, setContinueAllowedMap] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const resMap: Record<string, boolean> = {};
    const refMap: Record<string, { station: string; reason: string }> = {};
    const transMap: Record<string, boolean> = {};
    const contMap: Record<string, boolean> = {};

    sortedList.forEach((inc) => {
      const cleanId = inc.id.replace(/-/g, '_');
      try {
        const rawRes = localStorage.getItem(`rts_vet_resolved_${cleanId}`) || localStorage.getItem(`rts_vet_resolved_${inc.id}`);
        if (rawRes) {
          resMap[inc.id] = true;
          resMap[cleanId] = true;
        }
        const rawRef = localStorage.getItem(`rts_vet_referral_${cleanId}`) || localStorage.getItem(`rts_vet_referral_${inc.id}`);
        if (rawRef) {
          const parsed = JSON.parse(rawRef);
          refMap[inc.id] = parsed;
          refMap[cleanId] = parsed;
        }
        const rawTransfer = localStorage.getItem(`rts_vet_transfer_approved_${cleanId}`) || localStorage.getItem(`rts_vet_transfer_approved_${inc.id}`);
        if (rawTransfer) {
          transMap[inc.id] = true;
          transMap[cleanId] = true;
        }
        const rawCont = localStorage.getItem(`rts_incident_continue_${cleanId}`) || localStorage.getItem(`rts_incident_continue_${inc.id}`);
        if (rawCont) {
          contMap[inc.id] = true;
          contMap[cleanId] = true;
        }
      } catch {
        // ignore
      }
    });
    setResolvedMap(resMap);
    setReferralMap(refMap);
    setTransferApprovedMap(transMap);
    setContinueAllowedMap(contMap);
  }, [sortedList]);

  const handleAcknowledgePlan = async (incId: string) => {
    const actorRole = isVetUser ? 'VETERINARIAN' : 'MAIN_DRIVER';
    setAcking(true);
    try {
      await apiClient.post(`/incidents/${incId}/updates`, {
        updateType: 'FIELD_LOG',
        notes: `${actorRoleLabel} đã xác nhận tiếp nhận phương án xử lý và sẵn sàng phối hợp tại hiện trường.`,
      });
    } catch {
      // Backend log sync fallback
    }
    setAcknowledgedIncidents((prev) => ({ ...prev, [incId]: true }));
    setAcking(false);
    setViewingPlanIncident(null);

    if (typeof window !== 'undefined') {
      const cleanIncId = incId.replace(/-/g, '_');
      const payload = JSON.stringify({
        at: nowStamp(),
        ok: true,
        role: actorRole,
        by: actorRoleLabel,
        name: me?.name || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : '') || actorRoleLabel,
      });
      window.dispatchEvent(
        new CustomEvent('rts_incident_scene_ready', {
          detail: { id: incId, at: nowStamp(), updatedAt: nowStamp(), role: actorRole, by: actorRoleLabel },
        })
      );
      window.dispatchEvent(
        new CustomEvent('rts_incident_scene_ready', {
          detail: { id: cleanIncId, at: nowStamp(), updatedAt: nowStamp(), role: actorRole, by: actorRoleLabel },
        })
      );
      try {
        localStorage.setItem(`rts_driver_ack_${incId}`, payload);
        localStorage.setItem(`rts_driver_ack_${cleanIncId}`, payload);
        localStorage.setItem(`rts_ack_${incId}`, payload);
        localStorage.setItem(`rts_ack_${cleanIncId}`, payload);
      } catch {
        // ignore
      }
      notifySync('requests_updated');
    }

    actions.showToast(`${actorRoleLabel} đã xác nhận tiếp nhận phương án với Điều phối viên.`);
  };

  // Bác sĩ xác nhận: Sự cố đã được xử lý (ngựa đã ổn định)
  const handleResolveIncident = async () => {
    if (!resolvingIncident) return;
    const incId = resolvingIncident.id;
    const cleanIncId = incId.replace(/-/g, '_');
    const noteText = resolveNote.trim() || 'Ngựa đã hạ sốt, hết đau bụng, nhịp tim và thở bình thường. Đủ điều kiện tiếp tục di chuyển.';

    setResolving(true);
    try {
      await apiClient.post(`/incidents/${incId}/updates`, {
        updateType: 'FIELD_LOG',
        notes: `[Bác sĩ thú y] Sự cố đã được xử lý thành công, ngựa đã ổn định thể trạng: ${noteText}`,
      });
    } catch {
      // ignore
    }

    const payload = JSON.stringify({
      at: nowStamp(),
      status: 'STABILIZED',
      note: noteText,
      by: me?.name || 'Bác sĩ thú y',
    });

    try {
      localStorage.setItem(`rts_vet_resolved_${incId}`, payload);
      localStorage.setItem(`rts_vet_resolved_${cleanIncId}`, payload);
      localStorage.removeItem(`rts_vet_referral_${incId}`);
      localStorage.removeItem(`rts_vet_referral_${cleanIncId}`);
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      const now = nowStamp();
      window.dispatchEvent(
        new CustomEvent('rts_vet_status_changed', {
          detail: { id: incId, status: 'STABILIZED', note: noteText, at: now, updatedAt: now },
        })
      );
      window.dispatchEvent(
        new CustomEvent('rts_vet_status_changed', {
          detail: { id: cleanIncId, status: 'STABILIZED', note: noteText, at: now, updatedAt: now },
        })
      );
      notifySync('requests_updated');
    }

    setResolvedMap((prev) => ({ ...prev, [incId]: true, [cleanIncId]: true }));
    setResolving(false);
    setResolvingIncident(null);
    setResolveNote('');
    actions.showToast('Đã xác nhận sự cố được xử lý. Điều phối viên đã nhận thông báo để mở chặng tiếp tục!');
  };

  // Bác sĩ xác nhận: Không thể xử lý tại chỗ -> Đề xuất chuyển viện
  const handleReferralIncident = async () => {
    if (!referralIncident) return;
    const incId = referralIncident.id;
    const cleanIncId = incId.replace(/-/g, '_');

    let stationName = '';
    let stationAddress = '';
    let stationPhone = '';
    if (selectedStationId === 'OTHER') {
      stationName = customStationName.trim() || 'Cơ sở thú y địa phương gần nhất';
    } else {
      const st = stations.find((s) => s.id === selectedStationId);
      stationName = st?.name || selectedStationId;
      stationAddress = st?.address || '';
      stationPhone = st?.phone || '';
    }

    const reason = referralReason.trim() || 'Tình trạng chuyển biến nặng, không đáp ứng sơ cứu tại chỗ, cần trang thiết bị chuyên sâu.';

    setReferring(true);
    try {
      await apiClient.post(`/incidents/${incId}/updates`, {
        updateType: 'FIELD_LOG',
        notes: `[Bác sĩ thú y] Không thể xử lý tại chỗ. Đề xuất chuyển viện đến: ${stationName} (${stationAddress} • SĐT: ${stationPhone}). Lý do: ${reason}`,
        immediateCare: `${stationName} (${stationAddress} • SĐT: ${stationPhone})`,
      });
    } catch {
      // ignore
    }

    const payload = JSON.stringify({
      at: nowStamp(),
      status: 'REFERRAL_REQUESTED',
      station: stationName,
      address: stationAddress,
      phone: stationPhone,
      reason,
      by: me?.name || 'Bác sĩ thú y',
    });

    try {
      localStorage.setItem(`rts_vet_referral_${incId}`, payload);
      localStorage.setItem(`rts_vet_referral_${cleanIncId}`, payload);
      localStorage.removeItem(`rts_vet_resolved_${incId}`);
      localStorage.removeItem(`rts_vet_resolved_${cleanIncId}`);
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      const now = nowStamp();
      window.dispatchEvent(
        new CustomEvent('rts_vet_status_changed', {
          detail: { id: incId, status: 'REFERRAL_REQUESTED', station: stationName, reason, at: now, updatedAt: now },
        })
      );
      window.dispatchEvent(
        new CustomEvent('rts_vet_status_changed', {
          detail: { id: cleanIncId, status: 'REFERRAL_REQUESTED', station: stationName, reason, at: now, updatedAt: now },
        })
      );
      notifySync('requests_updated');
    }

    setReferralMap((prev) => ({
      ...prev,
      [incId]: { station: stationName, reason },
      [cleanIncId]: { station: stationName, reason },
    }));
    setReferring(false);
    setReferralIncident(null);
    setReferralReason('');
    setCustomStationName('');
    actions.showToast('Đã gửi đề xuất chuyển viện tới Điều phối viên!');
  };

  return (
    <DriverLayout title="Báo cáo sự cố">
      {!trip ? (
        <div className="drv-card drv-empty"><b>Không có chuyến đang hoạt động</b>Chỉ báo cáo sự cố cho chuyến đang được giao.</div>
      ) : (
        <>
          <div className="drv-head">
            <div>
              <h2 className="drv-title">Báo cáo &amp; theo dõi sự cố • {trip.id}</h2>
              <p className="drv-subtitle">{trip.origin} → {trip.destination}. Quản lý, Điều phối viên và Khách hàng nhận thông báo ngay khi bạn gửi.</p>
            </div>
            {activeTrips.length > 1 && (
              <select className="drv-select" style={{ width: 'auto' }} value={trip.id} onChange={(e) => navigate(`/driver/incidents/${e.target.value}`)} aria-label="Chọn chuyến">
                {activeTrips.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
              </select>
            )}
          </div>

          <PickupAccessOrderBanner
            trip={trip}
            onAcknowledge={() => actions.acknowledgePickupResolution(trip.id)}
            onConfirmResolved={() => actions.confirmPickupAccessResolved(trip.id)}
          />

          <div className="drv-grid2">
            <ReportForm key={trip.id} trip={trip} />
            <div className="drv-card">
              <div className="between" style={{ marginBottom: 12 }}>
                <h3 className="drv-card__title" style={{ margin: 0 }}>
                  {isVetUser ? 'Lịch sử sự cố sức khỏe ngựa' : 'Lịch sử sự cố vận hành'} ({sortedList.length})
                </h3>
                <span className="drv-hint" style={{ margin: 0 }}>Mới nhất lên đầu</span>
              </div>
              {sortedList.length ? sortedList.map((i) => {
                const hasPlan = !!(i.approvedPlan || i.resolutionNotes);
                const isAcked = !!(acknowledgedIncidents[i.id] || (i as any).isSceneReady || (i as any).acknowledged);
                const isHorseHealth = i.type === 'HORSE_HEALTH' || (i as any).reporterRole === 'VETERINARIAN';
                const horseObj = i.horseId ? horses.find((h) => h.id === i.horseId) : null;
                const horseNameDisplay = i.horseName || (horseObj ? horseObj.name : (i.horseId || 'Ngựa trên chuyến'));

                const cleanId = i.id.replace(/-/g, '_');
                const isResolved = Boolean(resolvedMap[i.id] || resolvedMap[cleanId] || i.vetStatus === 'STABILIZED');
                const referralInfo = referralMap[i.id] || referralMap[cleanId];
                const isReferral = Boolean(
                  referralInfo ||
                  i.vetStatus === 'REFERRAL_REQUESTED' ||
                  (i as any).targetVetStation ||
                  (i as any).targetStation ||
                  (i.description || '').includes('chuyển viện')
                );
                const isTransferApproved = Boolean(
                  transferApprovedMap[i.id] ||
                  transferApprovedMap[cleanId] ||
                  (i as any).isTransferApproved ||
                  (i as any).resolutionType === 'VET_TRANSFER' ||
                  (i as any).vetStatus === 'TRANSFER_APPROVED'
                );
                const isContinueAllowed = Boolean(
                  continueAllowedMap[i.id] ||
                  continueAllowedMap[cleanId] ||
                  (i as any).continueAt ||
                  (i.status as string) === 'CONTINUE_ALLOWED'
                );
                const isCoordAccepted =
                  !['REPORTED', 'NEW'].includes(i.status) ||
                  Boolean((i as any).ackAt) ||
                  Boolean((i as any).isCoordAccepted) ||
                  isTransferApproved ||
                  isContinueAllowed ||
                  hasPlan;

                return (
                  <div key={i.id} className="drv-verify" style={{ marginBottom: 14 }}>
                    <div className="drv-card__title" style={{ marginBottom: 4 }}>
                      <span>
                        {i.id} • {isHorseHealth ? `Sức khỏe: ${horseNameDisplay}` : INCIDENT_TYPE_LABEL[i.type]}
                      </span>
                      <TripStatusBadge status={i.status} />
                    </div>
                    <p className="drv-hint" style={{ marginTop: 0 }}>
                      {fmtDateTime(i.at)} • {i.location} • mức độ {SEVERITY_LABEL[i.severity].toLowerCase()}
                    </p>

                    {isHorseHealth ? (
                      <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-page, #f8fafc)', borderRadius: 6, border: '1px solid var(--border-color, #e2e8f0)' }}>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>
                          <b>Con ngựa:</b> {horseNameDisplay} {i.horseId ? `(${i.horseId})` : ''}
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>
                          <b>Loại triệu chứng:</b>{' '}
                          <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                            {HEALTH_ISSUE_LABEL[i.healthIssueType || ''] || 'Sự cố sức khỏe ngựa'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>
                          <b>Sơ cứu tại chỗ:</b> {i.immediateCare || 'Đã tiến hành sơ cứu ban đầu.'}
                        </div>
                        <div style={{ fontSize: 13 }}>
                          <b>Triệu chứng lâm sàng:</b> {i.description}
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.55 }}>{i.description}</p>
                    )}

                    {i.photos && i.photos.length > 0 && <p className="drv-hint">{i.photos.length} ảnh đính kèm</p>}

                    {/* Khối trạng thái cấp cứu y tế của Bác sĩ thú y */}
                    {isHorseHealth && (
                      <div style={{ marginTop: 10 }}>
                        {isContinueAllowed ? (
                          <div className="drv-note drv-note--green" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="check" />
                            <div>
                              <b>Điều phối viên đã cho phép tiếp tục hành trình</b>
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                Nguy cơ sự cố đã được kiểm soát an toàn. Xe tiếp tục di chuyển theo lịch trình kế hoạch.
                              </div>
                            </div>
                          </div>
                        ) : isTransferApproved ? (
                          <div className="drv-note drv-note--green" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="check" />
                            <div>
                              <b>Điều phối viên đã phê duyệt lộ trình chuyển trạm y tế</b>
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                Cơ sở tiếp nhận: <b>{referralInfo?.station || (i as any).targetVetStation || 'Bệnh viện thú y chuyên khoa'}</b>.
                                Lộ trình xe đã được chuyển hướng đến bệnh viện. Bác sĩ thú y duy trì cấp cứu &amp; theo dõi thể trạng ngựa trên xe.
                              </div>
                            </div>
                          </div>
                        ) : isResolved ? (
                          <div className="drv-note drv-note--green" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="check" />
                            <div>
                              <b>Sự cố đã được xử lý ổn định</b>
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                Bác sĩ thú y đã xác nhận ngựa ổn định thể trạng, đủ điều kiện tiếp tục hành trình.
                              </div>
                            </div>
                          </div>
                        ) : isReferral ? (
                          <div className="drv-note drv-note--red" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="alert" />
                            <div>
                              <b>Đã đề xuất chuyển trạm y tế khẩn cấp</b>
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                Cơ sở đề xuất: <b>{referralInfo?.station || (i as any).targetVetStation || 'Cơ sở thú y'}</b>. Đang chờ Điều phối viên phê duyệt lộ trình.
                              </div>
                            </div>
                          </div>
                        ) : !isCoordAccepted ? (
                          <div className="drv-note drv-note--blue" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="info" />
                            <div>
                              <b>Đang chờ Điều phối viên tiếp nhận</b>
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                Đã gửi báo cáo lên Điều phối viên. Bác sĩ duy trì sơ cứu, giữ an toàn cho ngựa tại hiện trường.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="drv-note drv-note--blue" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="info" />
                            <div>
                              <b>Điều phối viên đã tiếp nhận • Đang cấp cứu tại hiện trường</b>
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                Bác sĩ tiếp tục xử lý thể trạng ngựa và bấm nút cập nhật kết quả bên dưới:
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2 nút thao tác cấp cứu cho Bác sĩ thú y / Tổ xe: Hiển thị khi chưa giải quyết / chưa chuyển viện */}
                        {!isResolved && !isReferral && !isTransferApproved && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="drv-btn drv-btn--solid drv-btn--sm"
                                style={{ background: '#059669', borderColor: '#059669', color: '#fff' }}
                                disabled={!isCoordAccepted}
                                title={!isCoordAccepted ? 'Chờ Điều phối viên tiếp nhận sự cố' : undefined}
                                onClick={() => {
                                  setResolvingIncident(i);
                                  setResolveNote('');
                                }}
                              >
                                Sự cố đã được xử lý
                              </button>
                              <button
                                type="button"
                                className="drv-btn drv-btn--danger-solid drv-btn--sm"
                                disabled={!isCoordAccepted}
                                title={!isCoordAccepted ? 'Chờ Điều phối viên tiếp nhận sự cố' : undefined}
                                onClick={() => handleOpenReferralModal(i)}
                              >
                                Không thể xử lý tại chỗ
                              </button>
                            </div>
                            {!isCoordAccepted && (
                              <p className="drv-hint" style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                                Chờ Điều phối viên tiếp nhận sự cố trước khi cập nhật kết quả.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Phương án xử lý / Chỉ đạo của Điều phối cho Tài xế */}
                    {!isHorseHealth && (
                      <div style={{ marginTop: 10 }}>
                        {hasPlan ? (
                          <div className="drv-note drv-note--green" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Icon name="check" />
                              <b>Điều phối đã phê duyệt phương án xử lý</b>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                              {i.approvedPlan || 'Đã có phương án xử lý cụ thể từ Điều phối viên.'}
                            </p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="drv-btn drv-btn--solid drv-btn--sm"
                                onClick={() => setViewingPlanIncident(i)}
                              >
                                Xem phương án &amp; Báo đã nhận
                              </button>
                              {!isResolved && (
                                <button
                                  type="button"
                                  className="drv-btn drv-btn--solid drv-btn--sm"
                                  style={{ background: '#059669', borderColor: '#059669', color: '#fff' }}
                                  onClick={() => {
                                    setResolvingIncident(i);
                                    setResolveNote('Phương tiện đã được khắc phục, đáp ứng an toàn tiếp tục chặng.');
                                  }}
                                >
                                  Sự cố đã được xử lý
                                </button>
                              )}
                              {isAcked && <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>✓ Đã xác nhận tiếp nhận phương án</span>}
                              {isResolved && <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>✓ Đã báo sự cố được xử lý</span>}
                            </div>
                          </div>
                        ) : isCoordAccepted ? (
                          <div className="drv-note drv-note--blue" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Icon name="info" />
                              <b>Điều phối viên đã tiếp nhận sự cố</b>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                              Điều phối viên đang kiểm tra hiện trường để ra phương án chỉ đạo cụ thể. Vui lòng giữ an toàn cho người và xe.
                            </p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="drv-btn drv-btn--ghost drv-btn--sm"
                                onClick={() => setViewingPlanIncident(i)}
                              >
                                Xem trạng thái chỉ đạo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="drv-note drv-note--blue" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Icon name="info" />
                              <b>Đang chờ Điều phối viên tiếp nhận &amp; chỉ đạo</b>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                              Báo cáo đã gửi lên trung tâm điều phối. Tài xế bật đèn khẩn cấp và giữ an toàn tại hiện trường.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <p className="drv-hint">
                  {isVetUser ? 'Chưa có sự cố sức khỏe ngựa nào được ghi nhận.' : 'Chưa có sự cố vận hành nào được ghi nhận.'}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal 1: Bác sĩ xác nhận Sự cố đã được xử lý (ngựa đã ổn định) */}
      {resolvingIncident && (
        <Modal
          open={!!resolvingIncident}
          title="Xác nhận sự cố sức khỏe đã được xử lý"
          okText={resolving ? 'Đang gửi...' : 'Xác nhận ngựa đã ổn định'}
          okDisabled={resolving}
          onOk={handleResolveIncident}
          onClose={() => setResolvingIncident(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 10, background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
              <b style={{ color: '#065f46' }}>Ngựa đã được cấp cứu ổn định tại hiện trường</b>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#047857' }}>
                Xác nhận này sẽ được gửi trực tiếp đến Điều phối viên để mở khóa cho phép xe tiếp tục hành trình.
              </p>
            </div>
            <div className="drv-field">
              <label htmlFor="res-note">Ghi chú lâm sàng / Kết quả xử lý *</label>
              <textarea
                id="res-note"
                className="drv-textarea"
                style={{ minHeight: 80 }}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="VD: Ngựa đã hạ sốt (38.2°C), giảm đau rõ rệt, nhịp tim ổn định 40 bpm, đã uống được nước, đủ điều kiện tiếp tục di chuyển."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 2: Bác sĩ báo Không thể xử lý tại chỗ -> Đề xuất chuyển viện */}
      {referralIncident && (
        <Modal
          open={!!referralIncident}
          title="Báo cáo không thể xử lý tại chỗ – Chuyển trạm y tế"
          okText={referring ? 'Đang gửi...' : 'Gửi yêu cầu chuyển viện'}
          okDisabled={referring}
          onOk={handleReferralIncident}
          onClose={() => setReferralIncident(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 10, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
              <b style={{ color: '#991b1b' }}>Yêu cầu can thiệp y tế khẩn cấp</b>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#b91c1c' }}>
                Ngựa không đáp ứng sơ cứu tại chỗ hoặc cần trang thiết bị chuyên môn. Điều phối viên sẽ nhận thông tin để điều chỉnh lộ trình khẩn cấp.
              </p>
            </div>

            <div className="drv-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label htmlFor="ref-station" style={{ fontWeight: 600 }}>
                  Chọn Cơ sở y tế / Bệnh viện thú y đề xuất *
                </label>
                {currentProvince && (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>
                    Khu vực hiện tại: <b>{currentProvince}</b>
                  </span>
                )}
              </div>
              <select
                id="ref-station"
                className="drv-select"
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
              >
                {/* 1. Gợi ý gần vị trí hiện tại */}
                {(() => {
                  const suggested = stations.filter((st) => {
                    if (st.isSuggested) return true;
                    const p = (st.province || '').toLowerCase();
                    const cp = currentProvince.toLowerCase();
                    return p.includes(cp) || cp.includes(p) || (st.near && st.near.toLowerCase().includes(cp));
                  });

                  if (suggested.length === 0) return null;
                  return (
                    <optgroup label={`Gợi ý gần nhất theo vị trí xe (Tỉnh: ${currentProvince})`}>
                      {suggested.map((st) => (
                        <option key={`sug-${st.id}`} value={st.id}>
                          {st.name} — {st.address}
                        </option>
                      ))}
                    </optgroup>
                  );
                })()}

                {/* 2. Miền Nam */}
                <optgroup label="Cơ sở thú y Miền Nam">
                  {stations
                    .filter((st) => st.region === 'SOUTH')
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.address}
                      </option>
                    ))}
                </optgroup>

                {/* 3. Miền Trung */}
                <optgroup label="Cơ sở thú y Miền Trung">
                  {stations
                    .filter((st) => st.region === 'CENTRAL')
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.address}
                      </option>
                    ))}
                </optgroup>

                {/* 4. Miền Bắc */}
                <optgroup label="Cơ sở thú y Miền Bắc">
                  {stations
                    .filter((st) => st.region === 'NORTH')
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.address}
                      </option>
                    ))}
                </optgroup>

                {/* 5. Quốc tế */}
                <optgroup label="Cơ sở thú y Quốc tế">
                  {stations
                    .filter((st) => st.region === 'INTERNATIONAL')
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.address}
                      </option>
                    ))}
                </optgroup>

                <option value="OTHER">Cơ sở thú y khác (tự nhập tên)</option>
              </select>
            </div>

            {/* Thẻ tóm tắt thông tin cơ sở được chọn */}
            {selectedStationId !== 'OTHER' && (() => {
              const selectedStation = stations.find((s) => s.id === selectedStationId);
              if (!selectedStation) return null;
              return (
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--bg-page, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 6,
                  fontSize: 13,
                  lineHeight: 1.5
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 2 }}>
                    {selectedStation.name}
                  </div>
                  <div style={{ color: 'var(--text-secondary, #475569)' }}>
                    Địa chỉ: {selectedStation.address}
                  </div>
                  <div style={{ color: 'var(--text-secondary, #475569)', marginTop: 2, display: 'flex', gap: 16 }}>
                    <span>
                      Đường dây nóng cấp cứu: <b style={{ color: 'var(--text-primary, #0f172a)' }}>{selectedStation.phone || 'Chưa có'}</b>
                    </span>
                    {selectedStation.distanceKm !== undefined && (
                      <span>
                        Khoảng cách: <b>{selectedStation.distanceKm} km</b>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {selectedStationId === 'OTHER' && (
              <div className="drv-field">
                <label htmlFor="ref-custom-station">Tên cơ sở thú y đề xuất *</label>
                <input
                  id="ref-custom-station"
                  className="drv-input"
                  value={customStationName}
                  onChange={(e) => setCustomStationName(e.target.value)}
                  placeholder="Nhập tên cơ sở thú y, phòng khám hoặc bệnh viện dã chiến..."
                />
              </div>
            )}

            <div className="drv-field">
              <label htmlFor="ref-reason">Lý do không thể xử lý tại chỗ / Đánh giá lâm sàng *</label>
              <textarea
                id="ref-reason"
                className="drv-textarea"
                style={{ minHeight: 80 }}
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder="VD: Nghi ngờ xoắn ruột / sốc nhiệt cấp tính không hạ nhiệt, cần truyền dịch áp lực cao và can thiệp phẫu thuật khẩn cấp..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal hiển thị chi tiết phương án xử lý cho tài xế / bác sĩ */}
      {viewingPlanIncident && (
        <Modal
          open={!!viewingPlanIncident}
          title={`Phương án xử lý sự cố • ${viewingPlanIncident.id}`}
          okText={
            (acknowledgedIncidents[viewingPlanIncident.id] || (viewingPlanIncident as any).isSceneReady || (viewingPlanIncident as any).acknowledged)
              ? `${actorRoleLabel} đã xác nhận`
              : `${actorRoleLabel} xác nhận tiếp nhận`
          }
          okDisabled={Boolean(acknowledgedIncidents[viewingPlanIncident.id] || (viewingPlanIncident as any).isSceneReady || (viewingPlanIncident as any).acknowledged || acking)}
          onOk={() => handleAcknowledgePlan(viewingPlanIncident.id)}
          onClose={() => setViewingPlanIncident(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 10, background: 'var(--bg-page, #f3f4f6)', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginBottom: 2 }}>Hướng xử lý của Điều phối:</div>
              <b style={{ fontSize: 14, color: 'var(--text-primary, #111827)' }}>
                {PLAN_TYPE_LABEL[viewingPlanIncident.resolutionType || ''] || viewingPlanIncident.resolutionType || 'Phương án khắc phục sự cố'}
              </b>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginBottom: 4, fontWeight: 600 }}>
                Chỉ dẫn cụ thể cho {actorRoleLabel.toLowerCase()} tại hiện trường:
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, padding: 12, background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                {viewingPlanIncident.approvedPlan || 'Thực hiện các bước khắc phục theo chỉ dẫn của Điều phối viên.'}
              </div>
            </div>

            {viewingPlanIncident.resolutionNotes && viewingPlanIncident.resolutionNotes !== viewingPlanIncident.approvedPlan && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginBottom: 4, fontWeight: 600 }}>
                  Thông tin điều động hỗ trợ (Phương tiện / Nhân sự / Lộ trình):
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, padding: 12, background: 'var(--bg-page, #f8fafc)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                  {viewingPlanIncident.resolutionNotes}
                </div>
              </div>
            )}

            <div className="drv-note drv-note--blue" style={{ marginTop: 4 }}>
              <Icon name="info" />
              <div>
                <b>Lưu ý {actorRoleLabel}:</b>{' '}
                {(acknowledgedIncidents[viewingPlanIncident.id] || (viewingPlanIncident as any).isSceneReady || (viewingPlanIncident as any).acknowledged) ? (
                  `Bạn (${actorRoleLabel}) đã xác nhận tiếp nhận phương án. Đang phối hợp cùng Điều phối viên để xử lý sự cố.`
                ) : (
                  <>Luôn ưu tiên an toàn cho người và ngựa. Bấm nút <i>“{actorRoleLabel} xác nhận tiếp nhận”</i> bên dưới để thông báo cho Điều phối viên biết bạn đã nắm rõ phương án.</>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </DriverLayout>
  );
};

export default IncidentsPage;
