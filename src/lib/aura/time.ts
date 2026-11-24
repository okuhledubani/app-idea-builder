import { DAYS_SHOWN } from "./data";

const pad = (n: number) => String(n).padStart(2, "0");

export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function slotTime(dayKey: string, start: number): number {
  const d = parseDayKey(dayKey);
  d.setHours(Math.floor(start / 60), start % 60, 0, 0);
  return d.getTime();
}

/** Next open days (Mon–Sat), starting tomorrow. Sundays are closed. */
export function nextOpenDays(now: number, count = DAYS_SHOWN): string[] {
  const days: string[] = [];
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) days.push(toDayKey(d));
  }
  return days;
}

export function fmtTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDay(key: string): string {
  const d = parseDayKey(key);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function fmtStamp(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return `${fmtDay(toDayKey(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
