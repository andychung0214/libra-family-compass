export function normaliseMoney(value) {
  const amount = Number(String(value ?? '').replaceAll(',', '').trim());
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export function summariseCosts(entries) {
  const total = entries.reduce(
    (summary, entry) => {
      const multiplier = entry.cadence === 'monthly' ? 12 : 1;
      const expense = normaliseMoney(entry.expense);
      const subsidy = normaliseMoney(entry.subsidy);

      if (entry.cadence === 'monthly') {
        summary.monthlyExpense += expense;
        summary.monthlySubsidy += subsidy;
      }

      summary.annualExpense += expense * multiplier;
      summary.annualSubsidy += subsidy * multiplier;
      return summary;
    },
    {
      monthlyExpense: 0,
      monthlySubsidy: 0,
      annualExpense: 0,
      annualSubsidy: 0,
    },
  );

  return {
    ...total,
    annualNet: Math.max(0, total.annualExpense - total.annualSubsidy),
  };
}
