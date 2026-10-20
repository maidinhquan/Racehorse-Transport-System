import React from 'react';
import type { MockTrip } from './coordinator.types';
import { RenderTripStudioPage } from './RenderTripStudioPage';

interface RenderActiveTripsPageProps {
  curTrip: MockTrip;
  tripTab: 'overview' | 'route' | 'resources' | 'flight' | 'milestones';
  setTripTab: (tab: 'overview' | 'route' | 'resources' | 'flight' | 'milestones') => void;
  lang: 'vi' | 'en';
  truckPos: { lat: number; lng: number };
  onBack: () => void;
  onSetGroundVehicle: (leg: 'outbound' | 'inbound', vehicleId: string) => void;
  onSetGroundCrew: (leg: 'outbound' | 'inbound', role: 'mainDriver' | 'coDriver' | 'vet', staffId: string) => void;
  onConfirmResources: () => void;
  onSubmitRoute: () => void;
  onDemoDeploy: () => void;
  onDemoApprove: () => void;
  onDemoReturn: () => void;
}

export const RenderActiveTripsPage: React.FC<RenderActiveTripsPageProps> = (props) => {
  return (
    <div className="render-active-trips-page">
      <div className="card pad" style={{ marginBottom: '20px' }}>
        <div className="section-title">
          <h3 className="card-title">Giám sát các chuyến đang trên đường (Active Trips)</h3>
        </div>
        <p className="subtitle">
          Theo dõi vị trí xe tải chuyên dụng thời gian thực và các mốc kiểm tra sinh hiệu.
        </p>
      </div>

      <RenderTripStudioPage {...props} />
    </div>
  );
};
