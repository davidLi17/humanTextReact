import { IMAGE_CONFIG } from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { ImageContent } from "../types";

const logger = createLogger("popup-image", "🖼️");

/**
 * 图片处理工具类
 */
export class ImageUtils {
  /**
   * 压缩图片
   */
  static compressImage(
    file: File,
    quality: number = IMAGE_CONFIG.COMPRESSION_QUALITY
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // 计算压缩后的尺寸
        let { width, height } = img;
        const maxDimension = IMAGE_CONFIG.MAX_DIMENSION;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制并压缩
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 验证图片格式
   */
  static isValidImageType(type: string): boolean {
    return (IMAGE_CONFIG.SUPPORTED_FORMATS as readonly string[]).includes(type);
  }

  /**
   * 验证图片大小
   */
  static isValidImageSize(size: number): boolean {
    return size <= IMAGE_CONFIG.MAX_SIZE;
  }

  /**
   * 从剪贴板获取图片
   */
  static async getImageFromClipboard(): Promise<ImageContent | null> {
    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (this.isValidImageType(type)) {
            const blob = await clipboardItem.getType(type);

            if (!this.isValidImageSize(blob.size)) {
              throw new Error("图片大小超过限制（10MB）");
            }

            const file = new File([blob], "clipboard-image", { type });
            const compressedData = await this.compressImage(file);

            return {
              data: compressedData,
              mimeType: type,
              fileName: `clipboard-image-${Date.now()}`,
            };
          }
        }
      }

      return null;
    } catch (error) {
      logger.error("从剪贴板获取图片失败:", error);
      throw error;
    }
  }

  /**
   * 将base64转换为豆包API格式
   */
  static formatImageForAPI(imageContent: ImageContent): object {
    return {
      type: "image_url",
      image_url: {
        url: imageContent.data,
      },
    };
  }
}
