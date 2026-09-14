/**
 * Utilitário para compressão de imagens no lado do cliente (navegador) antes do envio.
 * Otimiza fotos de câmeras/celulares de alta resolução (5MB-15MB) para ~300KB-800KB
 * preservando nitidez total do texto e assinaturas de atestados médicos.
 */

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  previewUrl: string;
}

export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputType?: 'image/jpeg' | 'image/webp';
  } = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.82,
    outputType = 'image/jpeg',
  } = options;

  // Se não for imagem compatível (ex: PDF), retorna o arquivo original sem alteração
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      reductionPercentage: 0,
      previewUrl: '',
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensiona proporcionalmente se exceder os limites
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight;
            height = Math.round((img.height * width) / img.width);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({
            file,
            originalSize: file.size,
            compressedSize: file.size,
            reductionPercentage: 0,
            previewUrl: URL.createObjectURL(file),
          });
        }

        // Fundo branco caso a imagem original tenha transparência (PNG -> JPG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Suavização de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                reductionPercentage: 0,
                previewUrl: URL.createObjectURL(file),
              });
            }

            // Se o arquivo comprimido ficou maior que o original, mantém o original
            if (blob.size >= file.size) {
              return resolve({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                reductionPercentage: 0,
                previewUrl: URL.createObjectURL(file),
              });
            }

            const extension = outputType === 'image/webp' ? '.webp' : '.jpg';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${baseName}-otimizado${extension}`, {
              type: outputType,
              lastModified: Date.now(),
            });

            const reductionPercentage = Math.round(
              ((file.size - blob.size) / file.size) * 100
            );

            const previewUrl = URL.createObjectURL(compressedFile);

            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: blob.size,
              reductionPercentage,
              previewUrl,
            });
          },
          outputType,
          quality
        );
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}
