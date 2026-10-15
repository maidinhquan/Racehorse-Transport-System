import type {
  ChangeEvent,
} from "react";

import type { Horse } from "../../../../data/horseMockData";

import type {
  SelectedHorse,
  TransportDocument,
} from "../types/transportInformationTypes";

import { JapanRouteModule } from "../../../../../documents/japan-route/JapanRouteModule";

interface DocumentsStepProps {
  horses: Horse[];

  selectedHorses: SelectedHorse[];

  documents: TransportDocument[];

  onUpload: (
    documentId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => void;

  onBack: () => void;
  onContinue: () => void;
  isJapanRoute?: boolean;
}

function DocumentsStep({
  horses,
  selectedHorses,
  documents,
  onUpload,
  onBack,
  onContinue,
  isJapanRoute = false,
}: DocumentsStepProps) {
  const customerDocuments =
    documents.filter(
      (document) =>
        document.requiredByCustomer
    );

  const cbnDocuments =
    documents.filter(
      (document) =>
        !document.requiredByCustomer
    );

  const missingDocuments =
    customerDocuments.filter(
      (document) =>
        document.status ===
        "Missing"
    );

  return (
    <section className="transport-info-card">
      <h2>
        Document Checklist
      </h2>

      <p className="transport-info-description">
        Valid documents from your horse profiles are reused
        automatically. Trip-specific documents must be uploaded
        where required.
      </p>

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

          const horseDocuments =
            customerDocuments.filter(
              (document) =>
                document.horseId ===
                horse.id
            );

          return (
            <div
              key={horse.id}
              className="horse-document-section"
            >
              <h3>
                {horse.name}
              </h3>

              {horseDocuments.map(
                (document) => (
                  <div
                    key={
                      document.id
                    }
                    className={`document-checklist-item ${
                      document.status ===
                      "Missing"
                        ? "missing"
                        : ""
                    }`}
                  >
                    <div>
                      <strong>
                        {
                          document.name
                        }
                      </strong>

                      <span>
                        {document.source ===
                        "Horse Profile"
                          ? "Reused from horse profile"
                          : document.fileName
                            ? `Uploaded • ${document.fileName}`
                            : "Required for this trip."}
                      </span>
                    </div>

                    <div className="document-checklist-actions">
                      <span
                        className={`document-badge document-${document.status.toLowerCase()}`}
                      >
                        {
                          document.status
                        }
                      </span>

                      {document.source ===
                        "Trip" &&
                        document.status ===
                          "Missing" && (
                          <label className="document-upload-button">
                            Upload Document

                            <input
                              type="file"
                              hidden
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(
                                event
                              ) =>
                                onUpload(
                                  document.id,
                                  event
                                )
                              }
                            />
                          </label>
                        )}
                    </div>
                  </div>
                )
              )}
            </div>
          );
        }
      )}

      <div className="cbn-document-section">
        <h3>
          Handled by CBN Transport
        </h3>

        <p>
          Our staff arrange these for your route. No action is needed.
        </p>

        {cbnDocuments.map(
          (document) => (
            <div
              key={document.id}
              className="document-checklist-item"
            >
              <strong>
                {document.name}
              </strong>

              <span className="document-badge document-processing">
                {document.status}
              </span>
            </div>
          )
        )}
      </div>

      {missingDocuments.length >
        0 && (
        <div className="transport-document-warning">
          {missingDocuments.length} required document
          {missingDocuments.length > 1
            ? "s"
            : ""}{" "}
          still need your action. You can continue to review,
          but confirmation will remain disabled.
        </div>
      )}

      {/* Phân hệ Đặc thù Tuyến Việt Nam -> Nhật Bản */}
      {isJapanRoute && (
        <div style={{ marginTop: "32px", borderTop: "2px dashed #e2e8f0", paddingTop: "24px" }}>
          <JapanRouteModule />
        </div>
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
    </section>
  );
}

export default DocumentsStep;