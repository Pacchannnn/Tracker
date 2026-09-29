import { validDate } from './data.js';

export const PHOTO_CATEGORIES = [
  { value: 'daily', label: 'Nhật ký ngày' },
  { value: 'progress', label: 'Tiến độ cơ thể' },
  { value: 'gym', label: 'Buổi tập' },
  { value: 'food', label: 'Món ăn' },
  { value: 'other', label: 'Khác' }
];
export const PHOTO_POSES = [
  { value: '', label: 'Không ghi' },
  { value: 'front', label: 'Trước' },
  { value: 'side', label: 'Bên' },
  { value: 'back', label: 'Sau' }
];

export function validatePhotoMeta(raw) {
  if (!validDate(raw.date)) throw new Error('Ngày ảnh không hợp lệ.');
  const category = String(raw.category || '');
  if (!PHOTO_CATEGORIES.some(item => item.value === category)) throw new Error('Loại ảnh không hợp lệ.');
  const pose = String(raw.pose || '');
  if (!PHOTO_POSES.some(item => item.value === pose)) throw new Error('Góc chụp không hợp lệ.');
  const measure = (value, label) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 1000) throw new Error(`${label} phải là số hợp lệ.`);
    return number;
  };
  const note = String(raw.note || '').trim();
  if (note.length > 1000) throw new Error('Ghi chú ảnh quá dài.');
  return { date: raw.date, category, pose, weight: measure(raw.weight, 'Cân nặng'), waist: measure(raw.waist, 'Vòng eo'), note };
}

export function validatePhotoFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chọn ảnh JPG, PNG hoặc WebP.');
  if (!file.size || file.size > 20_000_000) throw new Error('Ảnh phải nhỏ hơn 20 MB.');
}

const DB_NAME = 'tracker-photos';
const STORE = 'photos';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Trình duyệt không hỗ trợ lưu ảnh cục bộ (IndexedDB).')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Không mở được kho ảnh cục bộ.'));
  });
}

async function transaction(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result;
      try { result = action(tx.objectStore(STORE)); }
      catch (error) { tx.abort(); reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(new Error('Kho ảnh gặp lỗi khi đọc hoặc lưu.'));
      tx.onabort = () => reject(new Error('Thao tác ảnh đã bị hủy. Có thể trình duyệt đã hết dung lượng.'));
    });
  } finally { db.close(); }
}

const requestResult = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('Không đọc được ảnh cục bộ.'));
});

export async function listPhotos() {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const promise = requestResult(tx.objectStore(STORE).getAll());
      tx.oncomplete = () => promise.then(resolve, reject);
      tx.onerror = () => reject(new Error('Không đọc được kho ảnh cục bộ.'));
    });
  } finally { db.close(); }
}

export async function getPhoto(id) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const promise = requestResult(tx.objectStore(STORE).get(id));
      tx.oncomplete = () => promise.then(resolve, reject);
      tx.onerror = () => reject(new Error('Không đọc được ảnh cục bộ.'));
    });
  } finally { db.close(); }
}

export async function putPhoto(record) {
  await transaction('readwrite', store => store.put(record));
}

export async function deletePhoto(id) {
  await transaction('readwrite', store => store.delete(id));
}

export async function updatePhotoIfUnchanged(previous, meta, updatedAt) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const request = store.get(previous.id);
      request.onsuccess = () => {
        if (!request.result || request.result.updatedAt !== previous.updatedAt) { tx.abort(); return; }
        store.put({ ...request.result, ...meta, updatedAt });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Không lưu được thay đổi ảnh.'));
      tx.onabort = () => reject(new Error('Ảnh đã đổi ở tab khác. Hãy mở lại.'));
    });
  } finally { db.close(); }
}

export async function deletePhotoIfUnchanged(previous) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const request = store.get(previous.id);
      request.onsuccess = () => {
        if (!request.result || request.result.updatedAt !== previous.updatedAt) { tx.abort(); return; }
        store.delete(previous.id);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Không xóa được ảnh.'));
      tx.onabort = () => reject(new Error('Ảnh đã đổi ở tab khác. Hãy mở lại.'));
    });
  } finally { db.close(); }
}

export async function deleteDailyPhotos(date) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      let removed = 0;
      const cursor = tx.objectStore(STORE).openCursor();
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current) return;
        if (current.value.category === 'daily' && current.value.date === date) { current.delete(); removed++; }
        current.continue();
      };
      tx.oncomplete = () => resolve(removed);
      tx.onerror = () => reject(new Error('Không dọn được ảnh của nhật ký.'));
      tx.onabort = () => reject(new Error('Không dọn được ảnh của nhật ký.'));
    });
  } finally { db.close(); }
}

export async function addMissingPhotos(records) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      let added = 0;
      for (const item of records) {
        const request = store.get(item.id);
        request.onsuccess = () => { if (!request.result) { store.add(item); added++; } };
      }
      tx.oncomplete = () => resolve({ added, skipped: records.length - added });
      tx.onerror = () => reject(new Error('Không nhập được ảnh vào kho cục bộ.'));
      tx.onabort = () => reject(new Error('Không nhập được ảnh; có thể trình duyệt hết dung lượng. Không ảnh nào trong lô này được thêm.'));
    });
  } finally { db.close(); }
}

function jpeg(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Không nén được ảnh.')), 'image/jpeg', quality));
}

export async function compressPhoto(file) {
  validatePhotoFile(file);
  if (typeof createImageBitmap !== 'function') throw new Error('Trình duyệt không hỗ trợ xử lý ảnh này.');
  const bitmap = await createImageBitmap(file);
  try {
    const draw = maxEdge => {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas;
    };
    return { blob: await jpeg(draw(1800), .82), thumbnail: await jpeg(draw(320), .72) };
  } finally { bitmap.close(); }
}
