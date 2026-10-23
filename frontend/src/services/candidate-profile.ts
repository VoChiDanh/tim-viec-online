import "server-only";
import { requireUser } from "./auth-session";

export async function getCandidateProfileAccount() {
  const user = await requireUser("candidate", "/account/profile");
  // Enable read/write capabilities here once the Laravel profile and CV
  // endpoints exist. Never substitute fixture data for an authenticated user.
  return {
    user,
    capabilities: {
      readProfile: false,
      saveProfile: false,
      uploadCv: false,
    } as const,
  };
}
