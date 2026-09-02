import { summariseCosts } from './costs.js';
import {
  evaluateBenefit,
  filterBenefits,
  formatBenefitAmount,
} from './eligibility.js';
import { getUpcomingMilestones } from './pregnancy.js';

const money = new Intl.NumberFormat('zh-TW', {
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  return `NT$${money.format(value)}`;
}

export function formatPregnancyProgress(progress) {
  if (!progress.valid) return { value: '待設定', suffix: '' };
  return {
    value: String(progress.week),
    suffix: `週 + ${progress.day} 天`,
  };
}

const statusLabels = {
  likely: '初步符合',
  check: '需要確認',
  'not-match': '目前不符',
};

const jurisdictionLabels = {
  national: '中央',
  taipei: '臺北市',
};

const cadenceLabels = {
  monthly: '每月',
  once: '一次性',
};

const childLabels = {
  family: '全家',
  'older-son': '哥哥',
  'baby-daughter': '女兒',
  mom: '媽媽',
};

export function makeTextModel(value) {
  return { text: String(value ?? '') };
}

export function checklistProgress(items, completed) {
  const total = items.length;
  const complete = items.reduce(
    (count, item) => count + (completed.has(item.id) ? 1 : 0),
    0,
  );

  return {
    complete,
    total,
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
  };
}

export function nextTheme(theme) {
  if (theme === 'wine-red') return 'london-blue';
  return 'wine-red';
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text);

  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    if (value !== undefined && value !== null && value !== false) {
      element.setAttribute(name, value === true ? '' : String(value));
    }
  }

  return element;
}

function appendList(parent, title, items) {
  if (!items?.length) return;
  parent.append(createElement('h4', { text: title }));
  const list = createElement('ul');
  for (const item of items) list.append(createElement('li', { text: item }));
  parent.append(list);
}

export function renderPregnancy(progress, milestones, signs, root = document) {
  const weekElement = root.querySelector('#current-week');
  const noteElement = root.querySelector('#current-week-note');
  const timeline = root.querySelector('#pregnancy-timeline');
  const urgentList = root.querySelector('#urgent-signs');
  const upcomingTasks = root.querySelector('#upcoming-tasks');

  if (weekElement) {
    const label = formatPregnancyProgress(progress);
    weekElement.replaceChildren(document.createTextNode(label.value));
    if (label.suffix) {
      weekElement.append(createElement('span', { text: label.suffix }));
    }
  }
  if (noteElement) {
    noteElement.textContent = progress.valid
      ? '依你儲存在此裝置的設定估算'
      : '請更新有效的預產日期或孕週基準';
  }

  const upcoming = getUpcomingMilestones(progress, milestones, 5);
  if (timeline) {
    timeline.replaceChildren();
    for (const milestone of upcoming) {
      const item = createElement('li', { className: 'timeline-item' });
      const range = milestone.startWeek === milestone.endWeek
        ? `第 ${milestone.startWeek} 週`
        : `第 ${milestone.startWeek}–${milestone.endWeek} 週`;
      const copy = createElement('div');
      copy.append(
        createElement('h3', { text: milestone.title }),
        createElement('p', { text: milestone.description }),
      );
      item.append(
        createElement('span', { className: 'timeline-week', text: range }),
        copy,
      );
      timeline.append(item);
    }
    if (!upcoming.length) {
      timeline.append(createElement('li', {
        className: 'empty-state',
        text: '請先提供有效孕週；醫療安排仍以產檢院所為準。',
      }));
    }
  }

  if (urgentList) {
    urgentList.replaceChildren(...signs.map((sign) => createElement('li', {
      text: `${sign.title}：${sign.guidance}`,
    })));
  }

  if (upcomingTasks) {
    const tasks = upcoming.slice(0, 3);
    upcomingTasks.replaceChildren();
    for (const [index, milestone] of tasks.entries()) {
      const card = createElement('article', { className: 'task-card' });
      card.append(
        createElement('p', {
          className: 'data-label',
          text: `${String(index + 1).padStart(2, '0')}／第 ${milestone.startWeek} 週`,
        }),
        createElement('h2', { text: milestone.title }),
        createElement('p', { text: milestone.description }),
      );
      upcomingTasks.append(card);
    }
  }
}

