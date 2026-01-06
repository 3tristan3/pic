import { processResize } from './resize.js';
import { fileToImage } from './utils.js';
export async function processBatch(files, targetKB, onProgress) {
    const zip = new JSZip();
    const folder = zip.folder("compressed_images");
    let count = 0;
    for (let i = 0; i < files.length; i++) {
        try {
            const { img } = await fileToImage(files[i]);
            const blob = await processResize(img, targetKB);
            const newName = files[i].name.replace(/\.[^/.]+$/, "") + "_min.jpg";
            folder.file(newName, blob);
        } catch (err) { console.error(err); }
        count++;
        if (onProgress) onProgress(count, files.length);
    }
    return await zip.generateAsync({ type: "blob" });
}
