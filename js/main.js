// js/main.js

import { validateInput, showLoading, fileToImage, displayResult } from './utils.js';
import { processResize } from './resize.js';
import { processConvert } from './convert.js';
import { processUpscale } from './upscale.js';
import { processBatch } from './batch.js';
import { initCropper, getCroppedBlob, setCropRatio } from './crop.js';

// --- 全局变量：存储批量上传的文件 ---
let globalBatchFiles = [];

// --- Tab 切换逻辑 ---
const tabs = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.tool-section');
tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // 清理界面
        showLoading(false);
        document.getElementById('preview-area').style.display = 'none';
        document.getElementById('batch-progress').style.display = 'none';
        // 恢复裁剪Tab隐藏的原图
        document.getElementById('card-orig').style.display = 'block';
    });
});

// ============================================================
// 0. 弹窗与图片库管理逻辑
// ============================================================

// 打开弹窗
document.getElementById('btn-open-modal').addEventListener('click', () => {
    document.getElementById('upload-modal').style.display = 'flex';
    renderThumbnails();
});

// 关闭弹窗
function closeModal() {
    document.getElementById('upload-modal').style.display = 'none';
}
document.getElementById('btn-close-modal-x').addEventListener('click', closeModal);
document.getElementById('btn-close-modal').addEventListener('click', closeModal);
document.getElementById('btn-confirm-modal').addEventListener('click', closeModal);

// 添加图片
document.getElementById('btn-add-files').addEventListener('click', () => {
    document.getElementById('real-file-input').click();
});

// 监听 Input
document.getElementById('real-file-input').addEventListener('change', function() {
    if (this.files && this.files.length > 0) {
        globalBatchFiles = [...globalBatchFiles, ...Array.from(this.files)];
        updateFileCount();
        renderThumbnails();
        this.value = ''; 
    }
});

function updateFileCount() {
    document.getElementById('file-count-label').innerText = globalBatchFiles.length;
}

function renderThumbnails() {
    const grid = document.getElementById('thumb-grid');
    const addBtn = document.getElementById('btn-add-files');
    grid.innerHTML = '';
    grid.appendChild(addBtn);

    globalBatchFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'thumb-item';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        
        const delBtn = document.createElement('div');
        delBtn.className = 'thumb-remove';
        delBtn.innerHTML = '×';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            removeFile(index);
        };

        div.appendChild(img);
        div.appendChild(delBtn);
        grid.appendChild(div);
    });
}

function removeFile(index) {
    globalBatchFiles.splice(index, 1);
    updateFileCount();
    renderThumbnails();
}


// ============================================================
// 1. 图片压缩 
// ============================================================
document.getElementById('btn-run-resize').addEventListener('click', async () => {
    const targetInput = document.getElementById('resize-target');
    
    if (globalBatchFiles.length === 0) {
        alert("请先点击'管理图片库'添加图片！");
        return;
    }
    const targetKB = parseFloat(targetInput.value);

    // --- 单张逻辑 ---
    if (globalBatchFiles.length === 1) {
        document.getElementById('batch-progress').style.display = 'none';
        showLoading(true);
        setTimeout(async () => {
            try {
                const file = globalBatchFiles[0];
                const { img } = await fileToImage(file);
                const blob = await processResize(img, targetKB);
                displayResult(file, img, blob, 'jpg');
            } catch (error) { alert(error.message); showLoading(false); }
        }, 50);
    } 
    // --- 批量逻辑  ---
    else {
        document.getElementById('preview-area').style.display = 'none';
        showLoading(true);
        
        const progressDiv = document.getElementById('batch-progress');
        
        // 1. 重置进度条样式和文字 (蓝色，正在处理)
        progressDiv.style.display = 'block';
        progressDiv.innerHTML = `<span style="color:#0d6efd; font-weight:bold; font-size:14px;">📦 正在批量处理: <span id="batch-count">0/${globalBatchFiles.length}</span></span>`;
        
        const countSpan = document.getElementById('batch-count');

        setTimeout(async () => {
            try {
                const zipBlob = await processBatch(globalBatchFiles, targetKB, (c, t) => {
                    if(countSpan) countSpan.innerText = `${c}/${t}`;
                });
                
                showLoading(false);
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = `batch_compressed_${new Date().getTime()}.zip`;
                link.click();
                
                // 2. 修改：处理完成后，更新文字为绿色“完成”状态
                progressDiv.innerHTML = `<span style="color:#198754; font-weight:bold; font-size:14px;">✅ 批量处理完成！ZIP 压缩包已下载。</span>`;
                
                // 可选：如果不希望它一直显示，可以在3秒后隐藏
                // setTimeout(() => { progressDiv.style.display = 'none'; }, 5000);

            } catch (error) { 
                alert("批量错误: " + error.message); 
                showLoading(false); 
                // 出错时也更新状态
                progressDiv.innerHTML = `<span style="color:#dc3545; font-weight:bold;">❌ 处理失败</span>`;
            }
        }, 50);
    }
});


