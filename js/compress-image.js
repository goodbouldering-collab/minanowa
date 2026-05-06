// js/compress-image.js
// Vercel Serverless Function の body 上限 (4.5MB) を回避するため、
// 画像をブラウザ側でリサイズ・JPEG 再エンコードしてアップロードする共通ヘルパ。
// HEIC など createImageBitmap が扱えない形式は <img> 経由でフォールバック。
//
// グローバルに `compressImage(file)` を露出する。
// admin.html / index.html 両方の <head> から `<script src="/js/compress-image.js"></script>` で読み込む。
(function (global) {
  'use strict';
  const VERCEL_BODY_LIMIT = 4 * 1024 * 1024; // 4MB セーフマージン

  async function loadImageSource(file) {
    const bm = await createImageBitmap(file).catch(() => null);
    if (bm) return { source: bm, width: bm.width, height: bm.height, close: () => bm.close && bm.close() };
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('画像をデコードできません (対応形式: JPEG/PNG/WebP/HEIC)'));
        i.src = url;
      });
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }

  async function compressImage(file) {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      if (file.size > VERCEL_BODY_LIMIT) throw new Error('SVG/GIF はサイズが大きすぎます (' + (file.size / 1048576).toFixed(1) + 'MB > 4MB)');
      return file;
    }
    const src = await loadImageSource(file);
    const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
    let result = null;
    const passes = [[1920, 0.85], [1600, 0.78], [1280, 0.7], [960, 0.6]];
    for (const [maxDim, quality] of passes) {
      const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
      const w = Math.max(1, Math.round(src.width * scale));
      const h = Math.max(1, Math.round(src.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(src.source, 0, 0, w, h);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
      if (!blob) continue;
      result = blob;
      if (blob.size <= VERCEL_BODY_LIMIT) break;
    }
    src.close();
    if (!result) throw new Error('画像の圧縮に失敗しました');
    if (result.size > VERCEL_BODY_LIMIT) throw new Error('圧縮後も 4MB を超えています (' + (result.size / 1048576).toFixed(1) + 'MB)。より小さい画像を使用してください');
    if (result.size >= file.size && file.size <= VERCEL_BODY_LIMIT && file.type === 'image/jpeg') return file;
    return new File([result], baseName + '.jpg', { type: 'image/jpeg' });
  }

  global.compressImage = compressImage;
  global.VERCEL_BODY_LIMIT = VERCEL_BODY_LIMIT;
})(window);
