// js/crop.js

let cropperInstance = null;

export function initCropper(imgElement, aspectRatio) {
    if (cropperInstance) cropperInstance.destroy();
    cropperInstance = new Cropper(imgElement, {
        aspectRatio: aspectRatio,
        viewMode: 1, dragMode: 'move', autoCropArea: 0.8,
        restore: false, guides: true, center: true, highlight: false,
        cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false,
    });
}

export function setCropRatio(ratio) {
    if (cropperInstance) cropperInstance.setAspectRatio(ratio);
}

// 修改点：接收 format 参数
export function getCroppedBlob(format = 'image/jpeg') {
    return new Promise((resolve, reject) => {
        if (!cropperInstance) { reject(new Error("未初始化")); return; }
        
        // 如果是 PNG，背景留空(透明)；如果是 JPG，背景填白
        const fillColor = format === 'image/png' ? 'transparent' : '#fff';

        const canvas = cropperInstance.getCroppedCanvas({ 
            fillColor: fillColor, 
            imageSmoothingEnabled: true, 
            imageSmoothingQuality: 'high' 
        });
        
        if (!canvas) { reject(new Error("裁剪失败")); return; }
        
        // 使用指定的 format 导出
        canvas.toBlob((blob) => resolve(blob), format, 0.95);
    });
}
