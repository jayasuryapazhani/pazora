export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  user: {
    id: string;
    name: string;
  };
};

export type SessionResponse = {
  authenticated: true;
  user: {
    id: string;
    name: string;
  };
};

export type JellyfinStatusResponse = {
  online: boolean;
  serverName?: string;
  version?: string;
  productName?: string;
  error?: string;
};