# Authentication API Contract

Base URL:

/api/auth

Content-Type:

application/json

---

## AUTH-01 Login

POST /api/auth/login

Request:

```json
{
  "email": "string",
  "password": "string"
}

Response 200:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": 1,
    "fullName": "Nguyen Van A",
    "email": "user@example.com",
    "role": "CUSTOMER",
    "accessToken": "jwt-token"
  }
}

Response 401:
{
  "success": false,
  "message": "Invalid email or password",
  "data": null
}

AUTH-02 Google Login
POST /api/auth/google-login
Request:
{
  "idToken": "string"
}

Success response uses the same data structure as Login.
AUTH-03 Register - Request OTP
POST /api/auth/register/request-otp
Request:
{
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "phoneNumber": "0901234567",
  "password": "Password123!"
}

Response 200:
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "registrationToken": "temporary-token",
    "expiresIn": 300
  }
}

AUTH-04 Register - Verify OTP
POST /api/auth/register/verify-otp
Request:
{
  "registrationToken": "temporary-token",
  "otp": "123456"
}

Response 200:
{
  "success": true,
  "message": "Registration completed successfully",
  "data": null
}

AUTH-05 Register - Resend OTP
POST /api/auth/register/resend-otp
Request:
{
  "registrationToken": "temporary-token"
}

Response 200:
{
  "success": true,
  "message": "OTP resent successfully",
  "data": {
    "expiresIn": 300
  }
}

AUTH-06 Forgot Password
POST /api/auth/forgot-password
Request:
{
  "email": "user@example.com"
}

Response 200:
{
  "success": true,
  "message": "If the email exists, password reset instructions have been sent.",
  "data": null
}

Backend sends a reset link containing a reset token.
AUTH-07 Reset Password
POST /api/auth/reset-password
Request:
{
  "resetToken": "string",
  "newPassword": "string",
  "confirmNewPassword": "string"
}

Response 200:
{
  "success": true,
  "message": "Password reset successfully",
  "data": null
}

AUTH-08 Change Password
POST /api/auth/change-password
Authorization:
Bearer accessToken
Request:
{
  "currentPassword": "string",
  "newPassword": "string",
  "confirmNewPassword": "string"
}

AUTH-09 Get Current User
GET /api/auth/me
Authorization:
Bearer accessToken
Response 200:
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "userId": 1,
    "fullName": "Nguyen Van A",
    "email": "user@example.com",
    "role": "CUSTOMER"
  }
}

User Roles
- CUSTOMER
- LOGISTICS_MANAGER
- TRANSPORT_SPECIALIST
- FLEET_ROUTE_COORDINATOR
- DRIVER_ESCORT
Common Error Response
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": {
    "fieldName": [
      "Error message"
    ]
  }
}

Common HTTP Status Codes
- 200 OK
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 409 Conflict
- 500 Internal Server Error

Đến đây phần nền Auth đã hoàn chỉnh theo kiến trúc:

```text
auth-api.md
     │
     ├───────────────┐
     ↓               ↓
Frontend           Backend
     ↓               ↓
auth.types.ts      DTO
     ↓               ↓
authApi.ts         Controller
     ↓               ↓
apiClient.ts       Service
     ↓               ↓
HTTP ─────────────→ API