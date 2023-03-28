import * as path from "path";
import * as fs from "fs";
import {
  addAudioToVideo,
  audioCut,
  getAudioPeakTimecodes,
} from "./audioAnalyzer";
import { prepareImages } from "./imagePreparer";
import { createVideoSegment, concatVideoSegments } from "./videoCreator";

// Опитимизация:
// Обработка только нужного колличества видео
// Обработка при помощи ffmpeg
// Накладывание видео в конце

const minTimeDiff = 0.1;
const transitionTime = 0.2;
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

    console.log("Making videos from images...");
    let videoSegments = await Promise.all(
      peakTimecodes.map(async (startTime, index) => {
        const inputImagePath = preparedImages[index];
        if (inputImagePath) {
          if (peakTimecodes[index + 1]) {
            const videoSegmentPath = path.join(
              outputDir,
              `segment_${index}.mp4`
            );
            await createVideoSegment(
              inputImagePath,
              peakTimecodes[index + 1] - startTime,
              videoSegmentPath,
              transitionTime
            );
            return videoSegmentPath;
          } else if (index == peakTimecodes.length - 1 && duration) {
            const videoSegmentPath = path.join(
              outputDir,
              `segment_${index}.mp4`
            );
            await createVideoSegment(
              inputImagePath,
              duration - startTime,
              videoSegmentPath,
              transitionTime
            );
            return videoSegmentPath;
          }
        }
      })
    );
    videoSegments = videoSegments.filter((item) => item);
    console.log("Segments: ", videoSegments);

    console.log("Making video...");
    await concatVideoSegments(videoSegments, outputVideoPath, inputAudioPath);

    console.log("Adding music piece...");
    await addAudioToVideo(outputVideoPath, inputAudioPath, "output/reel.mp4");

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
