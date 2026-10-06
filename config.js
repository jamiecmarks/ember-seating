// ---------------------------------------------------------------
// Seating config. This is the only file you normally need to edit.
// ---------------------------------------------------------------
window.SEATING_CONFIG = {
  // The seating API (Cloudflare Worker in worker/, see README.md).
  // Leave empty for demo mode (data stays in your browser).
  API_URL: "https://ember-seating.ember-seating-worker.workers.dev",

  OFFICE_NAME: "Melbourne",

  // How many ranked picks each person can make.
  MAX_PICKS: 3,

  // Label for the attendance number used to decide priority.
  ATTENDANCE_LABEL: "Days in office",

  // Staff who appear in the name dropdown.
  STAFF: [
    "Aadya",
    "Alice He",
    "Alice Lu",
    "Amy",
    "Caitlin",
    "Carl",
    "Cat",
    "Chloe",
    "Conor",
    "Jamie",
    "Leslie",
    "Pat",
    "Sam",
    "Talia",
    "Vincent",
    "Zachary",
    "Zofia",
  ],
};
