import type { Horse } from "../../../../data/horseMockData";

import type {
  SelectedHorse,
} from "../types/transportInformationTypes";

interface HorseInformationStepProps {
  horses: Horse[];

  requiredHorseCount: number;

  selectedHorses: SelectedHorse[];

  error: string;

  onToggleHorse: (
    horseId: string
  ) => void;

  onUpdateCareNotes: (
    horseId: string,
    value: string
  ) => void;

  onBack: () => void;
  onContinue: () => void;
}

function HorseInformationStep({
  horses,
  requiredHorseCount,
  selectedHorses,
  error,
  onToggleHorse,
  onUpdateCareNotes,
  onBack,
  onContinue,
}: HorseInformationStepProps) {
  return (
    <section className="transport-info-card">
      <div className="transport-info-section-header">
        <div>
          <h2>Horse Information</h2>

          <p>
            Select exactly {requiredHorseCount} horse
            {requiredHorseCount > 1 ? "s" : ""} for this
            transport.
          </p>
        </div>

        <span>
          {selectedHorses.length} of {requiredHorseCount} completed
        </span>
      </div>

      {error && (
        <div className="transport-info-error-message horse-error">
          {error}
        </div>
      )}

      <div className="horse-selection-tabs">
        <button
          type="button"
          className="active"
        >
          Select Existing Horse
        </button>

        <button
          type="button"
          onClick={() =>
            alert(
              "Add New Horse will be connected later."
            )
          }
        >
          Add New Horse
        </button>
      </div>

      <div className="transport-horse-list">
        {horses.map((horse) => {
          const selected =
            selectedHorses.some(
              (item) =>
                item.horseId === horse.id
            );

          return (
            <div
              key={horse.id}
              className={`transport-horse-option ${
                selected
                  ? "selected"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() =>
                  onToggleHorse(
                    horse.id
                  )
                }
              />

              <div className="transport-horse-photo">
                Horse
              </div>

              <div className="transport-horse-main">
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
          );
        })}
      </div>

      {selectedHorses.map(
        (selected) => {
          const horse =
            horses.find(
              (item) =>
                item.id ===
                selected.horseId
            );

          if (!horse) {
            return null;
          }

          return (
            <div
              key={horse.id}
              className="reused-horse-information"
            >
              <span className="transport-info-eyebrow">
                Reused from My Horses
              </span>

              <div className="reused-horse-grid">
                <div>
                  <span>
                    Registered Name
                  </span>

                  <strong>
                    {horse.name}
                  </strong>
                </div>

                <div>
                  <span>
                    Microchip Number
                  </span>

                  <strong>
                    {horse.microchip ||
                      "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>
                    Passport
                  </span>

                  <strong>
                    {
                      horse.passportStatus
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Medical
                  </span>

                  <strong>
                    {
                      horse.medicalStatus
                    }
                  </strong>
                </div>
              </div>

              <div className="transport-info-field care-notes">
                <label>
                  Care notes for this transport (Optional)
                </label>

                <textarea
                  placeholder="Feeding schedule, travel companions, handling notes..."
                  value={
                    selected.careNotes
                  }
                  onChange={(event) =>
                    onUpdateCareNotes(
                      horse.id,
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          );
        }
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
          Save & Continue to Documents
        </button>
      </div>
    </section>
  );
}

export default HorseInformationStep;