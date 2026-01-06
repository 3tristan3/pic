// js/stitch.js

export async function processStitch(images, mode, gap) {
    return new Promise((resolve, reject) => {
        if (!images || images.length === 0) {
            reject(new Error("没有图片"));
            return;
        }

        // 1. 计算总尺寸
        let totalWidth = 0;
        let totalHeight = 0;
        
        // 我们以第一张图的宽度为基准 (竖向模式) 或 高度为基准 (横向模式)
        const baseWidth = images[0].naturalWidth;
        const baseHeight = images[0].naturalHeight;

        // 存储处理后的每张图的绘制参数 {img, x, y, w, h}
        const drawData = [];

        if (mode === 'vertical') {
            // --- 竖向拼接 ---
            // 所有图片缩放到 baseWidth 宽度，高度按比例自适应
            let currentY = 0;
            
            images.forEach((img, i) => {
                const scale = baseWidth / img.naturalWidth;
                const h = img.naturalHeight * scale;
                
                drawData.push({ img, x: 0, y: currentY, w: baseWidth, h: h });
                
                currentY += h;
                // 除了最后一张，都要加间距
                if (i < images.length - 1) currentY += gap;
            });

            totalWidth = baseWidth;
            totalHeight = currentY;
        } 
        else if (mode === 'horizontal') {
            // --- 横向拼接 ---
            // 所有图片缩放到 baseHeight 高度，宽度按比例自适应
            let currentX = 0;
            
            images.forEach((img, i) => {
                const scale = baseHeight / img.naturalHeight;
                const w = img.naturalWidth * scale;
                
                drawData.push({ img, x: currentX, y: 0, w: w, h: baseHeight });
                
                currentX += w;
                if (i < images.length - 1) currentX += gap;
            });

            totalWidth = currentX;
            totalHeight = baseHeight;
        }
        else if (mode === 'grid') {
            // --- 宫格拼接 (简易版：列数自动计算，类似朋友圈) ---
            // 强制正方形裁剪，统一尺寸
            const cols = images.length === 4 ? 2 : 3; // 4张图用2列，其他用3列
            const size = 1000; // 统一定义格子的分辨率
            
            let currentX = 0;
            let currentY = 0;
            
            images.forEach((img, i) => {
                const colIndex = i % cols;
                const rowIndex = Math.floor(i / cols);
                
                const x = colIndex * (size + gap);
                const y = rowIndex * (size + gap);
                
                // 计算裁切参数 (Cover模式)
                const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
                const w = img.naturalWidth * scale;
                const h = img.naturalHeight * scale;
                const offsetX = (size - w) / 2;
                const offsetY = (size - h) / 2;

                // 这里比较复杂，我们先存原始图，绘制时再裁切
                drawData.push({ 
                    img, x: x, y: y, w: size, h: size, 
                    isGrid: true, // 标记需要裁切
                    sx: -offsetX / scale, sy: -offsetY / scale, 
                    sw: size / scale, sh: size / scale 
                });

                // 更新总宽高
                totalWidth = Math.max(totalWidth, x + size);
                totalHeight = Math.max(totalHeight, y + size);
            });
        }

        // 2. 创建 Canvas 并绘制
        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');

        // 填充背景色 (间距的颜色，默认白色)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        // 高质量绘制
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        drawData.forEach(d => {
            if (d.isGrid) {
                // 宫格模式：裁切绘制
                ctx.drawImage(d.img, d.sx, d.sy, d.sw, d.sh, d.x, d.y, d.w, d.h);
            } else {
                // 普通模式：拉伸绘制
                ctx.drawImage(d.img, d.x, d.y, d.w, d.h);
            }
        });

        // 3. 导出
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.92);
    });
}
