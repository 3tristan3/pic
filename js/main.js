// js/main.js

import { validateInput, showLoading, fileToImage, displayResult } from './utils.js';
import { processResize } from './resize.js';
import { processConvert } from './convert.js';
import { processUpscale } from './upscale.js';
import { processBatch } from './batch.js';
import { initCropper, getCroppedBlob, setCropRatio } from './crop.js';
import { processStitch } from './stitch.js';

// --- 全局变量：存储批量上传的文件 ---
let globalBatchFiles = [];
let stitchFiles = []; 

function updateGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting-text');
    let text = '👋 您好';
    if (hour >= 5 && hour < 11) text = '☕️ 早上好';
    else if (hour >= 11 && hour < 13) text = '🍲 中午好';
    else if (hour >= 13 && hour < 18) text = '💻 下午好';
    else if (hour >= 18 && hour < 22) text = '🌆 晚上好';
    else text = '🌙 深夜了';
    if (greetingEl) greetingEl.innerText = text;
}

function updateRunTime() {
    // 【可修改】设置您的建站时间
    const startDate = new Date("2026-01-01T00:00:00"); 
    const now = new Date();
    const diff = now - startDate;
    if (diff < 0) return;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const runTimeEl = document.getElementById('run-time');
    if (runTimeEl) runTimeEl.innerText = `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
}
// 初始化执行
updateGreeting();
setInterval(updateRunTime, 1000);
// ============================================================
// X. 主题切换逻辑 (三态：Light / Dark / System)
// ============================================================

const themeBtn = document.getElementById('btn-theme-toggle');
const themeMenu = document.getElementById('theme-menu');
const themeOptions = document.querySelectorAll('.theme-option');
const dropdown = document.querySelector('.theme-dropdown');

// 1. 应用主题的核心函数
function applyTheme(mode) {
    // 先清理所有强制类名
    document.body.classList.remove('light-mode', 'dark-mode');
    
    // 更新按钮文字和菜单高亮
    themeOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.mode === mode) {
            opt.classList.add('active');
            themeBtn.innerText = opt.innerText; // 按钮显示当前选中的模式
        }
    });

    if (mode === 'light') {
        document.body.classList.add('light-mode'); // 强行浅色
    } else if (mode === 'dark') {
        document.body.classList.add('dark-mode'); // 强行深色
    } else {
        // system 模式：啥类名都不加，完全交给 CSS 的 @media 查询
        // 这里不需要写 JS 判断，CSS 会自己处理
    }

    // 保存设置
    localStorage.setItem('theme_preference', mode);
}

// 2. 初始化
const savedMode = localStorage.getItem('theme_preference') || 'system';
applyTheme(savedMode);

// 3. 交互逻辑
// 点击按钮 -> 显示/隐藏菜单
themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
});

// 点击选项 -> 切换模式
themeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        const mode = opt.dataset.mode;
        applyTheme(mode);
        dropdown.classList.remove('show');
    });
});

// 点击空白处 -> 关闭菜单
document.addEventListener('click', () => {
    dropdown.classList.remove('show');
});


// ============================================================
// Tab 切换逻辑
// ============================================================
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

        // --- 通用清理 ---
        showLoading(false);
        document.getElementById('preview-area').style.display = 'none';
        document.getElementById('batch-progress').style.display = 'none';
        document.getElementById('card-orig').style.display = 'block';

        // --- 新增：长图拼接清理逻辑
        // 1. 清空拼图数组
        stitchFiles = []; 
        // 2. 隐藏排序列表界面
        document.getElementById('stitch-container').style.display = 'none';
        // 3. 清空文件输入框的值
        const stitchInput = document.getElementById('stitch-files');
        if (stitchInput) stitchInput.value = '';
        // 4. 隐藏输入框里的小 X 号 
        if (stitchInput) {
            const wrapper = stitchInput.parentElement;
            const clearBtn = wrapper.querySelector('.file-clear-btn');
            if(clearBtn) clearBtn.style.display = 'none';
        }
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

// 关闭弹窗 (X按钮, 关闭按钮, 确认按钮)
function closeModal() {
    document.getElementById('upload-modal').style.display = 'none';
}
document.getElementById('btn-close-modal-x').addEventListener('click', closeModal);
document.getElementById('btn-close-modal').addEventListener('click', closeModal);
document.getElementById('btn-confirm-modal').addEventListener('click', closeModal);

// 添加图片按钮 -> 触发隐藏 Input
document.getElementById('btn-add-files').addEventListener('click', () => {
    document.getElementById('real-file-input').click();
});

// 监听真实 Input 变化 (添加文件)
document.getElementById('real-file-input').addEventListener('change', function() {
    if (this.files && this.files.length > 0) {
        // 追加新文件到全局数组
        globalBatchFiles = [...globalBatchFiles, ...Array.from(this.files)];
        updateFileCount();
        renderThumbnails();
        this.value = ''; // 清空以允许重复选择
    }
});

// 清空全部 (新增功能)
document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (globalBatchFiles.length === 0) return;
    if (confirm('确定要清空所有已上传的图片吗？')) {
        globalBatchFiles = [];
        updateFileCount();
        renderThumbnails();
    }
});

// 更新主界面计数
function updateFileCount() {
    document.getElementById('file-count-label').innerText = globalBatchFiles.length;
}

// 渲染九宫格缩略图
function renderThumbnails() {
    const grid = document.getElementById('thumb-grid');
    // 保留第一个“添加”按钮，移除后面的缩略图
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
        delBtn.title = "删除此图片";
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
// 1. 图片压缩 (逻辑：读取 globalBatchFiles)
// ============================================================
document.getElementById('btn-run-resize').addEventListener('click', async () => {
    const targetInput = document.getElementById('resize-target');
    
    // 校验全局数组
    if (globalBatchFiles.length === 0) {
        alert("请先点击'管理图片库'添加图片！");
        return;
    }
    const targetKB = parseFloat(targetInput.value);

    // --- 分支 A: 单张预览 ---
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
    // --- 分支 B: 批量打包 ---
    else {
        document.getElementById('preview-area').style.display = 'none';
        showLoading(true);
        
        const progressDiv = document.getElementById('batch-progress');
        // 重置进度条文案
        progressDiv.style.display = 'block';
        progressDiv.innerHTML = `<span style="color:var(--primary); font-weight:bold; font-size:14px;">📦 正在批量处理: <span id="batch-count">0/${globalBatchFiles.length}</span></span>`;
        
        const countSpan = document.getElementById('batch-count');

        setTimeout(async () => {
            try {
                const zipBlob = await processBatch(globalBatchFiles, targetKB, (c, t) => {
                    if(countSpan) countSpan.innerText = `${c}/${t}`;
                });
                
                showLoading(false);
                
                // 自动下载
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = `batch_compressed_${new Date().getTime()}.zip`;
                link.click();
                
                // 更新完成状态
                progressDiv.innerHTML = `<span style="color:#10b981; font-weight:bold; font-size:14px;">✅ 批量处理完成！ZIP 压缩包已下载。</span>`;
                
            } catch (error) { 
                console.error(error);
                alert("批量错误: " + error.message); 
                showLoading(false); 
                progressDiv.innerHTML = `<span style="color:#ef4444; font-weight:bold;">❌ 处理失败</span>`;
            }
        }, 50);
    }
});


// ============================================================
// 2. 格式转换 (保持独立文件Input)
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


// ============================================================
// 3. 图片放大 (保持独立文件Input)
// ============================================================
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


// ============================================================
// 4. 图片裁剪 (保持独立文件Input)
// ============================================================

// A. 监听上传 -> 初始化编辑器
document.getElementById('crop-file').addEventListener('change', function() {
    if (!this.files || this.files.length === 0) return;
    const file = this.files[0];
    document.getElementById('crop-editor-container').style.display = 'block';
    
    // 裁剪模式下隐藏预览区
    document.getElementById('preview-area').style.display = 'none'; 
    
    const sourceImg = document.getElementById('crop-image-source');
    sourceImg.src = URL.createObjectURL(file);
    sourceImg.onload = () => {
        initCropper(sourceImg, NaN);
        // 重置按钮高亮
        document.querySelectorAll('.ratio-btn').forEach(b => {
            if(b.hasAttribute('data-ratio')) b.classList.remove('active');
        });
        document.querySelector('.ratio-btn[data-ratio="NaN"]').classList.add('active');
    };
});

// B. 监听比例按钮
document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // 排除弹窗按钮，只响应裁剪比例按钮
        if(!btn.hasAttribute('data-ratio')) return;
        
        document.querySelectorAll('.ratio-btn').forEach(b => {
            if(b.hasAttribute('data-ratio')) b.classList.remove('active');
        });
        btn.classList.add('active');
        setCropRatio(parseFloat(btn.getAttribute('data-ratio')));
    });
});

// C. 确认裁剪
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
            
            // 隐藏原图卡片，只看结果
            document.getElementById('card-orig').style.display = 'none';
            document.getElementById('preview-area').scrollIntoView({ behavior: 'smooth' });
        } catch (error) { alert(error.message); showLoading(false); }
    }, 50);
});

// ============================================================
// 5. 长图拼接逻辑
// ============================================================

// A. 监听上传
document.getElementById('stitch-files').addEventListener('change', async function() {
    if (!this.files || this.files.length === 0) return;
    
    // 追加新文件
    stitchFiles = [...stitchFiles, ...Array.from(this.files)];
    
    // 渲染排序列表
    await renderStitchSort();
    
    // 显示排序区
    document.getElementById('stitch-container').style.display = 'block';
    
    // 清空 input 允许重复添加
    this.value = '';
});

// B. 渲染排序列表 (带拖拽 + 删除)
async function renderStitchSort() {
    const list = document.getElementById('stitch-sort-list');
    list.innerHTML = '';
    
    // 如果没图片了，隐藏整个区域并清空input
    if (stitchFiles.length === 0) {
        document.getElementById('stitch-container').style.display = 'none';
        document.getElementById('stitch-files').value = '';
        // 隐藏输入框的小叉叉
        const inputWrapper = document.getElementById('stitch-files').parentElement;
        const clearBtn = inputWrapper.querySelector('.file-clear-btn');
        if(clearBtn) clearBtn.style.display = 'none';
        return;
    }
    
    stitchFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'sort-item';
        item.draggable = true;
        item.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        
        // 序号角标
        const badge = document.createElement('div');
        badge.className = 'sort-index';
        badge.innerText = index + 1;

        // === 新增：删除按钮 ===
        const delBtn = document.createElement('div');
        delBtn.className = 'stitch-remove-btn';
        delBtn.innerHTML = '×';
        delBtn.title = '移除这张图片';
        
        // 删除事件
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发拖拽
            // 1. 从数组移除
            stitchFiles.splice(index, 1);
            // 2. 重新渲染
            renderStitchSort();
        });

        item.appendChild(img);
        item.appendChild(badge);
        item.appendChild(delBtn); // 加入 DOM
        
        // 绑定拖拽事件 (保持不变)
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', (e) => e.preventDefault());

        list.appendChild(item);
    });
}

// --- 拖拽事件处理 ---
let dragSrcIndex = null;

function handleDragStart(e) {
    this.classList.add('dragging');
    dragSrcIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault(); // 必要，允许 drop
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    const target = e.currentTarget;
    const targetIndex = parseInt(target.dataset.index);

    if (dragSrcIndex !== targetIndex) {
        // 交换数组元素
        const item = stitchFiles.splice(dragSrcIndex, 1)[0];
        stitchFiles.splice(targetIndex, 0, item);
        // 重新渲染
        renderStitchSort();
    }
    
    // 移除样式
    document.querySelectorAll('.sort-item').forEach(item => item.classList.remove('dragging'));
    return false;
}

// C. 开始拼接
document.getElementById('btn-run-stitch').addEventListener('click', async () => {
    if (stitchFiles.length < 2) {
        alert("请至少选择 2 张图片进行拼接！");
        return;
    }

    const mode = document.getElementById('stitch-mode').value;
    const gap = parseInt(document.getElementById('stitch-gap').value);

    showLoading(true);

    setTimeout(async () => {
        try {
            // 1. 加载所有图片对象
            const loadedImages = await Promise.all(stitchFiles.map(async file => {
                const { img } = await fileToImage(file);
                return img;
            }));

            // 2. 拼接
            const blob = await processStitch(loadedImages, mode, gap);

            // 3. 显示结果 (这里不需要对比原图，我们只显示结果图)
            // 为了复用 displayResult，我们随便传第一张图作为 original
            // 但我们需要隐藏原始信息
            const { img } = await fileToImage(stitchFiles[0]); // 假的原图
            displayResult(stitchFiles[0], img, blob, 'jpg');
            
            // 隐藏原图卡片 (拼图没有所谓的"原图")
            document.getElementById('card-orig').style.display = 'none';
            
            document.getElementById('preview-area').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            alert('拼接出错: ' + error.message);
            showLoading(false);
        }
    }, 50);
});

// ============================================================
// Y. 输入框清除逻辑 (通用)
// ============================================================
// 1. 全局清除函数
window.clearInput = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // 清空值
    input.value = '';
    
    // 触发样式更新 (隐藏 X 号)
    toggleClearBtn(input);

    // --- 特殊处理 A: 裁剪功能 ---
    if (inputId === 'crop-file') {
        document.getElementById('crop-editor-container').style.display = 'none';
    }
    
    // --- 新增：特殊处理 B: 长图拼接功能 (加在这里) ---
    if (inputId === 'stitch-files') {
        // 1. 清空数组
        stitchFiles = [];
        // 2. 隐藏排序区域
        document.getElementById('stitch-container').style.display = 'none';
        // 3. 清空 DOM 中的列表内容 (保险起见)
        document.getElementById('stitch-sort-list').innerHTML = '';
    }
    
    // 隐藏预览区
    document.getElementById('preview-area').style.display = 'none';
};


// 2. 监听所有 file input，控制 X 号的显示
document.querySelectorAll('input[type="file"]').forEach(input => {
    // 排除掉那个隐藏的 real-file-input
    if (input.id === 'real-file-input') return;

    input.addEventListener('change', function() {
        toggleClearBtn(this);
    });
});

// 辅助函数：控制 X 号显示/隐藏
function toggleClearBtn(input) {
    const wrapper = input.parentElement;
    // 找到同级的 clear-btn
    const btn = wrapper.querySelector('.file-clear-btn');
    
    if (btn) {
        if (input.files && input.files.length > 0) {
            btn.style.display = 'block'; // 有文件 -> 显示
            input.classList.add('has-file'); // 增加右侧内边距
        } else {
            btn.style.display = 'none';  // 无文件 -> 隐藏
            input.classList.remove('has-file');
        }
    }
}
// ============================================================
// Z. 真实访客统计 (基于 CounterAPI.dev)
// ============================================================

// 【配置区】请修改下面的字符串，确保唯一，防止和别人冲突
const COUNTER_NAMESPACE = 'image-workbench-pro'; 
const COUNTER_KEY_PV = 'page_views';
const COUNTER_KEY_UV = 'unique_visitors';

async function fetchCounterStats() {
    const pvEl = document.getElementById('busuanzi_value_site_pv');
    const uvEl = document.getElementById('busuanzi_value_site_uv');

    // 辅助函数：调用 API
    // 模式：up (增加) 或 info (只读)
    const callApi = async (key, mode) => {
        try {
            // 文档：https://api.counterapi.dev/v1/{namespace}/{key}/{mode}
            const response = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${key}/${mode}`);
            const data = await response.json();
            return data.count;
        } catch (e) {
            console.warn(`CounterAPI Error [${key}]:`, e);
            return null;
        }
    };

    try {
        // 1. 处理 PV (浏览量)：每次刷新页面都 +1
        const pvCount = await callApi(COUNTER_KEY_PV, 'up');
        if (pvCount !== null && pvEl) pvEl.innerText = pvCount.toLocaleString();

        // 2. 处理 UV (访客数)：本地去重
        const today = new Date().toDateString();
        const lastVisit = localStorage.getItem('counter_last_visit');
        
        let uvCount;
        if (lastVisit !== today) {
            // 今天没来过 -> +1
            uvCount = await callApi(COUNTER_KEY_UV, 'up');
            localStorage.setItem('counter_last_visit', today);
        } else {
            // 今天来过 -> 只读不加
            uvCount = await callApi(COUNTER_KEY_UV, 'info');
        }

        if (uvCount !== null && uvEl) uvEl.innerText = uvCount.toLocaleString();

    } catch (err) {
        // 容错处理
        if(pvEl) pvEl.innerText = "--";
        if(uvEl) uvEl.innerText = "--";
    }
}

// 执行
fetchCounterStats();
