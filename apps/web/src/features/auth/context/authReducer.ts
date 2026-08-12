import { AuthActionType, AuthStatus, type AuthAction, type AuthState } from "../types";

export const initialAuthState: AuthState = {
  user: null,
  accessToken: null,
  status: AuthStatus.IDLE,
};

export const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AuthActionType.AUTH_LOADING:
      return { ...state, status: AuthStatus.LOADING };

    case AuthActionType.AUTH_SUCCESS:
      return {
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        status: AuthStatus.AUTHENTICATED,
      };

    case AuthActionType.TOKEN_REFRESHED:
      return { ...state, accessToken: action.payload.accessToken };

    case AuthActionType.USER_UPDATED:
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.payload.user } };

    case AuthActionType.AUTH_LOGOUT:
      return { user: null, accessToken: null, status: AuthStatus.UNAUTHENTICATED };

    default:
      return state;
  }
};
