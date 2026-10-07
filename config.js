// =====================================================================
//  Walter's Home Check — settings you can change.
//  Edit the text between the quotes. Keep the quotes and commas.
// =====================================================================

export const APP_NAME = "Walter's Home Check — Home Inspection Checklist";

// Links shown in Settings → About
export const YOUTUBE_URL = "https://www.youtube.com/@WaltersHomeCheck";
export const STORE_URL = "https://payhip.com/WaltersHomeCheck";
export const SUPPORT_EMAIL = "waltershomecheck@outlook.com";

// Access codes. Never put the real codes here — only their "hash".
// Make a hash with tools/make-code-hash.html, then paste it as a new line below.
// Codes are not case-sensitive (walter-abcd-1234 works the same as WALTER-ABCD-1234).
export const ACCESS_CODE_HASHES = [
  "5d6807a3737fb53b3b1953300597f5b45fb59502477816caa68cbd9a9e44d028", // code #1
  "cf2b73dd62b41a22fb6c5b4097b93e29c4c534357f0af36532235b579072453b", // code #2
  "92d2d504b83dee71d3d690c896056f4ca1471a705abd617e081101a9f39eb095", // code #3
  "d84e1cccca0e48eb3ec89b513f7593773ae2f9b494573df0abf1aae67c247a9d", // code #4
  "89e248478dcbc1084d2e96fead9a3a0efd495123952d0de694c857b84acd56fc", // code #5
  "aada8e205a4cd8cd7d87f76ad14a093671474dac27afbfdfce4b74d46f32dd09", // code #6
  "bc394a3a8f1f3c71e2c3741f66fabac51b567c377cae3cdeadf51ab6838ce059", // code #7
  "bdb2d59d80388fd8a3ae7f2ad57a77aa8aa8d1b067f0e78f1418268ed0853c49", // code #8
  "fecbbef753828cb9b3ae40f2e7babc34fda2e53638660ca85f545cc772042730", // code #9
  "8fe58a4cd87081e8eac3749d2fe64d26f5e5f39b7a1cfbb468bb37366c6a32c1", // code #10
];

// Suggested walking order of the areas, by their number in CHECKLIST_CONTENT.md.
// Outside first, then inside from the top of the house down.
// Any area not listed here is added at the end.
export const WALK_ORDER = [1, 2, 3, 4, 15, 6, 13, 12, 11, 14, 7, 8, 10, 9, 5];

// "My Home" tab: the small card that points people to the Home Check Manual (shown at most once a month).
export const MANUAL_URL = "https://payhip.com/b/ABaxT";
