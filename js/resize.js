export async function processResize(img, targetKB) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth, height = img.naturalHeight;
        let quality = 0.9;
        const run = () => {
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if ((blob.size / 1024) <= targetKB || width < 200) resolve(blob);
                else {
                    if (quality > 0.5) quality -= 0.1;
                    else { width *= 0.8; height *= 0.8; }
                    run();
                }
            }, 'image/jpeg', quality);
        };
        run();
    });
}
