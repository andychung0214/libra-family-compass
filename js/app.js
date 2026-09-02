import { benefits, benefitSources } from './data/benefits.js';
import {
  hospitalBagCategories,
  hospitalBagItems,
  hospitalBagSource,
} from './data/hospital-bag.js';
import {
  pregnancyMilestones,
  pregnancySources,
  urgentSigns,
} from './data/pregnancy-guide.js';
import {
  publicChildcareFallback,
  publicChildcareMetadata,
  publicChildcareSource,
} from './data/open-data-fallback.js';
import { normaliseMoney } from './costs.js';
import { loadOpenData } from './open-data.js';
import { calculatePregnancyProgress } from './pregnancy.js';
import {
  checklistProgress,
  nextTheme,
  renderBenefits,
  renderChecklist,
  renderCosts,
  renderOpenData,
  renderPregnancy,
  renderSources,
} from './render.js';
import { createState } from './state.js';
import { createStorage } from './storage.js';

const TODAY = new Date();
const todayIso = [
  TODAY.getFullYear(),
  String(TODAY.getMonth() + 1).padStart(2, '0'),
  String(TODAY.getDate()).padStart(2, '0'),
].join('-');

const defaultState = {
  theme: 'wine-red',
  family: {
    region: 'taipei',
    dueDate: '',
    referenceDate: '2026-09-02',
    pregnancyWeek: 32,
    pregnancyDay: 0,
  },
  filters: {
    query: '',
    stage: 'under-2',
    childOrder: 2,
    careMode: 'undecided',
  },
  checklist: {
    completed: [],
    customItems: [],
  },
  costs: [],
};

const statusElement = document.querySelector('#status-message');
let statusTimer;

function announce(message) {
  statusElement.textContent = '';
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusElement.textContent = message;
  }, 30);
}

const persistence = createStorage(window.localStorage, announce);

function validString(value, fallback, maxLength = 80) {
  return typeof value === 'string' && value.length <= maxLength ? value : fallback;
}

function sanitiseLoadedState(value) {
  if (!value || typeof value !== 'object') return defaultState;
  const family = value.family && typeof value.family === 'object' ? value.family : {};
  const filters = value.filters && typeof value.filters === 'object' ? value.filters : {};
  const checklist = value.checklist && typeof value.checklist === 'object' ? value.checklist : {};
  const categories = new Set(hospitalBagCategories.map(({ id }) => id));
  const knownItems = new Set(hospitalBagItems.map(({ id }) => id));
  const careModes = new Set(['undecided', 'home', 'public', 'community', 'quasi-public', 'non-quasi-public']);
  const stages = new Set(['all', 'pregnancy', 'birth', 'under-2', 'age-2-5', 'age-5', 'family']);
  const customItems = Array.isArray(checklist.customItems)
    ? checklist.customItems.slice(0, 100).flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const title = validString(item.title, '', 60).trim();
      if (!title || !categories.has(item.category)) return [];
      const id = validString(item.id, '', 100);
      return id ? [{ id, category: item.category, title, description: '自訂項目', custom: true }] : [];
    })
    : [];
  const customIds = new Set(customItems.map(({ id }) => id));
  const completed = Array.isArray(checklist.completed)
    ? checklist.completed.filter((id) => knownItems.has(id) || customIds.has(id)).slice(0, 200)
    : [];
  const costs = Array.isArray(value.costs)
    ? value.costs.slice(0, 100).flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const title = validString(entry.title, '', 60).trim();
      const id = validString(entry.id, '', 100);
      if (!title || !id) return [];
      return [{
        id,
        title,
        child: ['family', 'older-son', 'baby-daughter', 'mom'].includes(entry.child) ? entry.child : 'family',
        cadence: entry.cadence === 'once' ? 'once' : 'monthly',
        expense: normaliseMoney(entry.expense),
        subsidy: normaliseMoney(entry.subsidy),
      }];
    })
    : [];

  return {
    theme: value.theme === 'london-blue' ? 'london-blue' : 'wine-red',
    family: {
      region: 'taipei',
      dueDate: validString(family.dueDate, '', 10),
      referenceDate: validString(family.referenceDate, defaultState.family.referenceDate, 10),
      pregnancyWeek: Number.isInteger(Number(family.pregnancyWeek)) ? Number(family.pregnancyWeek) : 32,
      pregnancyDay: Number.isInteger(Number(family.pregnancyDay)) ? Number(family.pregnancyDay) : 0,
    },
    filters: {
      query: validString(filters.query, '', 100),
      stage: stages.has(filters.stage) ? filters.stage : 'under-2',
      childOrder: [1, 2, 3].includes(Number(filters.childOrder)) ? Number(filters.childOrder) : 2,
      careMode: careModes.has(filters.careMode) ? filters.careMode : 'undecided',
    },
    checklist: { completed, customItems },
    costs,
  };
}

