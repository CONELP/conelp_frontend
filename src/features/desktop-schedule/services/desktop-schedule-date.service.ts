export function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function shiftDateString(date: string, days: number) {
  return formatLocalDate(addDays(parseLocalDate(date), days));
}

export function diffDays(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}
