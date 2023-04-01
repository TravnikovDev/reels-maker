import * as path from "path";
import * as fs from "fs";
import {
  addAudioToVideo,
  audioCut,
  getAudioPeakTimecodes,
} from "./audioAnalyzer";
import { prepareImages } from "./imagePreparer";
import { createSlidingVideo } from "./videoCreator";

// Выбор музыки
// Выбор папок с картинками
// Ввод настройки промежутка

const minTimeDiff = 0.3;
const transitionTime = 0.15;
const width = 1080;
const height = 1920;
const outputDir = "output/resized";

async function createReels(
  inputAudioPath: string,
  inputImageDir: string,
  outputVideoPath: string
): Promise<void> {
  try {
    const duration = await audioCut().catch((err) => {
      console.error("Audio cut:", err);
    });

    console.log("Analyzing audio...");
    const peakTimecodes = await getAudioPeakTimecodes(
      inputAudioPath,
      minTimeDiff
    );
    console.log("Peak timecodes:", peakTimecodes);

    console.log("Preparing images...");
    const preparedImages = await prepareImages(
      inputImageDir,
      outputDir,
      peakTimecodes.length,
      width,
      height
    );
    console.log("Prepared images:", preparedImages);

    console.log("Making video...");
    await createSlidingVideo(preparedImages, peakTimecodes, outputVideoPath);
    // await concatVideoSegments(videoSegments, outputVideoPath);

    console.log("Adding music piece...");
    await addAudioToVideo(outputVideoPath, inputAudioPath, "output/reel.mp4");

  } catch (error) {
    console.error("Error during Reels creation:", error);
  }
}

(async () => {
  const inputAudioPath = "output/trimmed_audio.mp3";
  const inputImageDir = "assets/images";
  const outputVideoPath = "output/reels_video.mp4";

  await createReels(inputAudioPath, inputImageDir, outputVideoPath);
  console.log("Reels video created:", outputVideoPath);
})();
