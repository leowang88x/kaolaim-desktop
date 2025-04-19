/**
 * 检查浏览器是否支持图片复制到剪贴板
 * @returns boolean 是否支持
 */
export function isClipboardCopySupported(): boolean {
  try {
    return !!(
      navigator.clipboard && 
      typeof ClipboardItem !== 'undefined'
    );
  } catch (e) {
    // console.error('检查剪贴板API支持失败:', e);
    return false;
  }
}

/**
 * 复制图片到剪贴板
 * @param imageUrl 图片URL
 * @returns Promise 复制结果
 */
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  if (!imageUrl) {
    // console.error('图片URL为空');
    return false;
  }

  try {
    // console.log('开始加载图片:', imageUrl);
    
    // 使用img标签加载图片，避免CORS问题
    const img = document.createElement('img');
    
    // 等待图片加载
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.crossOrigin = 'anonymous'; // 尝试无凭据加载，减少CORS问题
      img.src = imageUrl;
    });
    
    // 图片加载成功后，尝试复制
    try {
      // 创建Canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      
      // 绘制图片到Canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法获取Canvas上下文');
      }
      
      ctx.drawImage(img, 0, 0);
      
      // 从Canvas获取数据URL并创建Blob
      const dataURL = canvas.toDataURL('image/png');
      
      // 从Data URL创建Blob
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while(n--){
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      const blob = new Blob([u8arr], {type: mime});
      
      // 写入剪贴板
      const item = new ClipboardItem({ [mime]: blob });
      await navigator.clipboard.write([item]);
      // console.log('图片已复制到剪贴板');
      return true;
    } catch (error) {
      // console.error('Canvas方法失败:', error);
      
      // 尝试使用浏览器内建的复制功能
      try {
        // 创建临时可见图片并选中它
        const tempImg = document.createElement('img');
        tempImg.src = img.src;
        tempImg.style.position = 'fixed';
        tempImg.style.left = '0';
        tempImg.style.top = '0';
        tempImg.style.opacity = '0.01';
        
        document.body.appendChild(tempImg);
        
        // 创建临时选区并复制
        const range = document.createRange();
        range.selectNode(tempImg);
        
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        
        // 尝试复制
        const success = document.execCommand('copy');
        
        // 清理
        window.getSelection()?.removeAllRanges();
        document.body.removeChild(tempImg);
        
        if (success) {
          // console.log('通过DOM选择复制成功');
          return true;
        }
      } catch (domErr) {
        // console.error('DOM复制方法失败:', domErr);
      }
      
      return false;
    }
  } catch (error) {
    // console.error('复制图片失败:', error);
    return false;
  }
}
