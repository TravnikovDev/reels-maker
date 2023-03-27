import * as path from "path";
import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

// Set the path to the FFmpeg binary
ffmpeg.setFfmpegPath(`${ffmpegStatic}`);

const width = 1080;
const height = 1920;

async function createVideoSegment(
  imagePath: string,
  audioPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const duration = endTime - startTime;

    console.info(imagePath, audioPath, startTime, endTime, outputPath);

    ffmpeg()
      .input(imagePath)
      .inputOptions(["-loop", "1"])
      .input(audioPath)
      .inputOptions([`-ss ${startTime}`, `-t ${duration}`])
      .complexFilter(
        [
          `[0:v]scale=${width}:${height},setsar=1,fps=60[img]`,
          `[1:a]asetpts=PTS-STARTPTS[aud]`,
        ],
        ["img", "aud"]
      )
      .outputOptions(["-map", "[img]", "-map", "[aud]", "-strict", "-2"])
      .output(outputPath)
      .on("error", (err) => {
        console.error("Error during video segment creation:", err);
        reject(err);
      })
      .on("end", () => {
        resolve();
      })
      .run();
  });
}

async function concatVideoSegments(
  segmentPaths: (string | undefined)[],
  outputPath: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const command = ffmpeg();

    segmentPaths.forEach((segmentPath) => {
      if (segmentPath) {
        command.addInput(segmentPath);
      }
    });

    command
      .concat(outputPath)
      .outputOptions("-c", "copy")
      .on("error", (err) => {
        console.error("Error during video concatenation:", err);
        reject(err);
      })
      .on("end", () => {
        resolve();
      })
      .run();
  });
}

export { createVideoSegment, concatVideoSegments };
