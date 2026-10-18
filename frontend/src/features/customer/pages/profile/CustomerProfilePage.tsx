import { useState } from "react";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import "./CustomerProfilePage.css";

function CustomerProfilePage() {
  const [isEditing, setIsEditing] =
    useState(false);

  const [profile, setProfile] =
    useState({
      fullName: "Alex Equine",

      email:
        "alex.equine@example.com",

      phone:
        "+84 912 345 678",

      organization:
        "Alex Equine Club",

      address:
        "Ho Chi Minh City, Vietnam",
    });

  const [draft, setDraft] =
    useState(profile);

  const handleEdit = () => {
    setDraft(profile);

    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(profile);

    setIsEditing(false);
  };

  const handleSave = () => {
    /*
      Demo frontend:
      lưu trực tiếp vào state.

      Sau này:
      PUT /api/customers/profile
    */

    setProfile(draft);

    setIsEditing(false);
  };

  return (
    <CustomerLayout pageTitle="Personal Information">
      <div className="customer-profile-page">
        <div className="profile-page-header">
          <div>
            <h1>
              Personal Information
            </h1>

            <p>
              View and manage your account information.
            </p>
          </div>

          {!isEditing && (
            <button
              type="button"
              className="profile-edit-button"
              onClick={handleEdit}
            >
              Edit Information
            </button>
          )}
        </div>

        <section className="profile-card">
          <div className="profile-card-header">
            <div className="profile-large-avatar">
              AE
            </div>

            <div>
              <h2>
                {profile.fullName}
              </h2>

              <p>
                Customer
              </p>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-form-grid">
            <div className="profile-field">
              <label>
                Full Name
              </label>

              {isEditing ? (
                <input
                  value={
                    draft.fullName
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      fullName:
                        event.target
                          .value,
                    })
                  }
                />
              ) : (
                <strong>
                  {
                    profile.fullName
                  }
                </strong>
              )}
            </div>

            <div className="profile-field">
              <label>
                Email Address
              </label>

              <strong>
                {profile.email}
              </strong>

              <small>
                Email cannot be changed here.
              </small>
            </div>

            <div className="profile-field">
              <label>
                Phone Number
              </label>

              {isEditing ? (
                <input
                  value={
                    draft.phone
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      phone:
                        event.target
                          .value,
                    })
                  }
                />
              ) : (
                <strong>
                  {profile.phone}
                </strong>
              )}
            </div>

            <div className="profile-field">
              <label>
                Organization / Club
              </label>

              {isEditing ? (
                <input
                  value={
                    draft.organization
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      organization:
                        event.target
                          .value,
                    })
                  }
                />
              ) : (
                <strong>
                  {
                    profile.organization
                  }
                </strong>
              )}
            </div>

            <div className="profile-field full">
              <label>
                Address
              </label>

              {isEditing ? (
                <input
                  value={
                    draft.address
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      address:
                        event.target
                          .value,
                    })
                  }
                />
              ) : (
                <strong>
                  {
                    profile.address
                  }
                </strong>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="profile-actions">
              <button
                type="button"
                className="profile-cancel-button"
                onClick={
                  handleCancel
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="profile-save-button"
                onClick={
                  handleSave
                }
              >
                Save Changes
              </button>
            </div>
          )}
        </section>

        <section className="profile-card account-security-card">
          <div>
            <h2>
              Account Security
            </h2>

            <p>
              Manage your password and account security.
            </p>
          </div>

          <button
            type="button"
            className="change-password-button"
          >
            Change Password
          </button>
        </section>
      </div>
    </CustomerLayout>
  );
}

export default CustomerProfilePage;