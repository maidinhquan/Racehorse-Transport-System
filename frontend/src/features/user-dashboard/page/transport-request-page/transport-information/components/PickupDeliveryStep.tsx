import type {
  LocationInformation,
} from "../types/transportInformationTypes";

interface PickupDeliveryStepProps {
  origin: string;
  destination: string;

  pickup: LocationInformation;
  delivery: LocationInformation;

  error: string;

  onChange: (
    type: "pickup" | "delivery",
    field: keyof LocationInformation,
    value: string
  ) => void;

  onBack: () => void;
  onContinue: () => void;
}

function PickupDeliveryStep({
  origin,
  destination,
  pickup,
  delivery,
  error,
  onChange,
  onBack,
  onContinue,
}: PickupDeliveryStepProps) {
  const renderLocationForm = (
    type: "pickup" | "delivery",
    data: LocationInformation
  ) => {
    const isPickup = type === "pickup";

    return (
      <section className="transport-info-card">
        <h2>
          {isPickup
            ? `Pickup Information — ${origin}`
            : `Delivery Information — ${destination}`}
        </h2>

        <div className="transport-info-form-grid">
          <div className="transport-info-field">
            <label>
              {isPickup
                ? "Stable / Club Name"
                : "Destination Stable / Racecourse Name"}{" "}
              *
            </label>

            <input
              value={data.name}
              onChange={(event) =>
                onChange(
                  type,
                  "name",
                  event.target.value
                )
              }
            />
          </div>

          <div className="transport-info-field">
            <label>
              Contact Person *
            </label>

            <input
              value={data.contactPerson}
              onChange={(event) =>
                onChange(
                  type,
                  "contactPerson",
                  event.target.value
                )
              }
            />
          </div>

          <div className="transport-info-field full">
            <label>
              {isPickup
                ? "Full Pickup Address"
                : "Full Delivery Address"}{" "}
              *
            </label>

            <input
              value={data.address}
              onChange={(event) =>
                onChange(
                  type,
                  "address",
                  event.target.value
                )
              }
            />
          </div>

          <div className="transport-info-field">
            <label>
              Postal Code
            </label>

            <input
              value={data.postalCode}
              onChange={(event) =>
                onChange(
                  type,
                  "postalCode",
                  event.target.value
                )
              }
            />
          </div>

          <div className="transport-info-field">
            <label>
              Phone Number *
            </label>

            <input
              value={data.phone}
              onChange={(event) =>
                onChange(
                  type,
                  "phone",
                  event.target.value
                )
              }
            />
          </div>

          <div className="transport-info-field full">
            <label>
              {isPickup
                ? "Pickup Notes"
                : "Delivery Notes"}
            </label>

            <textarea
              placeholder="Access instructions, opening hours, etc."
              value={data.notes}
              onChange={(event) =>
                onChange(
                  type,
                  "notes",
                  event.target.value
                )
              }
            />
          </div>
        </div>
      </section>
    );
  };

  return (
    <>
      {error && (
        <div className="transport-info-error-message">
          {error}
        </div>
      )}

      {renderLocationForm(
        "pickup",
        pickup
      )}

      {renderLocationForm(
        "delivery",
        delivery
      )}

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
          onClick={onContinue}
        >
          Save & Continue
        </button>
      </div>
    </>
  );
}

export default PickupDeliveryStep;