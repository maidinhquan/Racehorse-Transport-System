import {
  useNavigate,
  useParams,
} from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
  horses,
} from "../../../data/horseMockData";

import type {
  TransportInformationDraft,
} from "./types/transportInformationTypes";

import "./TransportInformationPage.css";

const STORAGE_PREFIX =
  "transport_info_";

function TransportInformationSuccessPage() {
  const navigate = useNavigate();

  const { requestId } =
    useParams();

  if (!requestId) {
    return (
      <CustomerLayout pageTitle="Transport Information">
        <div className="transport-info-error-message">
          Invalid transport request.
        </div>
      </CustomerLayout>
    );
  }

  const saved =
    localStorage.getItem(
      `${STORAGE_PREFIX}${requestId}`
    );

  let draft:
    | TransportInformationDraft
    | undefined;

  if (saved) {
    try {
      draft =
        JSON.parse(
          saved
        ) as TransportInformationDraft;
    } catch {
      draft = undefined;
    }
  }

  const horseNames =
    draft?.selectedHorses
      .map((selected) => {
        return horses.find(
          (horse) =>
            horse.id ===
            selected.horseId
        )?.name;
      })
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <CustomerLayout pageTitle="Transport Information">
      <div className="transport-success-page">
        <section className="transport-success-card">
          <div className="transport-success-icon">
            ✓
          </div>

          <h1>
            Transport Information Submitted Successfully
          </h1>

          <p>
            CBN Transport will process your
            information and review your
            documents.
          </p>

          <div className="transport-success-info">
            <div>
              <span>
                Request ID
              </span>

              <strong>
                {requestId}
              </strong>
            </div>

            <div>
              <span>
                Current Status
              </span>

              <strong className="information-submitted-badge">
                Information Submitted
              </strong>
            </div>

            <div>
              <span>
                Horses
              </span>

              <strong>
                {horseNames}
              </strong>
            </div>
          </div>

          <div className="transport-success-actions">
            <button
              type="button"
              className="transport-secondary-button"
              onClick={() =>
                navigate(
                  "/customer/home"
                )
              }
            >
              Back to Home
            </button>

            <button
              type="button"
              className="transport-primary-button"
              onClick={() =>
                navigate(
                  `/customer/requests/${requestId}`
                )
              }
            >
              View Request
            </button>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}

export default TransportInformationSuccessPage;