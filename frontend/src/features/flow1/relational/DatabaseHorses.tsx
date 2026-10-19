import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../../shared/layouts/CustomerLayout/CustomerLayout';
import { relational, download } from './api';
import type { Horse } from './api';
import { flow1Error } from '../api';
export function DatabaseHorses(){
 const [horses,setHorses]=useState<Horse[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{relational.horses().then(setHorses).catch(e=>setError(flow1Error(e))).finally(()=>setLoading(false));},[]);
 return <CustomerLayout pageTitle="Ngựa của tôi"><div style={{padding:32}}><h1>Ngựa của tôi</h1><p><Link to="/customer/requests/new">Tạo yêu cầu & thêm hồ sơ ngựa mới</Link></p>{error&&<p role="alert">{error}</p>}{loading?<p>Đang tải…</p>:!horses.length?<p>Chưa có hồ sơ ngựa được lưu trong tài khoản.</p>:horses.map(h=><article key={h.horseId} style={{background:'white',padding:24,marginTop:16,border:'1px solid #dce3ee',borderRadius:12}}><h2>{h.name}</h2><p>Microchip: {h.microchipIso} · Hộ chiếu: {h.passportNo}</p><p>{h.hasDocuments?'Đã có ảnh và hộ chiếu':'Chưa đủ hồ sơ'} · {h.selectable?'Có thể chọn cho yêu cầu':'Đang có yêu cầu hoặc cần bổ sung hồ sơ'}</p><button onClick={()=>download(`/customer/horses/${h.horseId}/files/passport`,'passport').catch(e=>setError(flow1Error(e)))}>Xem hộ chiếu</button></article>)}</div></CustomerLayout>;
}
