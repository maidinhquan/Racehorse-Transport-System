export type BloodTestStatus = 'Negative' | 'Positive' | 'Pending';

export interface BloodTestItem {
  diseaseKey: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV';
  diseaseName: string;
  status: BloodTestStatus;
  samplingDate: string;
  laboratoryName: string;
  file?: File | null;
  filePreviewUrl?: string;
  fileName?: string;
}

export interface VaccinationEntry {
  id: string;
  vaccineName: string;
  administeredDate: string;
  batchNumber: string;
  veterinarian: string;
}

export interface FlightDetails {
  arrivalDate: string;
  departureAirport: string;
  arrivalAirport: string;
  flightNumber: string;
}

export interface AnimalProfile {
  breed: string;
  purpose: 'Racing' | 'Breeding' | 'Commercial' | 'Other';
  quantity: number;
  microchipNumber: string;
  microchipLocation: string;
  identificationMarkings: string;
}

export interface StakeholderParty {
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
}

export interface Stakeholders {
  exporterVN: StakeholderParty;
  importerJP: StakeholderParty;
  thirdPartyAgent: StakeholderParty;
}

export interface QuarantineBooking {
  vnQuarantineFacility: string;
  vnQuarantineStartDate: string;
  vnQuarantineEndDate: string;
  vnCertificateFile?: File | null;
  vnCertificateFileName?: string;
  vnCertificatePreviewUrl?: string;
  jpQuarantineStation: string;
  jpBookingConfirmationFile?: File | null;
  jpBookingConfirmationFileName?: string;
  jpBookingConfirmationPreviewUrl?: string;
}

export interface MedicalApproval {
  isQuarantineEligible: boolean;
  allFourTestsPassed: boolean;
  officialCertIssued: boolean;
  officialCertNumber: string;
  officialCertFile?: File | null;
  officialCertFileName?: string;
  officialCertPreviewUrl?: string;
  approvedByDoctor: string;
  approvalDate: string;
}

export interface LegVehicleInfo {
  legNumber: 1 | 2 | 3 | 4;
  legTitle: string;
  vehiclePlateOrFlight: string;
  vehicleTypeOrContainer: string;
  departureTime: string;
  estimatedArrivalTime: string;
  destinationDetails: string;
}

export interface LegCrewInfo {
  driverName?: string;
  driverPhone?: string;
  driverLicense?: string;
  healthEscortName?: string;
  healthEscortPhone?: string;
  flightEscortName?: string;
  flightEscortPassport?: string;
  flightEscortPhone?: string;
  destinationFarmCode?: string;
}

export interface JapanRoutePackageData {
  flightDetails: FlightDetails;
  animalProfile: AnimalProfile;
  stakeholders: Stakeholders;
  quarantineBooking: QuarantineBooking;
  bloodTests: Record<'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV', BloodTestItem>;
  vaccinations: VaccinationEntry[];
  vaccinationBookImages: { id: string; url: string; name: string }[];
  medicalApproval: MedicalApproval;
  vehicles: {
    leg1: LegVehicleInfo;
    leg2: LegVehicleInfo;
    leg3: LegVehicleInfo;
    leg4: LegVehicleInfo;
  };
  crews: {
    leg1Crew: LegCrewInfo;
    flightCrew: LegCrewInfo;
    leg4Crew: LegCrewInfo;
  };
}