const store = createState(
  sanitiseLoadedState(persistence.load('state', defaultState)),
  persistence,
);

const elements = {
  themeToggle: document.querySelector('#theme-toggle'),
  themeLabel: document.querySelector('#theme-toggle .theme-label'),
  familyForm: document.querySelector('#family-settings-form'),
  dueDateError: document.querySelector('#due-date-error'),
  filterForm: document.querySelector('#benefit-filter-form'),
  benefitResults: document.querySelector('#benefit-results'),
  benefitCount: document.querySelector('#benefit-count'),
  resetFilters: document.querySelector('#reset-benefit-filters'),
  checklistGroups: document.querySelector('#checklist-groups'),
  progressNumber: document.querySelector('#bag-progress-number'),
  progressMessage: document.querySelector('#bag-progress-message'),
  progressBar: document.querySelector('#bag-progress-bar'),
  customItemForm: document.querySelector('#custom-item-form'),
  printChecklist: document.querySelector('#print-checklist'),
  clearChecklist: document.querySelector('#clear-checklist'),
  costForm: document.querySelector('#cost-form'),
  costError: document.querySelector('#cost-form-error'),
  costEntries: document.querySelector('#cost-entries'),
  costSummary: document.querySelector('#cost-summary'),
  sourceList: document.querySelector('#source-list'),
  openDataStatus: document.querySelector('#open-data-status'),
  facilityList: document.querySelector('#facility-list'),
  clearAll: document.querySelector('#clear-all-data'),
};

function createId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function setFormValue(form, name, value) {
  const field = form.elements.namedItem(name);
  if (field && field.value !== String(value ?? '')) field.value = String(value ?? '');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const nextLabel = theme === 'wine-red' ? '倫敦藍' : '酒紅色';
  elements.themeLabel.textContent = nextLabel;
  elements.themeToggle.setAttribute('aria-label', `切換為${nextLabel}主題`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'wine-red' ? '#722f45' : '#1f4e5f',
  );
}

function renderApp(state) {
  applyTheme(state.theme);
  const progress = calculatePregnancyProgress(state.family, TODAY);
  renderPregnancy(progress, pregnancyMilestones, urgentSigns);

  for (const [name, value] of Object.entries(state.family)) {
    setFormValue(elements.familyForm, name, value);
  }
  for (const [name, value] of Object.entries(state.filters)) {
    setFormValue(elements.filterForm, name, value);
  }

  const profile = {
    region: state.family.region,
    childStage: state.filters.stage === 'all' ? null : state.filters.stage,
    childOrder: state.filters.childOrder,
    careMode: state.filters.careMode,
    householdTags: [],
  };
  renderBenefits(
    elements.benefitResults,
    elements.benefitCount,
    benefits,
    state.filters,
    profile,
    todayIso,
  );

  const allBagItems = [...hospitalBagItems, ...state.checklist.customItems];
  const completed = new Set(state.checklist.completed);
  renderChecklist(elements.checklistGroups, hospitalBagCategories, allBagItems, completed);
  const progressSummary = checklistProgress(allBagItems, completed);
  elements.progressNumber.textContent = `${progressSummary.complete}／${progressSummary.total}`;
  elements.progressBar.style.width = `${progressSummary.percent}%`;
  elements.progressMessage.textContent = progressSummary.percent === 100
    ? '清單已全部完成，出發前再快速核對一次。'
    : progressSummary.percent >= 50
      ? '已經過半，接著確認院所提供的用品。'
      : '從必帶證件開始，會比較輕鬆。';

  renderCosts(elements.costEntries, elements.costSummary, state.costs);
  renderSources(elements.sourceList, [
    ...pregnancySources,
    ...benefitSources,
    hospitalBagSource,
    publicChildcareSource,
  ]);
}

elements.themeToggle.addEventListener('click', () => {
  store.update((state) => ({ theme: nextTheme(state.theme) }));
  announce('主題已切換。');
});

elements.familyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(elements.familyForm);
  const family = {
    region: 'taipei',
    dueDate: String(formData.get('dueDate') ?? ''),
    referenceDate: String(formData.get('referenceDate') ?? ''),
    pregnancyWeek: Number(formData.get('pregnancyWeek')),
    pregnancyDay: Number(formData.get('pregnancyDay')),
  };
  const progress = calculatePregnancyProgress(family, TODAY);
  if (!progress.valid) {
    elements.dueDateError.textContent = '請確認日期與孕週；估算範圍為第 0 至 42 週。';
    elements.dueDateError.focus?.();
    return;
  }
  elements.dueDateError.textContent = '';
  store.update({ family });
  announce('家庭孕週設定已儲存在這台裝置。');
});

