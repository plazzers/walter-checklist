// Shrinks photos on the device before saving: longest side 1200px, JPEG quality 0.7.
const MAX_SIDE = 1200;
const QUALITY = 0.7;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That photo couldn't be opened. Please try a different one."));
    };
    img.src = url;
  });
}

export async function compressPhoto(file) {
  // Browsers turn the picture the right way up (EXIF orientation) when drawing it.
  const { img, url } = await loadImage(file);
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // transparent PNGs get a white background in JPEG
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
    canvas.width = canvas.height = 0; // free memory quickly on phones
    return { dataUrl, width: cw, height: ch };
  } finally {
    URL.revokeObjectURL(url);
  }
}
