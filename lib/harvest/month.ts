export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_ALIASES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

export type HarvestMonth = {
  year: number;
  month: number;
  label: string;
};

export const HARVEST_MONTH_CHOICES = 10;

export function expectedOn(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function formatHarvestMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

export function harvestMonthFromDate(value: string): HarvestMonth | null {
  const match = /^(\d{4})-(\d{2})-01/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }
  return { year, month, label: formatHarvestMonth(year, month) };
}

export function upcomingHarvestMonths(
  from: Date = new Date(),
  count = HARVEST_MONTH_CHOICES,
): HarvestMonth[] {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + 1;
  const items: HarvestMonth[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const index = month - 1 + offset;
    const nextYear = year + Math.floor(index / 12);
    const nextMonth = (index % 12) + 1;
    items.push({
      year: nextYear,
      month: nextMonth,
      label: formatHarvestMonth(nextYear, nextMonth),
    });
  }

  return items;
}

export function parseHarvestMonth(
  raw: string,
  from: Date = new Date(),
  choices: HarvestMonth[] = upcomingHarvestMonths(from),
): HarvestMonth | null {
  const trimmed = raw.trim().toLowerCase();
  const direct = /^(\d{1,2})$/.exec(trimmed);
  if (direct) {
    const index = Number(direct[1]) - 1;
    return choices[index] ?? null;
  }

  const named = /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?$/.exec(
    trimmed,
  );
  if (!named) {
    return null;
  }

  const month = MONTH_ALIASES[named[1] ?? ""];
  if (!month) {
    return null;
  }

  const currentYear = from.getUTCFullYear();
  const currentMonth = from.getUTCMonth() + 1;
  const year = named[2]
    ? Number(named[2])
    : month >= currentMonth
      ? currentYear
      : currentYear + 1;

  return { year, month, label: formatHarvestMonth(year, month) };
}
