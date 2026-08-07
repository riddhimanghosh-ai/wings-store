import { createVertex } from "@ai-sdk/google-vertex";

function loadCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return undefined;
  return JSON.parse(raw);
}

export const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION,
  googleAuthOptions: {
    credentials: loadCredentials(),
  },
});
