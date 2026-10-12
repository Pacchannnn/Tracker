import { listPhotos, ownedPhotos, compressPhoto, replaceOwnedPhoto, deleteOwnedPhotos, validatePhotoMeta } from './photo-store.js?v=41';
import { localDate } from './data.js?v=41';

export function createNutritionPhotos({ helpers, render, registerUrl, ownerExists, captureGuard = () => () => {}, storage = {} }) {
  const {listPhotos:readPhotos=listPhotos,ownedPhotos:selectPhotos=ownedPhotos,compressPhoto:compress=compressPhoto,replaceOwnedPhoto:replace=replaceOwnedPhoto,deleteOwnedPhotos:remove=deleteOwnedPhotos,validatePhotoMeta:validate=validatePhotoMeta,downloadPhoto} = storage;
  const { node, button, div, p, id, message, confirmAction } = helpers;
  return function photoCard(ownerType, ownerId, name) {
    const guard = captureGuard();
    guard();
    const box = div('nutrition-photo');
    const preview = div('nutrition-photo-preview');
    const input = node('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': `Chọn ảnh ${name}` });
    const upload = button('Thêm / thay ảnh', () => input.click());
    input.hidden = true;
    input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return;
      upload.disabled = true;
      try {
        guard();
        const images = await compress(file);
        guard();
        if (!ownerExists(ownerType, ownerId)) throw new Error('Món/công thức đã bị xóa. Mở lại thư viện.');
        const now = new Date().toISOString();
        const record = { id: id(), ...validate({ date: localDate(), category: 'food', ownerType, ownerId, note: name }), ...images, createdAt: now, updatedAt: now };
        const previous = selectPhotos(await readPhotos(), ownerType, ownerId);
        guard();
        const save = async () => { try {
          guard();
          if (!ownerExists(ownerType, ownerId)) throw new Error('Món/công thức đã bị xóa. Mở lại thư viện.');
          await replace(record, previous, guard); guard(); render(); message('Đã lưu ảnh trên thiết bị. Macro và bữa đã ghi không thay đổi.');
        } catch (error) { message(error.message, true); } };
        if (previous.length) confirmAction(`Thay ảnh của ${name}? Ảnh cũ của món này sẽ được gỡ. Hãy xuất bản sao ảnh nếu muốn giữ.`, save);
        else await save();
      } catch (error) { message(error.message, true); }
      finally { upload.disabled = false; input.value = ''; }
    });
    box.append(preview, input, upload);
    readPhotos().then(records => {
      if (!box.isConnected) return;
      guard();
      const photos = selectPhotos(records, ownerType, ownerId);
      if (!photos.length) { preview.append(p('Chưa có ảnh món này.', 'hint')); return; }
      const latest = photos.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if(latest.thumbnail){const url = URL.createObjectURL(latest.thumbnail); registerUrl(url);
        preview.append(node('img', { src: url, alt: `Ảnh ${name}`, class: 'food-thumbnail', loading: 'lazy' }));}
      else {preview.append(p('Ảnh chưa có trên thiết bị này.','hint'));if(downloadPhoto)preview.append(button('Tải ảnh về thiết bị',async()=>{try{guard();await downloadPhoto(latest.id);guard();render();}catch{message('Chưa tải được ảnh. Đăng nhập và kiểm tra kết nối.',true);}}));}
      box.append(button('Gỡ ảnh', () => confirmAction(`Gỡ ${photos.length} ảnh của ${name}? Nội dung món và nhật ký ăn giữ nguyên.`, async () => {
        try { guard(); await remove(ownerType, ownerId, photos, guard); guard(); render(); message('Đã gỡ ảnh món.'); } catch (error) { message(error.message, true); }
      }), 'danger'));
    }).catch(error => { if (box.isConnected) preview.append(p(error.message, 'notice error')); });
    return box;
  };
}
