import { listPhotos, ownedPhotos, compressPhoto, replaceOwnedPhoto, deleteOwnedPhotos, validatePhotoMeta } from './photo-store.js?v=19';
import { localDate } from './data.js?v=19';

export function createNutritionPhotos({ helpers, render, registerUrl, ownerExists }) {
  const { node, button, div, p, id, message, confirmAction } = helpers;
  return function photoCard(ownerType, ownerId, name) {
    const box = div('nutrition-photo');
    const preview = div('nutrition-photo-preview');
    const input = node('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': `Chọn ảnh ${name}` });
    const upload = button('Thêm / thay ảnh', () => input.click());
    input.hidden = true;
    input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return;
      upload.disabled = true;
      try {
        const images = await compressPhoto(file);
        if (!ownerExists(ownerType, ownerId)) throw new Error('Món/công thức đã bị xóa. Mở lại thư viện.');
        const now = new Date().toISOString();
        const record = { id: id(), ...validatePhotoMeta({ date: localDate(), category: 'food', ownerType, ownerId, note: name }), ...images, createdAt: now, updatedAt: now };
        const previous = ownedPhotos(await listPhotos(), ownerType, ownerId);
        const save = async () => { try {
          if (!ownerExists(ownerType, ownerId)) throw new Error('Món/công thức đã bị xóa. Mở lại thư viện.');
          await replaceOwnedPhoto(record, previous); render(); message('Đã lưu ảnh cục bộ. Macro và bữa đã ghi không thay đổi.');
        } catch (error) { message(error.message, true); } };
        if (previous.length) confirmAction(`Thay ảnh của ${name}? Ảnh cũ của món này sẽ được gỡ. Hãy xuất bản sao ảnh nếu muốn giữ.`, save);
        else await save();
      } catch (error) { message(error.message, true); }
      finally { upload.disabled = false; input.value = ''; }
    });
    box.append(preview, input, upload);
    listPhotos().then(records => {
      if (!box.isConnected) return;
      const photos = ownedPhotos(records, ownerType, ownerId);
      if (!photos.length) { preview.append(p('Chưa có ảnh món này.', 'hint')); return; }
      const latest = photos.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const url = URL.createObjectURL(latest.thumbnail); registerUrl(url);
      preview.append(node('img', { src: url, alt: `Ảnh ${name}`, class: 'food-thumbnail', loading: 'lazy' }));
      box.append(button('Gỡ ảnh', () => confirmAction(`Gỡ ${photos.length} ảnh của ${name}? Nội dung món và nhật ký ăn giữ nguyên.`, async () => {
        try { await deleteOwnedPhotos(ownerType, ownerId, photos); render(); message('Đã gỡ ảnh món.'); } catch (error) { message(error.message, true); }
      }), 'danger'));
    }).catch(error => { if (box.isConnected) preview.append(p(error.message, 'notice error')); });
    return box;
  };
}
