import { validatePhotoMeta } from './photo-store.js?v=41';
import { canonical } from './cloud-records.js?v=41';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const logicalId = value => typeof value === 'string' && value.length > 0 && value.length <= 100;
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const assetPath = /^[A-Za-z0-9][A-Za-z0-9._-]{0,511}\/(test|preview|production)\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/(original|thumbnail)\.jpg$/;
export function validatePhotoAssetPath(path, scope, manifestId, kind) {
  if (!assetPath.test(path) || !uuid(manifestId) || !['original', 'thumbnail'].includes(kind) || path !== `${scope.projectId}/${scope.environment}/${scope.uid.toLowerCase()}/${manifestId.toLowerCase()}/${kind}.jpg`) throw Error('invalid_photo_asset_path');
  return path;
}
export function validatePhotoDescriptor(value) {
  if (!value || !uuid(value.assetId) || !hash(value.sha256) || !Number.isSafeInteger(value.bytes) || value.bytes < 4 || value.bytes > 20_000_000 || value.mime !== 'image/jpeg' || Object.keys(value).some(key => !['assetId', 'sha256', 'bytes', 'mime', 'path'].includes(key))) throw Error('invalid_photo_asset');
  if (value.path !== undefined && (typeof value.path !== 'string' || !assetPath.test(value.path))) throw Error('invalid_photo_asset_path');
  return value;
}
export function validateWirePhoto(metadata) {
  if (!metadata || !logicalId(metadata.id) || ['createdAt', 'updatedAt'].some(key => typeof metadata[key] !== 'string' || !Number.isFinite(Date.parse(metadata[key]))) || Object.keys(metadata).some(key => !['id', 'date', 'category', 'pose', 'weight', 'waist', 'note', 'ownerType', 'ownerId', 'createdAt', 'updatedAt', 'original', 'thumbnail'].includes(key))) throw Error('invalid_photo_metadata');
  const validated = validatePhotoMeta(metadata);
  for (const [key, value] of Object.entries(validated)) if (canonical(metadata[key]) !== canonical(value)) throw Error('noncanonical_photo_metadata');
  validatePhotoDescriptor(metadata.original); validatePhotoDescriptor(metadata.thumbnail);
  if (metadata.original.assetId === metadata.thumbnail.assetId) throw Error('duplicate_photo_asset');
  return metadata;
}
export async function validatePhotoAsset(asset) {
  const { blob, ...descriptor } = asset ?? {};
  validatePhotoDescriptor(descriptor);
  if (!(blob instanceof Blob) || blob.type !== 'image/jpeg' || blob.size !== descriptor.bytes) throw Error('invalid_photo_asset_bytes');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) throw Error('invalid_photo_jpeg');
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  if (digest !== descriptor.sha256) throw Error('photo_asset_hash_mismatch');
  return asset;
}
// Input is the JPEG pair already compressed by Tracker. No decoding/recompression.
export async function preparePhoto(record) {
  const meta = validatePhotoMeta(record);
  if (!logicalId(record.id) || ['createdAt', 'updatedAt'].some(key => typeof record[key] !== 'string' || !Number.isFinite(Date.parse(record[key])))) throw Error('invalid_photo_metadata');
  const assets = await Promise.all([record.blob, record.thumbnail].map(async blob => {
    if (!(blob instanceof Blob) || blob.type !== 'image/jpeg' || blob.size < 4 || blob.size > 20_000_000) throw Error('invalid_photo_jpeg');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) throw Error('invalid_photo_jpeg');
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
    return { assetId: crypto.randomUUID(), sha256, bytes: blob.size, mime: 'image/jpeg', blob };
  }));
  const descriptor = ({ blob, ...rest }) => rest;
  const metadata = { id: record.id, ...meta, createdAt: record.createdAt, updatedAt: record.updatedAt, original: descriptor(assets[0]), thumbnail: descriptor(assets[1]) };
  validateWirePhoto(metadata); return { metadata, assets };
}
export function createAccountPhotos({ store, scope, guard = () => {} }) {
  const wireRecord = (record, current) => {
    const { blob, ...metadata } = record;
    if (metadata.thumbnail instanceof Blob || metadata.thumbnail === null) {
      if (!current) throw Error('photo_missing');
      metadata.thumbnail = current.thumbnail;
    }
    validateWirePhoto(metadata); return metadata;
  };
  const act = async (operation, record, expectedPhotos, selector) => {
    guard(); const snapshot = await store.captureSnapshot(scope), before = snapshot.workspace;
    const current = await store.photoSnapshot(scope); guard();
    const reviewed = expectedPhotos?.map(previous => wireRecord(previous, current.find(meta => meta.id === previous.id)));
    const prepared = record ? await preparePhoto(record) : {};
    guard(); return store.commitPhoto(scope, { operation, ...prepared, expectedPhotos: reviewed, ...(selector ? { selector } : {}) }, before.localRevision);
  };
  return {
    list: () => { guard(); return store.listPhotos(scope); },
    listMetadata: () => { guard(); return store.photoSnapshot(scope); },
    getThumbnail: async id => { guard(); const photo = await store.getPhoto(scope, id); guard(); return photo?.thumbnail ?? null; },
    get: id => { guard(); return store.getPhoto(scope, id); },
    put: record => act('put', record, []),
    update: async (previous, meta, updatedAt) => {
      guard(); const row = await store.read(scope), current = await store.photoSnapshot(scope); guard();
      const reviewed = wireRecord(previous, current.find(item => item.id === previous.id)), metadata = { ...reviewed, ...validatePhotoMeta(meta), updatedAt };
      return store.commitPhoto(scope, { operation: 'update', metadata, assets: [], expectedPhotos: [reviewed] }, row.localRevision);
    },
    replace: (record, expectedPhotos, selector) => act('replace', record, expectedPhotos, selector),
    deleteDaily: async (previousJournal, expectedPhotos) => {
      guard();const row=await store.read(scope),current=await store.photoSnapshot(scope);guard();
      const reviewed=expectedPhotos?.map(previous=>wireRecord(previous,current.find(meta=>meta.id===previous.id)));
      return store.commitPhoto(scope,{operation:'delete-daily',journalBefore:structuredClone(previousJournal),expectedPhotos:reviewed},row.localRevision);
    },
    delete: async previous => {
      guard(); const row = await store.read(scope), current = await store.photoSnapshot(scope); guard();
      const reviewed = wireRecord(previous, current.find(item => item.id === previous.id));
      return store.commitPhoto(scope, { operation: 'delete', id: previous.id, expectedPhotos: [reviewed] }, row.localRevision);
    }
  };
}
