export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export const APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as
  | 'development'
  | 'staging'
  | 'production';

export const IS_DEV = APP_ENV === 'development';
export const IS_STAGING = APP_ENV === 'staging';
export const IS_PROD = APP_ENV === 'production';

export const STORAGE_KEYS = {
  TOKEN: 'tc_token',
  USER: 'tc_user',
} as const;

export const AUTO_SAVE_INTERVAL = 30000;
export const HEARTBEAT_INTERVAL = 60000;
export const TIMER_WARNING = 300;
export const TIMER_DANGER = 60;
