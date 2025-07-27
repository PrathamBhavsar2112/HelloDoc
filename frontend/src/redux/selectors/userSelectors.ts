// src/redux/selectors/userSelectors.ts
import { createSelector } from 'reselect';
import { type UserState } from '../types/userTypes';

const selectUserState = (state: { user: UserState }) => state.user;

export const selectCurrentUser = createSelector(
  [selectUserState],
  (userState) => userState.currentUser
);

export const selectUserId = createSelector(
  [selectUserState],
  (userState) => userState.userId
);

export const selectUserRole = createSelector(
  [selectUserState],
  (userState) => userState.role
);

export const selectUserProfile = createSelector(
  [selectCurrentUser],
  (currentUser) => currentUser?.profile
);

export const selectUserLoading = createSelector(
  [selectUserState],
  (userState) => userState.loading
);

export const selectUserError = createSelector(
  [selectUserState],
  (userState) => userState.error
);

export const selectVerificationStatus = createSelector(
  [selectUserState],
  (userState) => userState.verificationStatus
);

export const selectIsVerified = createSelector(
  [selectVerificationStatus],
  (verificationStatus) => verificationStatus === 'verified'
);

export const selectUserDisplayName = createSelector(
  [selectCurrentUser],
  (currentUser) => currentUser?.profile?.fullName || currentUser?.name || 'User'
);