import * as fs from "fs";
import sharp from "sharp";

export async function resizeImage(
  imagePath: string,
  width: number,
  height: number,
  outputFolder: string
): Promise<string> {
  const resizedImageName = `resized_${Date.now()}.jpg`;
  const outputImagePath = `${outputFolder}/${resizedImageName}`;

  await sharp(imagePath)
    .resize(width, height, { fit: "cover" })
    .jpeg({ quality: 90 })
    .toFile(outputImagePath);

  return outputImagePath;
}

export async function prepareImages(
  imagePaths: string[],
  width: number,
  height: number,
  outputFolder: string
): Promise<string[]> {
  const resizedImagePaths: string[] = [];

  for (const imagePath of imagePaths) {
    const resizedImagePath = await resizeImage(
      imagePath,
      width,
      height,
      outputFolder
    );
    resizedImagePaths.push(resizedImagePath);
  }

  return resizedImagePaths;
}
