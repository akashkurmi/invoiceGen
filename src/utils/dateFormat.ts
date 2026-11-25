const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const formatSingleDate = (trimmed: string): string => {
  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const mIdx = parseInt(isoMatch[2], 10) - 1;
    const d = isoMatch[3].padStart(2, "0");
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES[mIdx]} ${d}, ${y}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const mIdx = parseInt(dmyMatch[2], 10) - 1;
    const y = dmyMatch[3];
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES[mIdx]} ${d}, ${y}`;
    }
  }

  // Fallback to Date object if string is already e.g. "January 21, 2021" or ISO timestamp
  const dt = new Date(trimmed);
  if (!isNaN(dt.getTime())) {
    const m = MONTH_NAMES[dt.getMonth()];
    const d = String(dt.getDate()).padStart(2, "0");
    const y = dt.getFullYear();
    return `${m} ${d}, ${y}`;
  }

  return trimmed;
};

export const formatDisplayDate = (dStr?: string): string => {
  if (!dStr) return "-";
  const trimmed = dStr.trim();
  if (!trimmed) return "-";

  // Check multi-day range separator: "2026-01-17 to 2026-01-18", "2026-01-17 - 2026-01-18", "2026-01-17 – 2026-01-18"
  const rangeParts = trimmed.split(/\s+(?:to|-|–|—)\s+/i);
  if (rangeParts.length === 2) {
    const f1 = formatSingleDate(rangeParts[0]);
    const f2 = formatSingleDate(rangeParts[1]);
    if (f1 && f2) {
      return `${f1} – ${f2}`;
    }
  }

  return formatSingleDate(trimmed);
};

