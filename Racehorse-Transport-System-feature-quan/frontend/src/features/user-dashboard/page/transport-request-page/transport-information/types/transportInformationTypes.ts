export interface LocationInformation {
  name: string;
  contactPerson: string;
  address: string;
  postalCode: string;
  phone: string;
  notes: string;
}

export interface SelectedHorse {
  horseId: string;
  careNotes: string;
}

export type TransportDocumentStatus =
  | "Valid"
  | "Missing"
  | "Uploaded"
  | "Processing";

export interface TransportDocument {
  id: string;
  name: string;
  horseId?: string;

  status: TransportDocumentStatus;

  source:
    | "Horse Profile"
    | "Trip"
    | "CBN Transport";

  requiredByCustomer: boolean;

  fileName?: string;
}

export interface TransportInformationDraft {
  pickup: LocationInformation;
  delivery: LocationInformation;

  selectedHorses: SelectedHorse[];

  documents: TransportDocument[];

  confirmed: boolean;
}