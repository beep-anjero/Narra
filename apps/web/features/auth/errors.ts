import { AuthConfigurationError } from "@/lib/supabase/config";

export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthConfigurationError)
    return "Sign-in is not available yet. Please try again once Narra’s account service is connected.";
  const code =
    typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  switch (code) {
    case "invalid_credentials":
      return "The email or password is incorrect. Please check both and try again.";
    case "email_not_confirmed":
      return "Confirm your email using the link in your inbox, then log in.";
    case "weak_password":
      return "This password does not meet the account service’s security requirements. Choose a stronger password.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "user_already_exists":
    case "email_exists":
      return "Unable to create an account with those details. If you already have an account, log in.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a few minutes before trying again.";
    case "signup_disabled":
      return "New registrations are currently unavailable. Please try again later.";
    default:
      return "Narra could not reach the account service. Please try again in a moment.";
  }
}