// ============================================================
// 2, 3, 4 其他功能 
// ============================================================
document.getElementById('btn-run-convert').addEventListener('click', async () => {
    const fileInput = document.getElementById('convert-file');
    if (!validateInput(fileInput)) return;
    showLoading(true);
    setTimeout(async () => {
        try {
            const file = fileInput.files[0];
            const { img } = await fileToImage(file);
            const format = document.getElementById('convert-format').value;
            const blob = await processConvert(img, format);
            const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
            displayResult(file, img, blob, extMap[format]);
        } catch (error) { alert(error.message); showLoading(false); }
    }, 50);
});

document.getElementById('btn-run-upscale').addEventListener('click', async () => {
    const fileInput = document.getElementById('upscale-file');
    if (!validateInput(fileInput)) return;
    showLoading(true);
    setTimeout(async () => {
        try {
            const file = fileInput.files[0];
            const { img } = await fileToImage(file);
            const factor = parseFloat(document.getElementById('upscale-factor').value);
            const blob = await processUpscale(img, factor);
            displayResult(file, img, blob, 'png');
        } catch (error) { alert(error.message); showLoading(false); }
    }, 50);
});

// 交互裁剪
document.getElementById('crop-file').addEventListener('change', function() {
    if (!this.files || this.files.length === 0) return;
    const file = this.files[0];
    document.getElementById('crop-editor-container').style.display = 'block';
    document.getElementById('preview-area').style.display = 'none';
    const sourceImg = document.getElementById('crop-image-source');
    sourceImg.src = URL.createObjectURL(file);
    sourceImg.onload = () => {
        initCropper(sourceImg, NaN);
        document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.ratio-btn[data-ratio="NaN"]').classList.add('active');
    };
});
document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if(!btn.hasAttribute('data-ratio')) return;
        document.querySelectorAll('.ratio-btn').forEach(b => {
            if(b.hasAttribute('data-ratio')) b.classList.remove('active');
        });
        btn.classList.add('active');
        setCropRatio(parseFloat(btn.getAttribute('data-ratio')));
    });
});
document.getElementById('btn-run-crop').addEventListener('click', async () => {
    const fileInput = document.getElementById('crop-file');
    const formatSelect = document.getElementById('crop-format');
    if (!fileInput.files || fileInput.files.length === 0) { alert("请先上传图片！"); return; }
    showLoading(true);
    setTimeout(async () => {
        try {
            const format = formatSelect.value;
            const blob = await getCroppedBlob(format);
            const { img } = await fileToImage(fileInput.files[0]);
            const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
            displayResult(fileInput.files[0], img, blob, extMap[format]);
            document.getElementById('card-orig').style.display = 'none';
            document.getElementById('preview-area').scrollIntoView({ behavior: 'smooth' });
        } catch (error) { alert(error.message); showLoading(false); }
    }, 50);
});
