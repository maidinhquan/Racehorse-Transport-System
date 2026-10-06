export interface GoogleLoginRequest {
  credential: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface GoogleLoginResponse {
  success: boolean;
  message: string;

  data: {
    accessToken: string;
    user: User;
  };
}