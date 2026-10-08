import {
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
  horses,
  type Horse,
  type PassportStatus,
  type MedicalStatus,
} from "../../data/horseMockData";

import "./MyHorsesPage.css";

type HorseFilter =
  | "all"
  | "complete"
  | "missing";

function getPassportClass(
  status: PassportStatus
) {
  switch (status) {
    case "Valid":
      return "horse-status-text horse-status-green";

    case "Expiring Soon":
      return "horse-status-text horse-status-yellow";

    case "Expired":
    case "Missing":
      return "horse-status-text horse-status-red";

    default:
      return "horse-status-text";
  }
}

function getMedicalClass(
  status: MedicalStatus
) {
  switch (status) {
    case "Complete":
      return "horse-status-text horse-status-green";

    case "Action Needed":
    case "Missing":
      return "horse-status-text horse-status-red";

    default:
      return "horse-status-text";
  }
}

function hasMissingDocuments(
  horse: Horse
) {
  return (
    horse.profileStatus !== "Complete" ||
    horse.passportStatus === "Missing" ||
    horse.passportStatus === "Expired" ||
    horse.medicalStatus !== "Complete"
  );
}

function MyHorsesPage() {
  const navigate = useNavigate();

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<HorseFilter>("all");

  const filteredHorses = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return horses.filter((horse) => {
      const searchableText = [
        horse.name,
        horse.id,
        horse.breed,
        horse.microchip,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword === "" ||
        searchableText.includes(keyword);

      let matchesFilter = true;

      if (filter === "complete") {
        matchesFilter =
          horse.profileStatus === "Complete";
      }

      if (filter === "missing") {
        matchesFilter =
          hasMissingDocuments(horse);
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [search, filter]);

  return (
    <CustomerLayout pageTitle="My Horses">
      <div className="my-horses-page">
        {/* Header */}
        <div className="my-horses-header">
          <div>
            <h1>My Horses</h1>

            <p>
              View horses associated with your transport requests.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="horse-toolbar">
          <div className="horse-search">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-3.5-3.5" />
            </svg>

            <input
              type="text"
              placeholder="Search by name, ID, breed, or microchip..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </div>

          <div className="horse-filters">
            <button
              className={`horse-filter-button ${
                filter === "all"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("all")
              }
            >
              All Horses
            </button>

            <button
              className={`horse-filter-button ${
                filter === "complete"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("complete")
              }
            >
              Complete Profile
            </button>

            <button
              className={`horse-filter-button ${
                filter === "missing"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("missing")
              }
            >
              Missing Docs

              <span className="filter-red-dot" />
            </button>
          </div>
        </div>

        {/* Horse list */}
        {filteredHorses.length > 0 ? (
          <div className="horse-grid">
            {filteredHorses.map(
              (horse) => {
                const needsAttention =
                  hasMissingDocuments(
                    horse
                  );

                return (
                  <article
                    key={horse.id}
                    className="horse-card"
                  >
                    {/* Photo */}
                    <div className="horse-photo">
                      {horse.photo ? (
                        <img
                          src={horse.photo}
                          alt={horse.name}
                        />
                      ) : (
                        <span>
                          Horse Photo
                        </span>
                      )}

                      {needsAttention && (
                        <span className="horse-warning-badge">
                          Missing Docs
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="horse-card-body">
                      <div className="horse-card-title">
                        <span className="horse-name">
                          {horse.name}
                        </span>

                        <span className="horse-id">
                          ID: {horse.id}
                        </span>
                      </div>

                      <p className="horse-meta">
                        {horse.breed}
                        {" • "}
                        {horse.sex}
                        {" • "}
                        {horse.age} Years
                      </p>

                      <div className="horse-info-box">
                        <div className="horse-info-row">
                          <span>
                            Microchip
                          </span>

                          <strong>
                            {horse.microchip ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div className="horse-info-row">
                          <span>
                            Passport
                          </span>

                          <strong
                            className={getPassportClass(
                              horse.passportStatus
                            )}
                          >
                            {
                              horse.passportStatus
                            }
                          </strong>
                        </div>

                        <div className="horse-info-row">
                          <span>
                            Medical Record
                          </span>

                          <strong
                            className={getMedicalClass(
                              horse.medicalStatus
                            )}
                          >
                            {
                              horse.medicalStatus
                            }
                          </strong>
                        </div>

                        <div className="horse-usage">
                          <strong>
                            {horse.transportCount >
                            0
                              ? `Used in ${horse.transportCount} transport request${
                                  horse.transportCount >
                                  1
                                    ? "s"
                                    : ""
                                }`
                              : "Not used in a transport request yet"}
                          </strong>

                          {horse.lastRoute && (
                            <span>
                              Last:{" "}
                              {
                                horse.lastRoute
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="horse-actions">
                        <button
                          className="horse-primary-action"
                          onClick={() =>
                            navigate(
                              `/customer/horses/${horse.id}`
                            )
                          }
                        >
                          View Details
                        </button>

                        {needsAttention ? (
                          <button
                            className="horse-warning-action"
                            onClick={() =>
                              navigate(
                                `/customer/horses/${horse.id}/edit`
                              )
                            }
                          >
                            Complete Profile
                          </button>
                        ) : (
                          <button
                            className="horse-secondary-action"
                            onClick={() =>
                              navigate(
                                `/customer/horses/${horse.id}/edit`
                              )
                            }
                          >
                            Edit Info
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="horse-empty">
            No horses match your search.
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

export default MyHorsesPage;