import * as path from "path";
import * as fs from "fs";
import { getAudioPeakTimecodes } from "./audioAnalyzer";
import { prepareImages } from "./imagePreparer";
import { createVideoSegment, concatVideoSegments } from "./videoCreator";

const minTimeDiff = 0.2;
const width = 1080;
const height = 1920;
const outputDir = "output/resized";

async function createReels(
  inputAudioPath: string,
  inputImageDir: string,
  outputVideoPath: string
): Promise<void> {
  try {
    const peakTimecodes = await getAudioPeakTimecodes(
      inputAudioPath,
      minTimeDiff
    );
    console.log("Peak timecodes:", peakTimecodes);

    const preparedImages = await prepareImages(
      inputImageDir,
      width,
      height,
      outputDir
    );
    console.log("Prepared images:", preparedImages);

    const segmentPaths: string[] = [];

    const videoSegments = await Promise.all(
      peakTimecodes.map(async (startTime, index) => {
        const inputImagePath = preparedImages[index];
        if (inputImagePath) {
          const videoSegmentPath = path.join(outputDir, `segment_${index}.mp4`);
          await createVideoSegment(
            inputImagePath,
            inputAudioPath,
            startTime,
            peakTimecodes[index + 1],
            videoSegmentPath
          );
          return videoSegmentPath;
        }
      })
    );

    /* for (let i = 0; i < peakTimecodes.length - 1; i++) {
      const startTime = peakTimecodes[i];
      const endTime = peakTimecodes[i + 1];

      const segmentPath = `output/segment_${i}.mp4`;
      segmentPaths.push(segmentPath);

      await createVideoSegment(
        preparedImagePaths[i % preparedImagePaths.length],
        inputAudioPath,
        startTime,
        endTime,
        segmentPath
      );
    } */

    console.log(videoSegments, outputVideoPath);
    await concatVideoSegments(videoSegments, outputVideoPath);

    // Clean up the segments
    segmentPaths.forEach((segmentPath) => {
      fs.unlinkSync(segmentPath);
    });
  } catch (error) {
    console.error("Error during Reels creation:", error);
  }
}

(async () => {
  const inputAudioPath = "assets/audio/audio.mp3";
  const inputImageDir = "assets/images";
  const outputVideoPath = "output/reels_video.mp4";

  await createReels(inputAudioPath, inputImageDir, outputVideoPath);
  console.log("Reels video created:", outputVideoPath);
})();
