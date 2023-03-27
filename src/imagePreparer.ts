import * as fs from "fs";
import sharp from "sharp";
import * as path from "path";
import { promisify } from "util";

const readdirAsync = promisify(fs.readdir);

export async function resizeImage(
  imagePath: string,
  width: number,
  height: number,
  outputImagePath: string
): Promise<string> {

  try {
    const image = sharp(imagePath);
    await image
      .resize(width, height, { fit: "cover", position: "center" })
      .jpeg({ quality: 90 })
      .toFile(outputImagePath);
  } catch (error) {
    console.error("Error during image resizing:", error);
    throw error;
  }

  return outputImagePath;
}

export async function prepareImages(
  inputDir: string,
  width: number,
  height: number,
  outputDir: string
): Promise<string[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const inputFiles = await readdirAsync(inputDir);
  const imagePaths = inputFiles
    .filter((file) => /\.(jpe?g|png)$/i.test(file))
    .map((file) => path.join(inputDir, file));

  const preparedImagePaths: string[] = [];

  for (const imagePath of imagePaths) {
    console.info(imagePath);
    const newPath = imagePath.replace('assets/images/','output/resized/');
    await resizeImage(imagePath, width, height, newPath);

    preparedImagePaths.push(newPath);
  }

  return preparedImagePaths;
}
