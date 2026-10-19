import {beforeEach,expect,test,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PlanningWorkspace} from './PlanningWorkspace';
import {get} from '../../../flow1/api';
vi.mock('../../../flow1/api',()=>({get:vi.fn(),post:vi.fn(),flow1Error:(e:Error)=>e.message}));
vi.mock('../../../flow1/relational/api',()=>({download:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
const row={tripId:'real-trip',tripVersion:'trip-version',requestId:'real-request',origin:'Actual pickup',destination:'Actual delivery',transportMode:'ROAD',departureAt:'2099-01-01T01:00:00Z',deliveryAt:'2099-01-02T01:00:00Z',horses:[],documents:[],eventId:'release-event',plan:{planId:'saved-plan',planVersion:1,version:'plan-version',status:'APPROVED',operationsReady:false,documentsReady:false,departureAuthorized:false,legs:[]}};
function mockData(value:unknown){vi.mocked(get).mockImplementation(async url=>url==='/planning/trips'?value:{vehicles:[],staff:[],flights:[]});}
test('manager cannot authorize departure without both readiness gates',async()=>{
 mockData([row]);render(<MemoryRouter><PlanningWorkspace role="manager"/></MemoryRouter>);
 expect(await screen.findByRole('button',{name:'Cho phép khởi hành'})).toBeDisabled();
});
test('coordinator can confirm bookings only after manager approval',async()=>{
 mockData([{...row,plan:{...row.plan,status:'DRAFT'}}]);render(<MemoryRouter><PlanningWorkspace/></MemoryRouter>);
 await screen.findByRole('button',{name:'Gửi kiểm tra khả thi & giữ chỗ'});expect(screen.queryByRole('button',{name:'Xác nhận booking & Operations READY'})).not.toBeInTheDocument();
});
test('failed backend connection never loads localStorage or bundled sample trips',async()=>{
 localStorage.setItem('cbn_coordinator_trips',JSON.stringify([{id:'fake-local-trip'}]));vi.mocked(get).mockRejectedValue(new Error('SQL unavailable'));
 render(<MemoryRouter><PlanningWorkspace/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('SQL unavailable');expect(screen.queryByText('fake-local-trip')).not.toBeInTheDocument();
});
