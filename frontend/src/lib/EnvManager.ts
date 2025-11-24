import { EnvManager, defineEnvSchema } from "@davemanufor/env-manager";
const Env = EnvManager.create(
  defineEnvSchema({
    VITE_API_BASE_URL: {
      type: "string",
    },
    VITE_APP_BASE_URL: {
      type: "string",
    },
    VITE_ENVIRONMENT: {
      type: "string",
    },
    VITE_USERBACK_API_KEY: {
      type: "string",
    },
  }),
  import.meta.env
).data();

export default Env;