export function renderBenefits(container, countElement, records, filters, profile, onDate) {
  const filtered = filterBenefits(records, filters);
  container.replaceChildren();
  countElement.textContent = `顯示 ${filtered.length} 項已查核方案`;

  if (!filtered.length) {
    container.append(createElement('p', {
      className: 'empty-state',
      text: '找不到相符方案，可清除搜尋字詞或切換孩子階段。',
    }));
    return;
  }

  for (const benefit of filtered) {
    const evaluation = evaluateBenefit(benefit, profile, onDate);
    const card = createElement('article', {
      className: 'benefit-card',
      attrs: { 'data-status': evaluation.status },
    });
    const meta = createElement('div', { className: 'benefit-meta' });
    meta.append(
      createElement('span', {
        className: 'status-label',
        text: statusLabels[evaluation.status],
        attrs: { 'data-status': evaluation.status },
      }),
      createElement('span', {
        className: 'data-label',
        text: jurisdictionLabels[benefit.jurisdiction] ?? benefit.jurisdiction,
      }),
    );

    const details = createElement('details', { className: 'benefit-details' });
    details.append(createElement('summary', { text: '條件、限制與申請方式' }));
    appendList(details, '資格條件', benefit.requirements);
    appendList(details, '注意與排除', benefit.exclusions);
    appendList(details, '目前判讀', evaluation.reasons);
    if (benefit.application) {
      appendList(details, '申請管道', benefit.application.channels);
      details.append(createElement('p', {
        text: `申請期限：${benefit.application.deadline}`,
      }));
    }

    const tags = createElement('div', { className: 'tag-list' });
    for (const tag of benefit.tags?.slice(0, 4) ?? []) {
      tags.append(createElement('span', { className: 'tag', text: tag }));
    }

    const actions = createElement('div', { className: 'card-actions' });
    actions.append(
      createElement('time', {
        text: `查核 ${benefit.source.verifiedAt.replaceAll('-', '.')}`,
        attrs: { datetime: benefit.source.verifiedAt },
      }),
      createElement('a', {
        text: '查看官方來源',
        attrs: {
          href: benefit.source.url,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    );

    card.append(
      meta,
      createElement('h3', { text: benefit.title }),
      createElement('p', {
        className: 'amount',
        text: formatBenefitAmount(benefit.amount, profile.childOrder, onDate),
      }),
      createElement('p', { text: benefit.summary }),
      tags,
      details,
      actions,
    );
    container.append(card);
  }
}

export function renderChecklist(container, categories, items, completed) {
  container.replaceChildren();
  for (const category of categories) {
    const categoryItems = items.filter((item) => item.category === category.id);
    if (!categoryItems.length) continue;

    const section = createElement('section', { className: 'checklist-group' });
    const heading = createElement('div', { className: 'checklist-group-heading' });
    heading.append(
      createElement('span', { className: 'group-index', text: category.index }),
      createElement('h3', { text: category.label }),
      createElement('span', { className: 'data-label', text: `${categoryItems.length} 項` }),
    );
    const list = createElement('ul', { className: 'checklist-list' });

    for (const item of categoryItems) {
      const row = createElement('li', { className: 'checklist-item' });
      const checkbox = createElement('input', {
        attrs: {
          id: `bag-${item.id}`,
          type: 'checkbox',
          'data-checklist-id': item.id,
        },
      });
      checkbox.checked = completed.has(item.id);

      const label = createElement('label', { attrs: { for: `bag-${item.id}` } });
      label.append(
        createElement('span', { text: item.title }),
        createElement('small', { text: item.description }),
      );

      const flags = createElement('div', { className: 'item-flags' });
      if (item.essential) flags.append(createElement('span', { className: 'tag', text: '必帶' }));
      if (item.confirmWithHospital) flags.append(createElement('span', { className: 'tag', text: '問院所' }));
      if (item.custom) {
        const remove = createElement('button', {
          className: 'text-button',
          text: '移除',
          attrs: {
            type: 'button',
            'data-remove-checklist-id': item.id,
            'aria-label': `移除 ${item.title}`,
          },
        });
        flags.append(remove);
      }

      row.append(checkbox, label, flags);
      list.append(row);
    }
    section.append(heading, list);
    container.append(section);
  }
}

export function renderCosts(entriesContainer, summaryContainer, entries) {
  entriesContainer.replaceChildren();
  if (!entries.length) {
    entriesContainer.append(createElement('li', {
      className: 'muted',
      text: '還沒有自訂花費，先加入一筆實際支出。',
    }));
  }

  for (const entry of entries) {
    const item = createElement('li', { className: 'cost-entry' });
    item.append(
      createElement('strong', { text: entry.title }),
      createElement('span', { text: childLabels[entry.child] ?? '全家' }),
      createElement('span', { text: `${cadenceLabels[entry.cadence] ?? ''} ${formatMoney(entry.expense)}` }),
      createElement('span', { text: `補助 ${formatMoney(entry.subsidy)}` }),
      createElement('button', {
        className: 'text-button',
        text: '移除',
        attrs: {
          type: 'button',
          'data-remove-cost-id': entry.id,
          'aria-label': `移除 ${entry.title}`,
        },
      }),
    );
    entriesContainer.append(item);
  }

  const summary = summariseCosts(entries);
  const cells = [
    ['每月支出', summary.monthlyExpense],
    ['每月補助', summary.monthlySubsidy],
    ['年化支出', summary.annualExpense],
    ['年化淨支出', summary.annualNet],
  ];
  summaryContainer.replaceChildren(...cells.map(([label, value]) => {
    const cell = createElement('div', { className: 'summary-cell' });
    cell.append(
      createElement('span', { className: 'data-label', text: label }),
      createElement('strong', { text: formatMoney(value) }),
    );
    return cell;
  }));
}

export function renderSources(container, sources) {
  const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()];
  container.replaceChildren();
  for (const source of uniqueSources) {
    const card = createElement('article', { className: 'source-card' });
    const heading = createElement('h3');
    heading.append(createElement('a', {
      text: source.title,
      attrs: {
        href: source.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }));
    card.append(
      createElement('p', { className: 'data-label', text: source.issuer }),
      heading,
      createElement('time', {
        text: `查核 ${source.verifiedAt.replaceAll('-', '.')}`,
        attrs: { datetime: source.verifiedAt },
      }),
    );
    container.append(card);
  }
}

export function renderOpenData(statusElement, listElement, result, metadata) {
  statusElement.dataset.mode = result.mode;
  const statusText = statusElement.querySelector('span');
  const dateLabel = result.mode === 'live' && result.fetchedAt
    ? `載入 ${result.fetchedAt.slice(0, 10)}`
    : `資料檔更新 ${metadata.resourceUpdatedAt}`;
  statusText.textContent = `${result.message} ${dateLabel}；共 ${result.rows.length} 處。`;

  listElement.replaceChildren();
  for (const facility of result.rows) {
    const item = createElement('li', { className: 'facility-item' });
    const heading = createElement('h4', { text: facility.name });
    const phoneDigits = facility.phone.replace(/[^\d+]/g, '');
    const details = createElement('p');
    details.append(
      createElement('span', {
        className: 'data-label',
        text: facility.capacity == null ? '收托人數請洽機構' : `核定收托 ${facility.capacity} 人`,
      }),
      document.createElement('br'),
      document.createTextNode(facility.address),
      document.createElement('br'),
      createElement('a', {
        text: facility.phone,
        attrs: { href: `tel:${phoneDigits}` },
      }),
    );
    item.append(heading, details);
    listElement.append(item);
  }
}
