/**
 * The backend accepts only real JPEG/PNG bytes (checked by file signature). Images in any
 * other format (WebP, AVIF, GIF, BMP, HEIC/HEIF, or a mislabeled extension) are re-encoded
 * to JPEG in the browser before upload. Real JPEG/PNG files and PDFs pass through unchanged.
 */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'avif', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'ico'];
const MAX_SIDE = 4000;
const HEIC2ANY_URL = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
export const isImageFile = (file: File) => file.type.startsWith('image/') || IMAGE_EXTENSIONS.includes(extensionOf(file.name));

async function signature(file: File): Promise<'jpg' | 'png' | 'pdf' | 'heic' | 'other'> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'png';
  if (String.fromCharCode(...b.slice(0, 5)) === '%PDF-') return 'pdf';
  const brand = String.fromCharCode(...b.slice(4, 12));
  if (/^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return 'heic';
  return 'other';
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'anh';

type Heic2Any = (o: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>;
let heicLoader: Promise<Heic2Any> | undefined;
function loadHeic2any(): Promise<Heic2Any> {
  const w = window as unknown as { heic2any?: Heic2Any };
  heicLoader ??= new Promise<Heic2Any>((resolve, reject) => {
    if (w.heic2any) { resolve(w.heic2any); return; }
    const script = document.createElement('script');
    script.src = HEIC2ANY_URL; script.async = true;
    script.onload = () => (w.heic2any ? resolve(w.heic2any) : reject(new Error('heic2any')));
    script.onerror = () => { heicLoader = undefined; reject(new Error('heic2any')); };
    document.head.appendChild(script);
  });
  return heicLoader;
}

async function decode(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try { return await createImageBitmap(blob); }
  catch {
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url;
      });
    } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  }
}

async function toJpeg(source: Blob, name: string): Promise<File> {
  const image = await decode(source);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); // transparent areas → white, not black
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if ('close' in image) image.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('encode');
  return new File([blob], `${baseName(name)}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

/** Returns an upload-ready file; throws a Vietnamese message if the image cannot be read. */
export async function normalizeImage(file: File): Promise<File> {
  const kind = await signature(file);
  if (kind === 'jpg') return new File([file], `${baseName(file.name)}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
  if (kind === 'png') return new File([file], `${baseName(file.name)}.png`, { type: 'image/png', lastModified: file.lastModified });
  if (kind === 'pdf') return file;
  try {
    if (kind === 'heic' || ['heic', 'heif'].includes(extensionOf(file.name))) {
      try { return await toJpeg(file, file.name); } // Safari decodes HEIC natively.
      catch {
        const out = await (await loadHeic2any())({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        return await toJpeg(Array.isArray(out) ? out[0] : out, file.name);
      }
    }
    return await toJpeg(file, file.name);
  } catch {
    throw new Error('Không đọc được ảnh này. Hãy mở ảnh và lưu lại dưới dạng JPG hoặc PNG rồi thử lại.');
  }
}
