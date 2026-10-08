import type {
  LocationInformation,
  TransportInformationDraft,
} from "../types/transportInformationTypes";

export const emptyLocation: LocationInformation = {
  name: "",
  contactPerson: "",
  address: "",
  postalCode: "",
  phone: "",
  notes: "",
};

export const initialTransportInformationDraft: TransportInformationDraft = {
  pickup: {
    ...emptyLocation,
  },

  delivery: {
    ...emptyLocation,
  },

  selectedHorses: [],

  documents: [],

  confirmed: false,
};

export const transportInformationSteps = [
  "Pickup & Delivery",
  "Horse Information",
  "Documents",
  "Review & Confirm",
];