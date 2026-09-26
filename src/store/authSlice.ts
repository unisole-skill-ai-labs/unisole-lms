import { createSlice } from "@reduxjs/toolkit";

const TOKEN_KEY = "unisole-app:token";
const REFRESH_TOKEN_KEY = "unisole-app:refreshToken";
const USER_KEY = "unisole-app:user";

const decodeJwt = (token: string | null) => {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
    const token = localStorage.getItem(TOKEN_KEY);
    return decodeJwt(token);
  } catch {
    return null;
  }
};

const initialState = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || null,
  user: getInitialUser(),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { token, accessToken, refreshToken, user } = action.payload;
      const effectiveToken = accessToken || token;

      if (effectiveToken) {
        state.token = effectiveToken;
        localStorage.setItem(TOKEN_KEY, effectiveToken);
      }
      if (refreshToken) {
        state.refreshToken = refreshToken;
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }

      const decodedUser = effectiveToken ? decodeJwt(effectiveToken) : null;
      const resolvedUser = user || decodedUser;
      if (resolvedUser) {
        state.user = { ...(state.user || {}), ...resolvedUser };
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      }
      state.isAuthenticated = true;
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    },
    logout(state) {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
