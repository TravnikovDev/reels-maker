import * as fs from "fs";
import { getAudioPeakTimecodes } from "./audioAnalyzer";
import { prepareImages } from "./imagePreparer";
import { createImageSequences } from "./imageSequencesCreator";
import { concatenateVideoSegments } from "./videoConcatenator";

async function main() {
  const imagePaths = [
    "assets/images/image1.jpg",
    "assets/images/image2.jpg",
    "assets/images/image3.jpg",
  ];
  const audioPath = "assets/audio/audio.mp3";

  const outputFolder = "output";
  const videoSegmentsOutputFolder = "video_segments";

  // Analyze audio and find peak timecodes
  const peakTimecodes = await getAudioPeakTimecodes(audioPath);
  console.log("Peak timecodes:", peakTimecodes);

  // Resize and prepare images
  const resizedImagePaths = await prepareImages(
    imagePaths,
    1080,
    1920,
    outputFolder
  );
  console.log("Resized images:", resizedImagePaths);

  // Create video segments
  const videoSegmentPaths: string[] = [];
  for (let i = 0; i < peakTimecodes.length - 1; i++) {
    const imagePath = resizedImagePaths[i % resizedImagePaths.length];
    const startTime = peakTimecodes[i];
    const endTime = peakTimecodes[i + 1];
    const duration = endTime - startTime;
    const videoSegmentPath = `${videoSegmentsOutputFolder}/segment_${i}.mp4`;

    // Create a video segment with the specified image and duration
    await createImageSequences(
      [imagePath],
      audioPath,
      duration,
      videoSegmentPath,
      0.2
    );

    videoSegmentPaths.push(videoSegmentPath);
  }

  // Concatenate video segments with transitions
  const finalOutputPath = "output/final_reel.mp4";
  const transitionDuration = 1; // Duration of the transition in seconds
  await concatenateVideoSegments(
    videoSegmentPaths,
    transitionDuration,
    finalOutputPath
  );

  console.log("Final Reel created:", finalOutputPath);

  // Cleanup: remove temporary video segments and list files
  videoSegmentPaths.forEach((segmentPath) => {
    fs.unlinkSync(segmentPath);
  });
}

main()
  .then(() => console.log("Reels creation complete"))
  .catch((error) => console.error("Error during Reels creation:", error));
