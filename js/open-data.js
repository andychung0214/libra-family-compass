function normaliseFacility(row) {
  if (!row || typeof row !== 'object') return null;
  const name = String(row.name ?? row['機構名稱'] ?? '').trim();
  if (!name) return null;
  const capacity = Number(row.capacity ?? row['收托人數']);

  return {
    type: String(row.type ?? row['機構類型'] ?? '').trim(),
    name,
    capacity: Number.isFinite(capacity) && capacity >= 0 ? capacity : null,
    address: String(row.address ?? row['地址'] ?? '').trim(),
    phone: String(row.phone ?? row['電話'] ?? '').trim(),
  };
}

function parseCsvRows(source) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

export function parseFacilityCsv(source) {
  const records = parseCsvRows(String(source ?? '').replace(/^\uFEFF/, ''));
  const headers = records.shift()?.map((header) => header.trim()) ?? [];
  return records.flatMap((values) => {
    const raw = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const facility = normaliseFacility(raw);
    return facility ? [facility] : [];
  });
}

function fallbackResult(fallback, message = '目前使用有日期標示的本機備援資料。') {
  return {
    rows: fallback,
    mode: 'fallback',
    message,
    fetchedAt: null,
  };
}

export async function loadOpenData({
  fetchFn = fetch,
  url,
  fallback,
  timeoutMs = 6000,
}) {
  if (!url) {
    return fallbackResult(
      fallback,
      '官方端點有跨來源限制，目前使用有日期標示的本機備援資料。',
    );
  }

  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchFn(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json, text/csv;q=0.9' },
      }),
      timeout,
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers?.get?.('content-type') ?? '';
    let rows;
    if (contentType.includes('text/csv')) {
      rows = parseFacilityCsv(await response.text());
    } else {
      const payload = await response.json();
      const rawRows = payload?.result?.results ?? payload?.results ?? payload;
      rows = Array.isArray(rawRows)
        ? rawRows.map(normaliseFacility).filter(Boolean)
        : [];
    }

    if (!rows.length) throw new Error('invalid data');
    return {
      rows,
      mode: 'live',
      message: '已載入臺北市資料大平臺最新公開資料。',
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return fallbackResult(fallback);
  } finally {
    clearTimeout(timer);
  }
}
