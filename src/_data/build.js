// Global data available in every template as `build.*`.
export default {
  // Build date, ISO. The browser recomputes deadline status from the real
  // clock; this is the value the page ships with.
  today: new Date().toISOString().slice(0, 10),
  year: new Date().getFullYear(),
};
