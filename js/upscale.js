export async function processUpscale(img, factor) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth * factor;
        const height = img.naturalHeight * factor;
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
}
