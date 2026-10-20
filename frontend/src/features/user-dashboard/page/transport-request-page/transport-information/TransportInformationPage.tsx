import {
  useState,
  type ChangeEvent,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";
import {
  transportRequestDetails,
} from "../../../data/transportRequestDetailMockData";
import {
  horses,
} from "../../../data/horseMockData";

import {
  getRequestById,
  updateRequestStatus,
} from "../../../data/transportRequestStorage";

import PickupDeliveryStep from "./components/PickupDeliveryStep";
import HorseInformationStep from "./components/HorseInformationStep";
import DocumentsStep from "./components/DocumentsStep";
import ReviewConfirmStep from "./components/ReviewConfirmStep";

import {
  initialTransportInformationDraft,
  transportInformationSteps,
} from "./data/transportInformationMockData";

import type {
  LocationInformation,
  TransportDocument,
  TransportInformationDraft,
} from "./types/transportInformationTypes";

import "./TransportInformationPage.css";

const STORAGE_PREFIX =
  "transport_info_";

function TransportInformationPage() {
  const navigate = useNavigate();

  const { requestId } =
    useParams();

  const storedRequest = requestId
    ? getRequestById(requestId)
    : undefined;

  const detailRequest = requestId
    ? transportRequestDetails.find(
      (item) => item.id === requestId
    )
    : undefined;

  const request = storedRequest ?? detailRequest;

  const storageKey =
    `${STORAGE_PREFIX}${requestId}`;

  const [currentStep, setCurrentStep] =
    useState(1);

  const [error, setError] =
    useState("");

  const [draft, setDraft] =
    useState<TransportInformationDraft>(
      () => {
        const saved =
          localStorage.getItem(
            storageKey
          );

        if (saved) {
          try {
            return JSON.parse(
              saved
            ) as TransportInformationDraft;
          } catch {
            return structuredClone(
              initialTransportInformationDraft
            );
          }
        }

        return structuredClone(
          initialTransportInformationDraft
        );
      }
    );

  if (!requestId || !request) {
    return (
      <CustomerLayout pageTitle="Transport Information">
        <div className="transport-info-error-message">
          Transport request not found.
        </div>
      </CustomerLayout>
    );
  }

  const saveDraft = (
    newDraft: TransportInformationDraft
  ) => {
    setDraft(newDraft);

    localStorage.setItem(
      storageKey,
      JSON.stringify(newDraft)
    );
  };

  const updateLocation = (
    type: "pickup" | "delivery",
    field: keyof LocationInformation,
    value: string
  ) => {
    saveDraft({
      ...draft,

      [type]: {
        ...draft[type],
        [field]: value,
      },
    });
  };

  const isLocationValid = (
    location: LocationInformation
  ) => {
    return (
      location.name.trim() !== "" &&
      location.contactPerson.trim() !== "" &&
      location.address.trim() !== "" &&
      location.phone.trim() !== ""
    );
  };

  const handleStep1Continue =
    () => {
      if (
        !isLocationValid(
          draft.pickup
        ) ||
        !isLocationValid(
          draft.delivery
        )
      ) {
        setError(
          "Please complete all required pickup and delivery fields."
        );

        return;
      }

      setError("");

      setCurrentStep(2);
    };

  const toggleHorse = (
    horseId: string
  ) => {
    const alreadySelected =
      draft.selectedHorses.some(
        (horse) =>
          horse.horseId ===
          horseId
      );

    if (alreadySelected) {
      saveDraft({
        ...draft,

        selectedHorses:
          draft.selectedHorses.filter(
            (horse) =>
              horse.horseId !==
              horseId
          ),
      });

      return;
    }

    if (
      draft.selectedHorses.length >=
      request.horseCount
    ) {
      setError(
        `This request only allows ${request.horseCount} horse${request.horseCount > 1
          ? "s"
          : ""
        }.`
      );

      return;
    }

    setError("");

    saveDraft({
      ...draft,

      selectedHorses: [
        ...draft.selectedHorses,

        {
          horseId,
          careNotes: "",
        },
      ],
    });
  };

  const updateCareNotes = (
    horseId: string,
    value: string
  ) => {
    saveDraft({
      ...draft,

      selectedHorses:
        draft.selectedHorses.map(
          (horse) =>
            horse.horseId ===
              horseId
              ? {
                ...horse,
                careNotes: value,
              }
              : horse
        ),
    });
  };

  const createDocuments =
    (): TransportDocument[] => {
      const documents: TransportDocument[] =
        [];

      draft.selectedHorses.forEach(
        (selected) => {
          const horse =
            horses.find(
              (item) =>
                item.id ===
                selected.horseId
            );

          if (!horse) {
            return;
          }

          const oldHealthDocument =
            draft.documents.find(
              (document) =>
                document.id ===
                `${horse.id}-health`
            );

          documents.push(
            {
              id: `${horse.id}-passport`,

              horseId: horse.id,

              name:
                "Equine Passport",

              status:
                horse.passportStatus ===
                  "Valid" ||
                  horse.passportStatus ===
                  "Expiring Soon"
                  ? "Valid"
                  : "Missing",

              source:
                "Horse Profile",

              requiredByCustomer:
                true,
            },

            {
              id: `${horse.id}-ownership`,

              horseId: horse.id,

              name:
                "Certificate of Ownership",

              status:
                horse.profileStatus ===
                  "Complete"
                  ? "Valid"
                  : "Missing",

              source:
                "Horse Profile",

              requiredByCustomer:
                true,
            },

            {
              id: `${horse.id}-vaccination`,

              horseId: horse.id,

              name:
                "Equine Influenza Vaccination Record",

              status:
                horse.medicalStatus ===
                  "Complete"
                  ? "Valid"
                  : "Missing",

              source:
                "Horse Profile",

              requiredByCustomer:
                true,
            },

            {
              id: `${horse.id}-health`,

              horseId: horse.id,

              name:
                "Health Certificate",

              status:
                oldHealthDocument
                  ?.status ??
                "Missing",

              fileName:
                oldHealthDocument
                  ?.fileName,

              source: "Trip",

              requiredByCustomer:
                true,
            }
          );
        }
      );

      documents.push({
        id: "transport-permit",

        name:
          "Domestic Transport Permit",

        status: "Processing",

        source:
          "CBN Transport",

        requiredByCustomer: false,
      });

      return documents;
    };

  const handleHorseContinue =
    () => {
      if (
        draft.selectedHorses.length !==
        request.horseCount
      ) {
        setError(
          `Please select exactly ${request.horseCount} horse${request.horseCount > 1
            ? "s"
            : ""
          }.`
        );

        return;
      }

      setError("");

      const newDraft: TransportInformationDraft =
      {
        ...draft,

        documents:
          createDocuments(),
      };

      saveDraft(newDraft);

      setCurrentStep(3);
    };

  const handleUpload = (
    documentId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    saveDraft({
      ...draft,

      documents:
        draft.documents.map(
          (document) =>
            document.id ===
              documentId
              ? {
                ...document,

                status:
                  "Uploaded",

                fileName:
                  file.name,
              }
              : document
        ),
    });
  };

  const handleConfirm = () => {
    const missingDocuments =
      draft.documents.filter(
        (document) =>
          document.requiredByCustomer &&
          document.status ===
          "Missing"
      );

    if (
      !draft.confirmed ||
      missingDocuments.length > 0
    ) {
      return;
    }

    updateRequestStatus(
      requestId,
      "Information Submitted"
    );

    navigate(
      `/customer/requests/${requestId}/information/success`
    );
  };

  return (
    <CustomerLayout pageTitle="Transport Information">
      <div className="transport-info-page">
        <button
          type="button"
          className="transport-info-back-link"
          onClick={() =>
            navigate(
              `/customer/requests/${requestId}`
            )
          }
        >
          ← Back to {requestId}
        </button>

        <div className="transport-info-header">
          <h1>
            Transport Information
          </h1>

          <p>
            {request.id}
            {" • "}
            {request.origin}
            {" → "}
            {request.destination}
            {" • "}
            {request.horseCount}{" "}
            {request.horseCount ===
              1
              ? "horse"
              : "horses"}
          </p>
        </div>

        <div className="transport-stepper">
          {transportInformationSteps.map(
            (label, index) => {
              const number =
                index + 1;

              const completed =
                number <
                currentStep;

              const active =
                number ===
                currentStep;

              return (
                <div
                  key={label}
                  className={`transport-step ${completed
                      ? "completed"
                      : ""
                    } ${active
                      ? "active"
                      : ""
                    }`}
                >
                  <div className="transport-step-top">
                    <div className="transport-step-circle">
                      {completed
                        ? "✓"
                        : number}
                    </div>

                    {number <
                      transportInformationSteps.length && (
                        <div className="transport-step-line" />
                      )}
                  </div>

                  <span>
                    {label}
                  </span>
                </div>
              );
            }
          )}
        </div>

        {currentStep === 1 && (
          <PickupDeliveryStep
            origin={request.origin}
            destination={
              request.destination
            }
            pickup={draft.pickup}
            delivery={
              draft.delivery
            }
            error={error}
            onChange={
              updateLocation
            }
            onBack={() =>
              navigate(
                `/customer/requests/${requestId}`
              )
            }
            onContinue={
              handleStep1Continue
            }
          />
        )}

        {currentStep === 2 && (
          <HorseInformationStep
            horses={horses}
            requiredHorseCount={
              request.horseCount
            }
            selectedHorses={
              draft.selectedHorses
            }
            error={error}
            onToggleHorse={
              toggleHorse
            }
            onUpdateCareNotes={
              updateCareNotes
            }
            onBack={() => {
              setError("");
              setCurrentStep(1);
            }}
            onContinue={
              handleHorseContinue
            }
          />
        )}

        {currentStep === 3 && (
          <DocumentsStep
            horses={horses}
            selectedHorses={
              draft.selectedHorses
            }
            documents={
              draft.documents
            }
            onUpload={
              handleUpload
            }
            onBack={() =>
              setCurrentStep(2)
            }
            onContinue={() =>
              setCurrentStep(4)
            }
          />
        )}

        {currentStep === 4 && (
          <ReviewConfirmStep
            request={{
              id: request.id,
              origin:
                request.origin,
              destination:
                request.destination,
              preferredDate:
                request.preferredDate,
              horseCount:
                request.horseCount,
            }}
            horses={horses}
            draft={draft}
            onEditStep={(
              step
            ) => {
              setError("");

              setCurrentStep(
                step
              );
            }}
            onConfirmedChange={(
              checked
            ) =>
              saveDraft({
                ...draft,

                confirmed:
                  checked,
              })
            }
            onBack={() =>
              setCurrentStep(3)
            }
            onConfirm={
              handleConfirm
            }
          />
        )}
      </div>
    </CustomerLayout>
  );
}

export default TransportInformationPage;