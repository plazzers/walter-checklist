// =====================================================================
//  Walter's Home Check — settings you can change.
//  Edit the text between the quotes. Keep the quotes and commas.
// =====================================================================

export const APP_NAME = "Walter's Home Check — Home Inspection Checklist";

// Links shown in Settings → About
export const YOUTUBE_URL = "https://youtube.com/@PLACEHOLDER";
export const STORE_URL = "https://payhip.com/PLACEHOLDER";
export const SUPPORT_EMAIL = "PLACEHOLDER@example.com";

// Access codes. Never put the real codes here — only their "hash".
// Make a hash with tools/make-code-hash.html, then paste it as a new line below.
// Codes are not case-sensitive (walter-demo-2026 works the same as WALTER-DEMO-2026).
export const ACCESS_CODE_HASHES = [
  "986f3d05cd9d305f3f964f592a18bba811ac855b8880587f0fea627f293fd0c5", // WALTER-DEMO-2026 (for testing — remove before selling)
];

// Suggested walking order of the areas, by their number in CHECKLIST_CONTENT.md.
// Outside first, then inside from the top of the house down.
// Any area not listed here is added at the end.
export const WALK_ORDER = [1, 2, 3, 4, 15, 6, 13, 12, 11, 14, 7, 8, 10, 9, 5];
