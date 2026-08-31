export type AppEnv = "local" | "dev" | "prod";

const RAW_APP_ENV = import.meta.env.VITE_APP_ENV;

export const APP_ENV: AppEnv =
  RAW_APP_ENV === "prod" || RAW_APP_ENV === "dev" ? RAW_APP_ENV : "local";

export const IS_LOCAL = APP_ENV === "local";
export const IS_DEV = APP_ENV === "dev";
export const IS_PROD = APP_ENV === "prod";
export const IS_DEPLOYED = APP_ENV !== "local";
