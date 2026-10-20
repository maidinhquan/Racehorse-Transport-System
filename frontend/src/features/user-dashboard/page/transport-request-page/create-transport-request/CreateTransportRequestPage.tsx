import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createRequest,
} from "../../../data/transportRequestStorage"; //test
import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import "./CreateTransportRequestPage.css";

interface TripForm {
  origin: string;
  destination: string;
  preferredDate: string;
  horseCount: number;
}

const cities = [
  "Ho Chi Minh City",
  "Hanoi",
  "Da Nang",
  "Bangkok",
  "Singapore",
  "Kuala Lumpur",
  "Phnom Penh",
  "Sydney",
];

function calculateEstimatedPrice(
  origin: string,
  destination: string,
  horseCount: number
) {
  if (!origin || !destination || origin === destination) {
    return 0;
  }

  const basePrice = 1800;
  const horsePrice = 650;

  return basePrice + horseCount * horsePrice;
}

function CreateTransportRequestPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<TripForm>({
    origin: "",
    destination: "",
    preferredDate: "",
    horseCount: 1,
  });

  const [error, setError] = useState("");

  const estimatedPrice = useMemo(() => {
    return calculateEstimatedPrice(
      form.origin,
      form.destination,
      form.horseCount
    );
  }, [
    form.origin,
    form.destination,
    form.horseCount,
  ]);

  const isValid =
    form.origin !== "" &&
    form.destination !== "" &&
    form.origin !== form.destination &&
    form.preferredDate !== "" &&
    form.horseCount > 0;

  // const handleSubmit = () => {
  //   if (!isValid) {
  //     setError(
  //       "Please complete all required trip information before submitting."
  //     );

  //     return;
  //   }

  //   setError("");

  //   /*
  //     Hiện tại đang demo frontend.

  //     Sau này khi có backend:
  //     POST /api/transport-requests

  //     {
  //       origin,
  //       destination,
  //       preferredDate,
  //       horseCount
  //     }
  //   */

  //   navigate("/customer/requests");
  // };
  const handleSubmit = () => {
    if (!isValid) {
      setError(
        "Please complete all required trip information before submitting."
      );

      return;
    }

    const newRequest = createRequest({
      origin: form.origin,

      destination:
        form.destination,

      preferredDate:
        form.preferredDate,

      horseCount:
        form.horseCount,

      estimatedPrice,
    });

    navigate(
      `/customer/requests/${newRequest.id}`
    );
  };

  
  return (
    <CustomerLayout pageTitle="Create Transport Request">
      <div className="create-request-page">
        {/* Header */}
        <div className="create-request-header">
          <button
            type="button"
            className="create-request-back"
            onClick={() =>
              navigate("/customer/requests")
            }
          >
            ← Back to Transport Requests
          </button>

          <h1>Create Transport Request</h1>

          <p>
            Provide your initial trip information.
            Detailed transport information will be
            collected after your request is accepted.
          </p>
        </div>

        {/* Information note */}
        <div className="create-request-note">
          <div className="create-request-note-icon">
            i
          </div>

          <div>
            <strong>
              Initial request
            </strong>

            <p>
              You only need to provide the basic trip
              information at this stage. A CBN Transport
              manager will review your request before the
              next steps become available.
            </p>
          </div>
        </div>

        {/* Form */}
        <section className="create-request-card">
          <div className="create-request-card-header">
            <div>
              <h2>Trip Information</h2>

              <p>
                Enter the origin, destination and preferred
                transport schedule.
              </p>
            </div>

            <span className="required-text">
              * Required fields
            </span>
          </div>

          <div className="create-request-form-grid">
            {/* Origin */}
            <div className="create-request-field">
              <label htmlFor="origin">
                Origin *
              </label>

              <select
                id="origin"
                value={form.origin}
                onChange={(event) =>
                  setForm({
                    ...form,
                    origin:
                      event.target.value,
                  })
                }
              >
                <option value="">
                  Select origin
                </option>

                {cities.map((city) => (
                  <option
                    key={city}
                    value={city}
                  >
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination */}
            <div className="create-request-field">
              <label htmlFor="destination">
                Destination *
              </label>

              <select
                id="destination"
                value={form.destination}
                onChange={(event) =>
                  setForm({
                    ...form,
                    destination:
                      event.target.value,
                  })
                }
              >
                <option value="">
                  Select destination
                </option>

                {cities.map((city) => (
                  <option
                    key={city}
                    value={city}
                  >
                    {city}
                  </option>
                ))}
              </select>

              {form.origin &&
                form.destination &&
                form.origin ===
                form.destination && (
                  <span className="field-error">
                    Origin and destination cannot be the
                    same.
                  </span>
                )}
            </div>

            {/* Preferred date */}
            <div className="create-request-field">
              <label htmlFor="preferredDate">
                Preferred Transport Date *
              </label>

              <input
                id="preferredDate"
                type="date"
                value={form.preferredDate}
                onChange={(event) =>
                  setForm({
                    ...form,
                    preferredDate:
                      event.target.value,
                  })
                }
              />
            </div>

            {/* Horse count */}
            <div className="create-request-field">
              <label htmlFor="horseCount">
                Number of Horses *
              </label>

              <select
                id="horseCount"
                value={form.horseCount}
                onChange={(event) =>
                  setForm({
                    ...form,
                    horseCount: Number(
                      event.target.value
                    ),
                  })
                }
              >
                {[1, 2, 3, 4, 5, 6].map(
                  (number) => (
                    <option
                      key={number}
                      value={number}
                    >
                      {number}{" "}
                      {number === 1
                        ? "Horse"
                        : "Horses"}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Quote */}
          {estimatedPrice > 0 && (
            <div className="quotation-preview">
              <div className="quotation-header">
                <div>
                  <span className="quotation-eyebrow">
                    Estimated Quotation
                  </span>

                  <h3>
                    {form.origin}
                    <span> → </span>
                    {form.destination}
                  </h3>
                </div>

                <span className="quotation-badge">
                  Estimate
                </span>
              </div>

              <div className="quotation-info">
                <div>
                  <span>
                    Number of Horses
                  </span>

                  <strong>
                    {form.horseCount}
                  </strong>
                </div>

                <div>
                  <span>
                    Preferred Date
                  </span>

                  <strong>
                    {form.preferredDate ||
                      "Not selected"}
                  </strong>
                </div>
              </div>

              <div className="quotation-total">
                <div>
                  <span>
                    Estimated Transport Cost
                  </span>

                  <small>
                    Final price may change after review.
                  </small>
                </div>

                <strong>
                  $
                  {estimatedPrice.toLocaleString(
                    "en-US"
                  )}{" "}
                  USD
                </strong>
              </div>
            </div>
          )}

          {error && (
            <div className="create-request-error">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="create-request-actions">
            <button
              type="button"
              className="cancel-request-button"
              onClick={() =>
                navigate(
                  "/customer/requests"
                )
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="submit-request-button"
              disabled={!isValid}
              onClick={handleSubmit}
            >
              Submit Request for Review
            </button>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}

export default CreateTransportRequestPage;