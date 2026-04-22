export type AppMode = "swara" | "micro";

export interface AppConfig {
  mode: AppMode;
}

// inizialmente hardcoded (poi lo leggiamo da .env)
export const appConfig: AppConfig = {
  mode: import.meta.env.VITE_APP_MODE as "swara" | "micro",
};