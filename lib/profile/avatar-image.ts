export interface CompressedAvatarImage {
  readonly blob: Blob;
  readonly contentType: "image/webp";
  readonly extension: "webp";
}

export class AvatarImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarImageError";
  }
}

const allowedAvatarTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const maxAvatarInputBytes = 5 * 1024 * 1024;
const maxAvatarDimensionPx = 512;
const avatarQuality = 0.82;
const avatarContentType = "image/webp";

const isAllowedAvatarType = (
  value: string,
): value is (typeof allowedAvatarTypes)[number] =>
  allowedAvatarTypes.some((allowedType) => allowedType === value);

const validateAvatarFile = (file: File): void => {
  if (!isAllowedAvatarType(file.type)) {
    throw new AvatarImageError(
      `Format avatar tidak didukung: ${file.type}. Gunakan JPG, PNG, atau WebP.`,
    );
  }

  if (file.size > maxAvatarInputBytes) {
    throw new AvatarImageError(
      `Ukuran avatar terlalu besar: ${file.size} bytes. Maksimal ${maxAvatarInputBytes} bytes.`,
    );
  }
};

const loadImageFromFile = async (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new AvatarImageError(`Gagal membaca file avatar: ${file.name}.`),
      );
    };

    image.src = objectUrl;
  });

interface ResizeDimensions {
  readonly height: number;
  readonly width: number;
}

const getResizeDimensions = (image: HTMLImageElement): ResizeDimensions => {
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new AvatarImageError(
      `Dimensi avatar tidak valid: ${image.naturalWidth}x${image.naturalHeight}.`,
    );
  }

  const largestDimension = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, maxAvatarDimensionPx / largestDimension);

  return {
    height: Math.round(image.naturalHeight * scale),
    width: Math.round(image.naturalWidth * scale),
  };
};

const canvasToWebpBlob = async (
  canvas: HTMLCanvasElement,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(
            new AvatarImageError(
              "Browser gagal mengompres avatar ke format WebP.",
            ),
          );
          return;
        }

        resolve(blob);
      },
      avatarContentType,
      avatarQuality,
    );
  });

export const compressAvatarImage = async (
  file: File,
): Promise<CompressedAvatarImage> => {
  validateAvatarFile(file);

  const image = await loadImageFromFile(file);
  const dimensions = getResizeDimensions(image);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new AvatarImageError("Browser tidak mendukung kompresi avatar.");
  }

  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  const blob = await canvasToWebpBlob(canvas);

  return {
    blob,
    contentType: avatarContentType,
    extension: "webp",
  };
};
