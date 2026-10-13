const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const THAI_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function isValidDateParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeHistoryDate(value) {
  const raw = String(value || "").trim();
  let year;
  let month;
  let day;

  const isoMatch = raw.match(DATE_ONLY_PATTERN);
  if (isoMatch) {
    [, year, month, day] = isoMatch.map(Number);
  } else {
    const thaiMatch = raw.match(THAI_DATE_PATTERN);
    if (!thaiMatch) return null;
    day = Number(thaiMatch[1]);
    month = Number(thaiMatch[2]);
    year = Number(thaiMatch[3]);
  }

  if (!isValidDateParts(year, month, day)) return null;

  return {
    display: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    year: String(year),
    timestamp: Date.UTC(year, month - 1, day),
  };
}

export function formatHistoryDate(value) {
  return normalizeHistoryDate(value)?.display || String(value || "-");
}

export function getHistoryYear(value) {
  return normalizeHistoryDate(value)?.year || "ไม่ทราบปี";
}

export function getHistoryTimestamp(value) {
  return normalizeHistoryDate(value)?.timestamp || 0;
}
