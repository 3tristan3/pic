// js/utils.js

export function validateInput(fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("请先选择图片文件！");
        return false;
    }
    return true;
}

export function showLoading(show) {
    const loading = document.getElementById('loading');
    const preview = document.getElementById('preview-area');
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (show && preview) preview.style.display = 'none';
}

export function fileToImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => resolve({ img, url });
        img.onerror = () => reject(new Error("图片加载失败"));
    });
}

export function displayResult(originalFile, originalImg, resultBlob, outputExt, customName = '') {
    // 1. 显示原图信息
    const statsOrig = document.getElementById('stats-orig');
    const imgOrig = document.getElementById('img-orig');
    if (imgOrig && statsOrig) {
        imgOrig.src = originalImg.src;
        statsOrig.innerText = `${(originalFile.size / 1024).toFixed(1)} KB | ${originalImg.naturalWidth}x${originalImg.naturalHeight}`;
    }
    
    // 2. 显示结果图
    const resUrl = URL.createObjectURL(resultBlob);
    const resImg = document.getElementById('img-res');
    
    if (resImg) {
        resImg.onload = () => {
            const statsRes = document.getElementById('stats-res');
            if (statsRes) {
                statsRes.innerText = `${(resultBlob.size / 1024).toFixed(1)} KB | ${resImg.naturalWidth}x${resImg.naturalHeight}`;
            }
        };
        resImg.src = resUrl;
    }
    
    // 3. 设置下载链接与文件名
    const btn = document.getElementById('btn-download');
    if (btn) {
        btn.href = resUrl;
        
        // 获取当前时间字符串 (例如: 20231027_153022)
        const now = new Date();
        const timeStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;

        if (customName && customName.trim() !== '') {
            btn.download = `${customName.trim()}.${outputExt}`;
        } else {
            btn.download = `图片压缩-${timeStr}.${outputExt}`;
        }
    }
    
    // 4. 显示区域
    const loading = document.getElementById('loading');
    const preview = document.getElementById('preview-area');
    if (loading) loading.style.display = 'none';
    if (preview) preview.style.display = 'flex';
}
