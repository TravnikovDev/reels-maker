import * as path from "path";
import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

// Set the path to the FFmpeg binary
// ffmpeg.setFfmpegPath(`${ffmpegStatic}`);
// ffmpeg.setFfprobePath(`${ffprobeStatic}`);

const width = 1080;
const height = 1920;

async function createVideoSegment(
  imagePath: string,
  audioPath: string,
  startTime: number,
  endTime: number,
  outputPath: string,
  transitionDuration: number = 0.2
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const duration = endTime - startTime;
    const inputDuration = duration + transitionDuration;

    console.info(imagePath, audioPath, startTime, endTime, outputPath);

    try {
      ffmpeg()
        .input(imagePath)
        .loop()
        .inputOptions("-t", inputDuration.toString())
        .input(audioPath)
        .inputOptions("-ss", startTime.toString())
        .inputOptions("-t", duration.toString())
        // .complexFilter(
        //   [
        //     `[0:v]scale=${width}:${height},setsar=1,fps=60[img]`,
        //     // `[1:a]asetpts=PTS-STARTPTS[aud]`,
        //     // `[1:a]afade=t=in:st=0:d=${transitionDuration}[aout]`
        //   ],
        //   // ["vout", "aout"]
        // )
        // .outputOptions(["-map", "[img]", "-map", "[aud]", "-strict", "-2"])
        .outputOptions("-c:v", "libx264")
        .outputOptions("-c:a", "aac")
        .outputOptions("-movflags", "+faststart")
        .output(outputPath)
        .on("error", (err) => {
          console.error("Error during video segment creation:", err);
          reject(err);
        })
        .on("end", () => {
          resolve();
        })
        .run();
    } catch (err) {
      console.log("Error during segment creation: ", err);
    }
  });
}

async function concatVideoSegments(
  segmentPaths: (string | undefined)[],
  outputPath: string
): Promise<void> {
  try {
    return new Promise<void>((resolve, reject) => {
      const command = ffmpeg();

      segmentPaths.forEach((segmentPath) => {
        if (segmentPath) {
          console.info(segmentPath);
          command.addInput(segmentPath);
        }
      });

      command
        .on("error", function (err) {
          console.log("An error occurred: " + err.message);
        })
        .on("end", function () {
          console.log("Merging finished !");
        })
        .mergeToFile(outputPath, "output/temp");

      // command
      //   .concat(outputPath)
      //   .outputOptions("-c", "copy")
      //   .on("error", (err) => {
      //     console.error("Error during video concatenation:", err);
      //     reject(err);
      //   })
      //   .on("end", () => {
      //     resolve();
      //   })
      //   .run();
    });
  } catch (err) {
    console.log("Error during concatenation: ", err);
  }
}

export { createVideoSegment, concatVideoSegments };
