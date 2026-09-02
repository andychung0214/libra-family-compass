const DAY_MS = 86_400_000;

function parseIsoDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return Number.NaN;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return Number.NaN;
  }

  return timestamp;
}

export function calculatePregnancyProgress(settings, today = new Date()) {
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  let totalDays;
  let mode;

  if (settings.dueDate) {
    totalDays = 280 - Math.round(
      (parseIsoDay(settings.dueDate) - todayUtc) / DAY_MS,
    );
    mode = 'due-date';
  } else {
    const reference = parseIsoDay(settings.referenceDate);
    const week = Number(settings.pregnancyWeek);
    const day = Number(settings.pregnancyDay ?? 0);
    const validBaseline = Number.isInteger(week)
      && Number.isInteger(day)
      && day >= 0
      && day <= 6;
    const baseline = validBaseline ? week * 7 + day : Number.NaN;
    totalDays = baseline + Math.round((todayUtc - reference) / DAY_MS);
    mode = 'reference';
  }

  const valid = Number.isFinite(totalDays)
    && totalDays >= 0
    && totalDays <= 294;

  return {
    week: valid ? Math.floor(totalDays / 7) : null,
    day: valid ? totalDays % 7 : null,
    mode,
    valid,
  };
}

export function getUpcomingMilestones(progress, milestones, limit = 3) {
  if (!progress.valid) return [];

  return milestones
    .filter(({ endWeek = 42 }) => endWeek >= progress.week)
    .sort((first, second) => first.startWeek - second.startWeek)
    .slice(0, limit);
}
