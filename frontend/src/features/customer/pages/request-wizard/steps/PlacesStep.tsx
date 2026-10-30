import React from 'react';
import { Navigate } from 'react-router-dom';
import type { TransportRequest } from '../../../types';

/** Compatibility entry for the former standalone pickup/delivery step. */
export const PlacesStep: React.FC<{ request: TransportRequest }> = ({ request }) => (
  <Navigate to={`/customer/requests/${request.id}/edit`} replace />
);
export default PlacesStep;
