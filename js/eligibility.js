const currency = new Intl.NumberFormat('zh-TW', {
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => `NT$${currency.format(value)}`;

function formatCadence(amount, value) {
  const labels = {
    monthly: '每月',
    annual: '每年',
    once: '一次',
    'per-pregnancy': '每次懷孕',
    'per-birth': '每胎',
  };
  const prefix = labels[amount.cadence] ?? labels[amount.kind] ?? labels[amount.unit] ?? '';
  return `${prefix}${prefix ? ' ' : ''}${formatCurrency(value)}`;
}

export function formatBenefitAmount(
  amount,
  childOrder,
  onDate = new Date().toISOString().slice(0, 10),
) {
  if (!amount) return '依個別資格與主管機關核定';

  if (amount.kind === 'service' || amount.kind === 'formula') {
    return amount.description;
  }

  if (amount.kind === 'dated') {
    const period = amount.periods
      .filter(({ from, to }) => from <= onDate && (!to || onDate <= to))
      .at(-1) ?? amount.periods.at(-1);
    return `${formatCadence(amount, period.value)}${period.note ? `｜${period.note}` : ''}`;
  }

  if (amount.kind === 'tiered') {
    const tier = childOrder ? amount.tiers[childOrder] ?? amount.tiers[3] : null;
    if (tier != null) {
      return formatCadence(
        { ...amount, cadence: amount.cadence ?? 'once' },
        tier,
      );
    }
    const values = [...new Set(Object.values(amount.tiers))].sort((a, b) => a - b);
    return `${amount.cadence === 'monthly' ? '每月 ' : amount.cadence === 'annual' ? '每年 ' : '一次 '}${formatCurrency(values[0])}–${formatCurrency(values.at(-1))}`;
  }

  if (amount.kind === 'up-to') {
    return `最高${formatCadence(amount, amount.value)}`;
  }

  return formatCadence(amount, amount.value);
}

export function evaluateBenefit(benefit, profile, onDate) {
  const reasons = [];
  let needsCheck = false;

  if (onDate < benefit.effectiveFrom) {
    needsCheck = true;
    reasons.push(`此方案於 ${benefit.effectiveFrom} 生效，目前尚未生效`);
  }

  if (!profile.region) {
    needsCheck = true;
    reasons.push('需要確認設籍地區');
  } else if (
    benefit.jurisdiction !== 'national'
    && benefit.jurisdiction !== profile.region
  ) {
    return { status: 'not-match', reasons: ['目前設定的設籍地區不符合'] };
  }

  if (!profile.childStage) {
    needsCheck = true;
    reasons.push('需要確認孩子目前階段');
  } else if (
    !benefit.stages.includes('family')
    && !benefit.stages.includes(profile.childStage)
  ) {
    return { status: 'not-match', reasons: ['目前設定的孩子階段不符合'] };
  }

  if (!profile.childOrder) {
    needsCheck = true;
    reasons.push('需要確認子女排序');
  } else if (
    !benefit.childOrders.includes('any')
    && !benefit.childOrders.includes(profile.childOrder)
  ) {
    return { status: 'not-match', reasons: ['目前設定的子女排序不符合'] };
  }

  if (!benefit.careModes.includes('any')) {
    if (!profile.careMode || profile.careMode === 'undecided') {
      needsCheck = true;
      reasons.push('需要確認照顧方式');
    } else if (!benefit.careModes.includes(profile.careMode)) {
      return { status: 'not-match', reasons: ['目前設定的照顧方式不符合'] };
    }
  }

  if (benefit.requiredTags?.length) {
    const householdTags = profile.householdTags ?? [];
    if (!benefit.requiredTags.some((tag) => householdTags.includes(tag))) {
      needsCheck = true;
      reasons.push('需要向主管機關確認特殊家庭資格');
    }
  }

  if (needsCheck || benefit.status === 'conditional') {
    return { status: 'check', reasons };
  }

  return {
    status: 'likely',
    reasons: ['依目前非敏感設定初步符合，仍以主管機關審核為準'],
  };
}

export function filterBenefits(benefits, filters = {}) {
  const query = String(filters.query ?? '').trim().toLocaleLowerCase('zh-TW');

  return benefits.filter((benefit) => {
    if (
      filters.stage
      && filters.stage !== 'all'
      && !benefit.stages.includes(filters.stage)
      && !benefit.stages.includes('family')
    ) return false;

    if (
      filters.jurisdiction
      && filters.jurisdiction !== 'all'
      && benefit.jurisdiction !== filters.jurisdiction
    ) return false;

    if (filters.status && filters.status !== 'all' && benefit.status !== filters.status) {
      return false;
    }

    if (!query) return true;
    const haystack = [
      benefit.title,
      benefit.summary,
      ...(benefit.tags ?? []),
    ].join(' ').toLocaleLowerCase('zh-TW');
    return haystack.includes(query);
  });
}
