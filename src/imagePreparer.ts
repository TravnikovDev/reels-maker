import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

export async function prepareImages(
  inputDir: string,
  outputDir: string,
  numImages: number,
  width: number = 1080,
  height: number = 1980
): Promise<string[]> {
  const imagePaths: string[] = [];
  let imagesProcessed = 0;

  const images = await fs.readdir(inputDir);
  const inputFiles = images
    .filter((file) => /\.(jpe?g|png)$/i.test(file))
    .map((file) => path.join(inputDir, file));

  for (const inputFile of inputFiles) {
    if (imagesProcessed >= numImages) {
      break;
    }
    const outputPath = inputFile.replace('assets/images', outputDir)
    imagePaths.push(outputPath);

    await sharp(inputFile)
      .resize(width, height, { fit: "cover", position: "center" })
      .jpeg({ quality: 100 })
      .toFile(outputPath);

    imagesProcessed++;
  }

  return imagePaths;
}
