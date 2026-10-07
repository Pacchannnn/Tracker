import { validatePhotoMeta } from './photo-store.js?v=38';

const FORMAT = 'tracker-photo-backup';
const MAX_IMAGE_BYTES = 20_000_000;
const MAX_TOTAL_BYTES = 200_000_000;

function imageBytes(value) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[1].length % 4 !== 0) throw new Error('Dữ liệu ảnh trong bản sao không hợp lệ.');
  const bytes = (match[1].length / 4) * 3 - (match[1].endsWith('==') ? 2 : match[1].endsWith('=') ? 1 : 0);
  if (!bytes || bytes > MAX_IMAGE_BYTES) throw new Error('Một ảnh trong bản sao quá lớn hoặc rỗng.');
  return bytes;
}

function decodeImage(value) {
  imageBytes(value);
  let binary;
  try { binary = atob(value.slice('data:image/jpeg;base64,'.length)); }
  catch { throw new Error('Dữ liệu ảnh không giải mã được.'); }
  const bytes = Uint8Array.from(binary, letter => letter.charCodeAt(0));
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) throw new Error('Ảnh JPEG trong bản sao bị hỏng.');
  return new Blob([bytes], { type: 'image/jpeg' });
}

async function encodeImage(blob) {
  if (!(blob instanceof Blob) || blob.type !== 'image/jpeg' || !blob.size || blob.size > MAX_IMAGE_BYTES) throw new Error('Ảnh lưu cục bộ không hợp lệ để xuất.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 16_384) binary += String.fromCharCode(...bytes.subarray(index, index + 16_384));
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

export function photoBackupSummary(photos) {
  return { count: photos.length, bytes: photos.reduce((sum, item) => sum + (typeof item.blob === 'string' ? imageBytes(item.blob) : item.blob.size) + (typeof item.thumbnail === 'string' ? imageBytes(item.thumbnail) : item.thumbnail.size), 0) };
}

export async function createPhotoBackup(records) {
  const summary = photoBackupSummary(records);
  if (summary.bytes > MAX_TOTAL_BYTES) throw new Error('Kho ảnh vượt 200 MB. Bản sao ảnh dạng JSON hiện chưa hỗ trợ dung lượng này.');
  const photos = [];
  for (const item of records) photos.push({ ...item, blob: await encodeImage(item.blob), thumbnail: await encodeImage(item.thumbnail) });
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), photos });
}

export function parsePhotoBackup(text) {
  let raw;
  try { raw = JSON.parse(text); }
  catch { throw new Error('File ảnh không phải JSON hợp lệ.'); }
  if (raw?.format !== FORMAT || raw.version !== 1 || !Array.isArray(raw.photos)) throw new Error('File không phải bản sao ảnh Tracker phiên bản hỗ trợ.');
  if (typeof raw.exportedAt !== 'string' || !Number.isFinite(Date.parse(raw.exportedAt))) throw new Error('Thời điểm xuất ảnh không hợp lệ.');
  const ids = new Set();
  let total = 0;
  const photos = raw.photos.map(item => {
    if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 100 || ids.has(item.id)) throw new Error('ID ảnh trùng hoặc không hợp lệ.');
    ids.add(item.id);
    const meta = validatePhotoMeta(item);
    if (typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)) || typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt))) throw new Error('Thời điểm ảnh không hợp lệ.');
    total += imageBytes(item.blob) + imageBytes(item.thumbnail);
    if (total > MAX_TOTAL_BYTES) throw new Error('Bản sao ảnh vượt 200 MB.');
    return { id: item.id, ...meta, createdAt: item.createdAt, updatedAt: item.updatedAt, blob: decodeImage(item.blob), thumbnail: decodeImage(item.thumbnail) };
  });
  return { exportedAt: raw.exportedAt, photos, bytes: total };
}
