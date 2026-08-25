import sharp from "sharp";

export type TestImageFormat = "jpeg" | "png" | "webp";

export const createTestImageBuffer = async (
  width: number,
  height: number,
  format: TestImageFormat = "jpeg",
): Promise<Buffer> => {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 160, b: 200 },
    },
  });

  switch (format) {
    case "jpeg":
      return image.jpeg().toBuffer();
    case "png":
      return image.png().toBuffer();
    case "webp":
      return image.webp().toBuffer();
  }
};

export const createCorruptImageBuffer = (): Buffer =>
  Buffer.from("this is not a real image file", "utf8");
