export interface Env {
  AI: Ai;
  RATE_LIMITS: KVNamespace;
  PAGE_CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  DEVICE_REGISTRATION_SECRET: string;
  ENVIRONMENT: string;
  APP_NAME: string;
  DEFAULT_MODEL: string;
}
