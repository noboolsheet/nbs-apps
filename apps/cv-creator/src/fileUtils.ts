import { FilePayload } from './api';

// Convierte un File en el payload que espera la API: texto plano como textContent;
// PDF/imagen/Word como base64 + mimeType + fileName (el server extrae el texto de Word).
export async function fileToPayload(file: File): Promise<FilePayload> {
  const lower = file.name.toLowerCase();
  const isText = file.type.startsWith('text/') || /\.(txt|md|csv)$/.test(lower);
  if (isText) {
    return { textContent: await file.text(), fileName: file.name };
  }
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
  reader.readAsDataURL(file);
  const fileBase64 = await base64Promise;
  return { fileBase64, mimeType: file.type || 'application/pdf', fileName: file.name };
}

// Redimensiona una imagen a un cuadrado pequeño (data URL, JPEG) para no inflar la BD.
export function resizeImageToDataUrl(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
