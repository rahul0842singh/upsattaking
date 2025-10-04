// src/utils/time.js
function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m) | 0;
}
module.exports = { hhmmToMinutes };