export const STORAGE_PREFIX = 'libraFamilyCompass:v1:';

export function createStorage(storageLike, onError = () => {}) {
  const keyFor = (key) => `${STORAGE_PREFIX}${key}`;

  return {
    load(key, fallback) {
      try {
        const rawValue = storageLike.getItem(keyFor(key));
        return rawValue === null ? fallback : JSON.parse(rawValue);
      } catch {
        onError('本機資料無法讀取，已使用安全預設值。');
        return fallback;
      }
    },

    save(key, value) {
      try {
        storageLike.setItem(keyFor(key), JSON.stringify(value));
        return true;
      } catch {
        onError('此裝置目前無法保存變更。');
        return false;
      }
    },

    removeAll() {
      try {
        const keys = [];
        for (let index = 0; index < storageLike.length; index += 1) {
          const key = storageLike.key(index);
          if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
        }
        for (const key of keys) storageLike.removeItem(key);
        return true;
      } catch {
        onError('本機資料無法完整清除，請檢查瀏覽器儲存設定。');
        return false;
      }
    },
  };
}
