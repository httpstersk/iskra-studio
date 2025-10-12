export const FAL_PROXY_PATH = "/api/fal";
export const FAL_UPLOAD_PATH = `${FAL_PROXY_PATH}/upload`;

export const STANDARD_RATE_LIMITS = {
  perMinute: { tokens: 5, window: "60 s", header: "5" },
  perHour: { tokens: 15, window: "60 m", header: "15" },
  perDay: { tokens: 50, window: "24 h", header: "50" },
} as const;

export const VIDEO_RATE_LIMITS = {
  perMinute: { tokens: 2, window: "60 s", header: "2" },
  perHour: { tokens: 4, window: "60 m", header: "4" },
  perDay: { tokens: 8, window: "24 h", header: "8" },
} as const;
