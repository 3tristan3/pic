// js/canvas-resize.js

export async function processCanvasResize(img, targetWidth, targetHeight, mode) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // 默认填充白色背景 (防止透明图出现黑底)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        const scaleX = targetWidth / imgW;
        const scaleY = targetHeight / imgH;

        let drawX = 0, drawY = 0, drawW = imgW, drawH = imgH;

        // --- 核心算法：计算绘制位置和大小 ---
        if (mode === 'stretch') {
            // 1. 强制拉伸：直接填满
            drawW = targetWidth;
            drawH = targetHeight;
        } 
        else if (mode === 'contain') {
            // 2. 包含 (留白)：取较小的缩放比，保证图片全部显示
            const scale = Math.min(scaleX, scaleY);
            drawW = imgW * scale;
            drawH = imgH * scale;
            // 居中计算
            drawX = (targetWidth - drawW) / 2;
            drawY = (targetHeight - drawH) / 2;
        } 
        else if (mode === 'cover') {
            // 3. 覆盖 (裁切)：取较大的缩放比，保证填满画布
            const scale = Math.max(scaleX, scaleY);
            drawW = imgW * scale;
            drawH = imgH * scale;
            // 居中计算
            drawX = (targetWidth - drawW) / 2;
            drawY = (targetHeight - drawH) / 2;
        }

        // 开启高质量平滑
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 绘制图片
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // 输出为 JPG (体积小，通用)
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
}
