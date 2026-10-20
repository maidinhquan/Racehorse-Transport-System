import type { Horse } from "../../../../data/horseMockData";

import type {
  TransportInformationDraft,
} from "../types/transportInformationTypes";

interface ReviewConfirmStepProps {
  request: {
    id: string;
    origin: string;
    destination: string;
    preferredDate: string;
    horseCount: number;
  };

  horses: Horse[];

  draft: TransportInformationDraft;

  onConfirmedChange: (
    checked: boolean
  ) => void;

  onEditStep: (
    step: number
  ) => void;

  onBack: () => void;

  onConfirm: () => void;
}

function ReviewConfirmStep({
  request,
  horses,
  draft,
  onConfirmedChange,
  onEditStep,
  onBack,
  onConfirm,
}: ReviewConfirmStepProps) {
  const selectedHorseObjects =
    draft.selectedHorses
      .map((selected) =>
        horses.find(
          (horse) =>
            horse.id ===
            selected.horseId
        )
      )
      .filter(Boolean);

  const customerDocuments =
    draft.documents.filter(
      (document) =>
        document.requiredByCustomer
    );

  const missingDocuments =
    customerDocuments.filter(
      (document) =>
        document.status ===
        "Missing"
    );

  const readyDocuments =
    customerDocuments.filter(
      (document) =>
        document.status ===
          "Valid" ||
        document.status ===
          "Uploaded"
    );

  const cbnDocuments =
    draft.documents.filter(
      (document) =>
        !document.requiredByCustomer
    );

  const canConfirm =
    draft.confirmed &&
    missingDocuments.length === 0;

  return (
    <div className="review-container">
      <section className="transport-info-card">
        <h2>
          Initial Request
        </h2>

        <div className="review-grid three">
          <div>
            <span>Route</span>

            <strong>
              {request.origin} → {request.destination}
            </strong>
          </div>

          <div>
            <span>
              Preferred Transport Date
            </span>

            <strong>
              {request.preferredDate}
            </strong>
          </div>

          <div>
            <span>
              Number of Horses
            </span>

            <strong>
              {request.horseCount}
            </strong>
          </div>
        </div>
      </section>

      <section className="transport-info-card">
        <div className="review-title">
          <h2>
            Pickup & Delivery
          </h2>

          <button
            type="button"
            onClick={() =>
              onEditStep(1)
            }
          >
            Edit
          </button>
        </div>

        <div className="review-grid">
          <div>
            <span>
              PICKUP
            </span>

            <strong>
              {draft.pickup.name}
            </strong>

            <p>
              {draft.pickup.address}
            </p>

            <p>
              {draft.pickup.contactPerson}
              {" • "}
              {draft.pickup.phone}
            </p>

            {draft.pickup.notes && (
              <p>
                Notes: {draft.pickup.notes}
              </p>
            )}
          </div>

          <div>
            <span>
              DELIVERY
            </span>

            <strong>
              {draft.delivery.name}
            </strong>

            <p>
              {draft.delivery.address}
            </p>

            <p>
              {draft.delivery.contactPerson}
              {" • "}
              {draft.delivery.phone}
            </p>

            {draft.delivery.notes && (
              <p>
                Notes: {draft.delivery.notes}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="transport-info-card">
        <div className="review-title">
          <h2>
            Horse Information
          </h2>

          <button
            type="button"
            onClick={() =>
              onEditStep(2)
            }
          >
            Edit
          </button>
        </div>

        {selectedHorseObjects.map(
          (horse) =>
            horse && (
              <div
                key={horse.id}
                className="review-horse"
              >
                <div>
                  <strong>
                    {horse.name}
                  </strong>

                  <span>
                    {horse.breed}
                    {" • "}
                    {horse.sex}
                    {" • "}
                    {horse.age} Years
                  </span>
                </div>

                <span
                  className={`horse-profile-badge horse-profile-${horse.profileStatus
                    .toLowerCase()
                    .replaceAll(
                      " ",
                      "-"
                    )}`}
                >
                  {
                    horse.profileStatus
                  }
                </span>
              </div>
            )
        )}
      </section>

      <section className="transport-info-card">
        <div className="review-title">
          <h2>
            Documents
          </h2>

          <button
            type="button"
            onClick={() =>
              onEditStep(3)
            }
          >
            Edit
          </button>
        </div>

        <div className="review-grid three">
          <div>
            <span>
              Ready or in review
            </span>

            <strong>
              {readyDocuments.length}
            </strong>
          </div>

          <div>
            <span>
              Need your action
            </span>

            <strong>
              {missingDocuments.length ||
                "—"}
            </strong>
          </div>

          <div>
            <span>
              Handled by CBN Transport
            </span>

            <strong>
              {cbnDocuments.length}
            </strong>
          </div>
        </div>
      </section>

      {missingDocuments.length >
        0 && (
        <div className="transport-document-warning">
          {missingDocuments.length} required document
          {missingDocuments.length > 1
            ? "s"
            : ""}{" "}
          still need your action. Complete them before confirming.
        </div>
      )}

      <label className="transport-confirm-checkbox">
        <input
          type="checkbox"
          checked={draft.confirmed}
          onChange={(event) =>
            onConfirmedChange(
              event.target.checked
            )
          }
        />

        <span>
          I confirm that the information provided is accurate.
        </span>
      </label>

      <div className="transport-info-actions">
        <button
          type="button"
          className="transport-secondary-button"
          onClick={onBack}
        >
          Back
        </button>

        <button
          type="button"
          className="transport-primary-button"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          Confirm Information
        </button>
      </div>
    </div>
  );
}

export default ReviewConfirmStep;