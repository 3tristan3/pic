export function validateInput(fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("请先选择图片文件！"); return false;
    }
    return true;
}
export function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    if(show) document.getElementById('preview-area').style.display = 'none';
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
export function displayResult(originalFile, originalImg, resultBlob, outputExt) {
    document.getElementById('img-orig').src = originalImg.src;
    document.getElementById('stats-orig').innerText = `${(originalFile.size / 1024).toFixed(1)} KB | ${originalImg.naturalWidth}x${originalImg.naturalHeight}`;
    
    const resUrl = URL.createObjectURL(resultBlob);
    const resImg = document.getElementById('img-res');
    resImg.onload = () => {
        document.getElementById('stats-res').innerText = `${(resultBlob.size / 1024).toFixed(1)} KB | ${resImg.naturalWidth}x${resImg.naturalHeight}`;
    };
    resImg.src = resUrl;
    
    const btn = document.getElementById('btn-download');
    btn.href = resUrl;
    btn.download = `processed_${new Date().getTime()}.${outputExt}`;
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('preview-area').style.display = 'flex';
}
