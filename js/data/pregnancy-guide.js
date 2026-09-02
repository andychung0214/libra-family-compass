const prenatalSourceUrl = 'https://www.hpa.gov.tw/pages/list.aspx?nodeid=194';
const handbookSourceUrl = 'https://www.hpa.gov.tw/Pages/EBook.aspx?nodeid=4839';

export const pregnancySources = [
  {
    id: 'prenatal-checkups-source',
    issuer: '衛生福利部國民健康署',
    title: '孕婦產前檢查項目及補助金額',
    url: prenatalSourceUrl,
    verifiedAt: '2026-09-03',
  },
  {
    id: 'maternal-handbook-source',
    issuer: '衛生福利部國民健康署',
    title: '孕媽咪衛教手冊',
    url: handbookSourceUrl,
    verifiedAt: '2026-09-03',
  },
];

const prenatalVisits = [
  [1, 8, 8],
  [2, 12, 12],
  [3, 16, 16],
  [4, 20, 20],
  [5, 24, 24],
  [6, 28, 28],
  [7, 30, 30],
  [8, 32, 32],
  [9, 34, 34],
  [10, 36, 36],
  [11, 37, 37],
  [12, 38, 38],
  [13, 39, 39],
  [14, 40, 40],
].map(([number, startWeek, endWeek]) => ({
  id: `prenatal-visit-${String(number).padStart(2, '0')}`,
  type: 'checkup',
  title: `第 ${number} 次公費產前檢查`,
  startWeek,
  endWeek,
  description: '實際檢查時程由產檢院所依孕婦與胎兒狀況安排。',
  sourceId: 'prenatal-checkups-source',
}));

export const pregnancyMilestones = [
  ...prenatalVisits,
  {
    id: 'hospital-bag-preparation',
    type: 'preparation',
    title: '開始整理待產包',
    startWeek: 32,
    endWeek: 36,
    description: '核對證件、媽媽用品、寶寶用品、陪產與大寶照顧安排。',
    sourceId: 'maternal-handbook-source',
  },
  {
    id: 'third-ultrasound',
    type: 'screening',
    title: '第三次一般超音波檢查',
    startWeek: 32,
    endWeek: 40,
    description: '建議於第 32 週後評估胎兒心跳、大小、胎位、胎盤位置及羊水量。',
    sourceId: 'prenatal-checkups-source',
  },
  {
    id: 'late-pregnancy-guidance',
    type: 'guidance',
    title: '孕期後段衛教指導',
    startWeek: 29,
    endWeek: 40,
    description: '與醫療人員確認產兆、母乳哺育、生產計畫及產後支持。',
    sourceId: 'prenatal-checkups-source',
  },
  {
    id: 'gbs-screening',
    type: 'screening',
    title: '產前乙型鏈球菌篩檢',
    startWeek: 35,
    endWeek: 37,
    description: '官方建議於懷孕滿第 35 週至未達第 38 週前接受篩檢。',
    sourceId: 'prenatal-checkups-source',
  },
];

export const urgentSigns = [
  {
    id: 'vaginal-bleeding',
    title: '陰道出血或落紅情況不明',
    guidance: '聯絡產檢院所並依醫療人員指示就醫。',
  },
  {
    id: 'water-breaking',
    title: '疑似破水',
    guidance: '記錄時間與液體狀況，立即聯絡產檢院所。',
  },
  {
    id: 'regular-contractions',
    title: '規律或持續子宮收縮',
    guidance: '依醫療院所提供的產兆標準聯絡並就醫。',
  },
  {
    id: 'persistent-abdominal-pain',
    title: '持續腹痛或強烈便意感',
    guidance: '不要只依網站判斷，直接聯絡產檢院所。',
  },
  {
    id: 'reduced-fetal-movement',
    title: '胎動明顯減少或和平常不同',
    guidance: '儘速聯絡產檢院所，由醫療人員評估。',
  },
  {
    id: 'preeclampsia-signs',
    title: '嚴重頭痛、視力改變或突然明顯水腫',
    guidance: '可能需要緊急評估，請立即聯絡產檢院所。',
  },
];
