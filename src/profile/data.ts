import profileData from "../data/profile.json" with { type: "json" };
import { validateProfile } from "./validation";

export function readProfile() {
  try { return { profile: validateProfile(profileData), error: null }; }
  catch (error) { return { profile: null, error: error instanceof Error ? error.message : "Invalid profile data." }; }
}
