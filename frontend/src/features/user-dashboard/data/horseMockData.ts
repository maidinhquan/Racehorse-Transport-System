export type HorseProfileStatus =
  | "Complete"
  | "Needs Attention"
  | "Incomplete";

export type PassportStatus =
  | "Valid"
  | "Expiring Soon"
  | "Expired"
  | "Missing";

export type MedicalStatus =
  | "Complete"
  | "Action Needed"
  | "Missing";

export interface Horse {
  id: string;
  name: string;
  breed: string;
  sex: string;
  age: number;

  microchip: string;

  profileStatus: HorseProfileStatus;
  passportStatus: PassportStatus;
  medicalStatus: MedicalStatus;

  photo?: string;

  transportCount: number;
  lastRoute?: string;
}

export const horses: Horse[] = [
  {
    id: "HOR-1029",
    name: "Thunderbolt",
    breed: "Thoroughbred",
    sex: "Male",
    age: 6,

    microchip: "900215001234567",

    profileStatus: "Complete",
    passportStatus: "Valid",
    medicalStatus: "Complete",

    transportCount: 3,
    lastRoute: "Ho Chi Minh City → Bangkok",
  },

  {
    id: "HOR-1035",
    name: "Shadowfax",
    breed: "Andalusian",
    sex: "Gelding",
    age: 10,

    microchip: "900215001234568",

    profileStatus: "Needs Attention",
    passportStatus: "Valid",
    medicalStatus: "Action Needed",

    transportCount: 1,
    lastRoute: "Hanoi → Ho Chi Minh City",
  },

  {
    id: "HOR-1092",
    name: "Apollo",
    breed: "Thoroughbred",
    sex: "Stallion",
    age: 5,

    microchip: "900215001234569",

    profileStatus: "Complete",
    passportStatus: "Expiring Soon",
    medicalStatus: "Complete",

    transportCount: 2,
    lastRoute: "Sydney → Ho Chi Minh City",
  },

  {
    id: "HOR-1120",
    name: "Silver Star",
    breed: "Arabian",
    sex: "Mare",
    age: 7,

    microchip: "",

    profileStatus: "Incomplete",
    passportStatus: "Missing",
    medicalStatus: "Missing",

    transportCount: 0,
  },
];