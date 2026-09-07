const notices: Record<string, string> = {
  signed_out: "You have been logged out of this browser.",
  session_expired: "Please log in to continue. Your session may have expired.",
  unavailable:
    "Sign-in is temporarily unavailable. Please try again once the account service is connected.",
  confirmation_failed:
    "This confirmation link is invalid or has expired. Try the latest link in your inbox, or register again to request a new one.",
};

export function authNotice(value: unknown) {
  return typeof value === "string" && Object.hasOwn(notices, value) ? notices[value] : undefined;
}
