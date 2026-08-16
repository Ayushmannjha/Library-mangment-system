/**
 * date-utils.ts
 * Centralized Date Utilities for Indian Standard Time (IST) & Indian Date Formatting.
 */

/**
 * Get local date string in `YYYY-MM-DD` format for HTML `<input type="date">`.
 * Uses local system timezone (IST) instead of UTC to prevent midnight date-shifting bugs.
 */
export function getLocalTodayDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats date string/object to Indian Standard Date format (e.g. "13 Aug 2026").
 */
export function formatIndianDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '--';
  const str = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();
  const datePart = str.includes('T') ? str.split('T')[0] : str.substring(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return str;

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = months[monthIdx] || month;

  return `${parseInt(day, 10)} ${monthName} ${year}`;
}