function updateFilters() {
  const formData = new FormData(elements.filterForm);
  store.update({
    filters: {
      query: String(formData.get('query') ?? '').slice(0, 100),
      stage: String(formData.get('stage') ?? 'all'),
      childOrder: Number(formData.get('childOrder')),
      careMode: String(formData.get('careMode') ?? 'undecided'),
    },
  });
}

elements.filterForm.addEventListener('input', updateFilters);
elements.filterForm.addEventListener('change', updateFilters);
elements.filterForm.addEventListener('submit', (event) => event.preventDefault());
elements.resetFilters.addEventListener('click', () => {
  store.update({ filters: { ...defaultState.filters } });
  announce('補助篩選已重設。');
});

elements.checklistGroups.addEventListener('change', (event) => {
  const id = event.target?.dataset?.checklistId;
  if (!id) return;
  store.update((state) => {
    const completed = new Set(state.checklist.completed);
    if (event.target.checked) completed.add(id);
    else completed.delete(id);
    return { checklist: { ...state.checklist, completed: [...completed] } };
  });
});

elements.checklistGroups.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-remove-checklist-id]');
  if (!button) return;
  const id = button.dataset.removeChecklistId;
  if (!window.confirm('確定移除這個自訂項目？')) return;
  store.update((state) => ({
    checklist: {
      completed: state.checklist.completed.filter((itemId) => itemId !== id),
      customItems: state.checklist.customItems.filter((item) => item.id !== id),
    },
  }));
  announce('自訂待產項目已移除。');
});

elements.customItemForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(elements.customItemForm);
  const title = String(formData.get('title') ?? '').trim().slice(0, 60);
  const category = String(formData.get('category') ?? 'documents');
  if (!title) return;
  const item = {
    id: createId('custom'),
    category,
    title,
    description: '自訂項目',
    custom: true,
  };
  store.update((state) => ({
    checklist: {
      ...state.checklist,
      customItems: [...state.checklist.customItems, item],
    },
  }));
  elements.customItemForm.reset();
  announce('自訂待產項目已加入。');
});

elements.clearChecklist.addEventListener('click', () => {
  if (!window.confirm('確定清除全部待產包勾選？自訂項目會保留。')) return;
  store.update((state) => ({ checklist: { ...state.checklist, completed: [] } }));
  announce('待產包勾選已清除。');
});
elements.printChecklist.addEventListener('click', () => window.print());

elements.costForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(elements.costForm);
  const title = String(formData.get('title') ?? '').trim().slice(0, 60);
  const expense = normaliseMoney(formData.get('expense'));
  const subsidy = normaliseMoney(formData.get('subsidy'));
  if (!title || !expense) {
    elements.costError.textContent = '請輸入項目名稱與大於 0 的支出。';
    return;
  }
  elements.costError.textContent = '';
  const entry = {
    id: createId('cost'),
    title,
    child: String(formData.get('child') ?? 'family'),
    cadence: String(formData.get('cadence') ?? 'monthly'),
    expense,
    subsidy,
  };
  store.update((state) => ({ costs: [...state.costs, entry] }));
  elements.costForm.reset();
  setFormValue(elements.costForm, 'subsidy', 0);
  announce('花費項目已加入。');
});

elements.costEntries.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-remove-cost-id]');
  if (!button) return;
  if (!window.confirm('確定移除這筆花費？')) return;
  const id = button.dataset.removeCostId;
  store.update((state) => ({ costs: state.costs.filter((entry) => entry.id !== id) }));
  announce('花費項目已移除。');
});

elements.clearAll.addEventListener('click', () => {
  if (!window.confirm('確定清除這台裝置儲存的家庭設定、清單與花費？')) return;
  persistence.removeAll();
  store.reset();
  announce('本站在這台裝置的資料已清除。');
});

store.subscribe(renderApp);
renderApp(store.getState());

async function initialiseOpenData() {
  // 官方 API 的跨來源標頭不允許 GitHub Pages，因此正式版不送出請求或家庭設定。
  const result = await loadOpenData({
    fetchFn: window.fetch.bind(window),
    url: '',
    fallback: publicChildcareFallback,
  });
  renderOpenData(
    elements.openDataStatus,
    elements.facilityList,
    result,
    publicChildcareMetadata,
  );
}

initialiseOpenData();
