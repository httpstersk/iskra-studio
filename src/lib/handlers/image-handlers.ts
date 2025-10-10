import type { PlacedImage, PlacedVideo } from "@/types/canvas";

export async function combineImages(
  images: PlacedImage[],
  selectedIds: string[]
): Promise<PlacedImage> {
  const selectedImages = selectedIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img) => img !== undefined) as PlacedImage[];

  const sortedImages = [...selectedImages].sort((a, b) => {
    const indexA = images.findIndex((img) => img.id === a.id);
    const indexB = images.findIndex((img) => img.id === b.id);
    return indexA - indexB;
  });

  const imageElements: {
    img: PlacedImage;
    element: HTMLImageElement;
    scale: number;
  }[] = [];
  let maxScale = 1;

  for (const img of sortedImages) {
    const imgElement = new window.Image();
    imgElement.crossOrigin = "anonymous";
    imgElement.src = img.src;
    await new Promise((resolve) => {
      imgElement.onload = resolve;
    });

    const effectiveWidth = img.cropWidth
      ? imgElement.naturalWidth * img.cropWidth
      : imgElement.naturalWidth;
    const effectiveHeight = img.cropHeight
      ? imgElement.naturalHeight * img.cropHeight
      : imgElement.naturalHeight;

    const scaleX = effectiveWidth / img.width;
    const scaleY = effectiveHeight / img.height;
    const scale = Math.min(scaleX, scaleY);

    maxScale = Math.max(maxScale, scale);
    imageElements.push({ img, element: imgElement, scale });
  }

  const optimalScale = Math.min(maxScale, 4);

  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  sortedImages.forEach((img) => {
    minX = Math.min(minX, img.x);
    minY = Math.min(minY, img.y);
    maxX = Math.max(maxX, img.x + img.width);
    maxY = Math.max(maxY, img.y + img.height);
  });

  const combinedWidth = maxX - minX;
  const combinedHeight = maxY - minY;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  canvas.width = Math.round(combinedWidth * optimalScale);
  canvas.height = Math.round(combinedHeight * optimalScale);

  for (const { img, element: imgElement } of imageElements) {
    const relX = (img.x - minX) * optimalScale;
    const relY = (img.y - minY) * optimalScale;
    const scaledWidth = img.width * optimalScale;
    const scaledHeight = img.height * optimalScale;

    ctx.save();

    if (img.rotation) {
      ctx.translate(relX + scaledWidth / 2, relY + scaledHeight / 2);
      ctx.rotate((img.rotation * Math.PI) / 180);
      ctx.drawImage(
        imgElement,
        -scaledWidth / 2,
        -scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );
    } else {
      if (
        img.cropX !== undefined &&
        img.cropY !== undefined &&
        img.cropWidth !== undefined &&
        img.cropHeight !== undefined
      ) {
        ctx.drawImage(
          imgElement,
          img.cropX * imgElement.naturalWidth,
          img.cropY * imgElement.naturalHeight,
          img.cropWidth * imgElement.naturalWidth,
          img.cropHeight * imgElement.naturalHeight,
          relX,
          relY,
          scaledWidth,
          scaledHeight
        );
      } else {
        ctx.drawImage(
          imgElement,
          0,
          0,
          imgElement.naturalWidth,
          imgElement.naturalHeight,
          relX,
          relY,
          scaledWidth,
          scaledHeight
        );
      }
    }

    ctx.restore();
  }

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });

  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve) => {
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    id: `combined-${Date.now()}-${Math.random()}`,
    src: dataUrl,
    x: minX,
    y: minY,
    width: combinedWidth,
    height: combinedHeight,
    rotation: 0,
  };
}

export function duplicateElements(
  images: PlacedImage[],
  videos: PlacedVideo[],
  selectedIds: string[]
): { newImages: PlacedImage[]; newVideos: PlacedVideo[] } {
  const selectedImages = images.filter((img) => selectedIds.includes(img.id));
  const newImages = selectedImages.map((img) => ({
    ...img,
    id: `img-${Date.now()}-${Math.random()}`,
    x: img.x + 20,
    y: img.y + 20,
  }));

  const selectedVideos = videos.filter((vid) => selectedIds.includes(vid.id));
  const newVideos = selectedVideos.map((vid) => ({
    ...vid,
    id: `vid-${Date.now()}-${Math.random()}`,
    x: vid.x + 20,
    y: vid.y + 20,
    currentTime: 0,
    isPlaying: false,
  }));

  return { newImages, newVideos };
}

export function deleteElements(
  images: PlacedImage[],
  videos: PlacedVideo[],
  selectedIds: string[]
): { newImages: PlacedImage[]; newVideos: PlacedVideo[] } {
  return {
    newImages: images.filter((img) => !selectedIds.includes(img.id)),
    newVideos: videos.filter((vid) => !selectedIds.includes(vid.id)),
  };
}

export async function createCroppedImage(
  imageSrc: string,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      canvas.width = cropWidth * img.naturalWidth;
      canvas.height = cropHeight * img.naturalHeight;

      ctx.drawImage(
        img,
        cropX * img.naturalWidth,
        cropY * img.naturalHeight,
        cropWidth * img.naturalWidth,
        cropHeight * img.naturalHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
}
