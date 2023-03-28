import * as path from "path";
import * as fs from "fs";
import { audioCut, getAudioPeakTimecodes } from "./audioAnalyzer";
import { prepareImages } from "./imagePreparer";
import { createVideoSegment, concatVideoSegments } from "./videoCreator";

// Опитимизация:
// Обработка только нужного колличества видео
// Обработка при помощи ffmpeg
// Накладывание видео в конце

const minTimeDiff = 0.1;
const width = 1080;
const height = 1920;
const outputDir = "output/resized";

async function createReels(
  inputAudioPath: string,
  inputImageDir: string,
  outputVideoPath: string
): Promise<void> {
  try {
    await audioCut().catch((err) => {
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

    console.log("Making videos from images...");
    let videoSegments = await Promise.all(
      peakTimecodes.map(async (startTime, index) => {
        const inputImagePath = preparedImages[index];
        console.info(inputImagePath);
        if (inputImagePath) {
          const videoSegmentPath = path.join(outputDir, `segment_${index}.mp4`);
          if (peakTimecodes[index + 1]) {
            await createVideoSegment(
              inputImagePath,
              peakTimecodes[index + 1] - startTime,
              videoSegmentPath,
              0.2
            );
          }
          return videoSegmentPath;
        }
      })
    );
    videoSegments = videoSegments.filter((item) => item);
    console.log("Segments: ", videoSegments);

    console.log("Making video...");
    await concatVideoSegments(videoSegments, outputVideoPath);

    // Clean up the segments
    // videoSegments.forEach((path) => {
    //   if (path) fs.unlinkSync(path);
    // });
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
