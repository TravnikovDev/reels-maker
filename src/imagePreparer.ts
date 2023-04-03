import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import * as readline from "readline";

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

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
    const outputPath = inputFile.replace("assets/images", outputDir);
    imagePaths.push(outputPath);

    await sharp(inputFile)
      .resize(width, height, { fit: "cover", position: "center" })
      .jpeg({ quality: 100 })
      .toFile(outputPath);

    imagesProcessed++;
  }

  shuffleArray(imagePaths); // Shuffle the inputFiles array

  return imagePaths;
}

// Functions to get subdirectories
export async function getSubdirectories(directory: string): Promise<string[]> {
  const items = await fs.readdir(directory, { withFileTypes: true });
  return items
    .filter((item) => item.isDirectory())
    .map((item) => path.join(directory, item.name));
}

export async function promptImageSubfolderSelection(subfolders: string[]): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Please select an image subfolder:');
  subfolders.forEach((subfolder, index) => {
    console.log(`${index + 1}: ${subfolder}`);
  });

  const selectedIndex = await new Promise<number>((resolve) => {
    rl.question('Enter the number of the subfolder: ', (answer) => {
      resolve(parseInt(answer) - 1);
    });
  });

  rl.close();

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= subfolders.length) {
    console.error('Invalid subfolder selection. Exiting...');
    process.exit(1);
  }

  return subfolders[selectedIndex];
}
