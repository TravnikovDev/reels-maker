import * as fs from "fs";

import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

// Set the path to the FFmpeg binary
ffmpeg.setFfmpegPath(`${ffmpegStatic}`);

export async function createImageSequences(
  imagePaths: string[],
  audioPath: string,
  frameDurations: number[],
  outputPath: string,
  transitionDuration: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    imagePaths.forEach((imagePath, index) => {
      command
        .input(imagePath)
        .duration(frameDurations[index] + transitionDuration);
    });

    const filterComplex = imagePaths
      .map((_imagePath, index) => {
        if (index === 0) return "";
        const firstFrame = index * frameDurations[index];
        return `[${
          index - 1
        }:v][${index}:v]blend=all_expr='A*(if(gte(T,${transitionDuration}),1,T/${transitionDuration}))+B*(1-(if(gte(T,${transitionDuration}),1,T/${transitionDuration})))'[v${index}];[v${
          index - 1
        }][v${index}]overlay=x='0':y='0':enable='between(t,${firstFrame},${
          firstFrame + transitionDuration
        })'[v${index}]`;
      })
      .join(";");

    command
      .input(audioPath)
      .complexFilter(filterComplex)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(
        "-pix_fmt yuv420p",
        "-profile:v main",
        "-movflags +faststart",
        "-r 30"
      )
      .format("mp4")
      .on("error", (error) => reject(error))
      .on("end", () => resolve())
      .save(outputPath);
  });
}

export async function createImageSequences2(
  imagePaths: string[],
  audioPath: string,
  frameDuration: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    const totalDuration = frameDuration * imagePaths.length;
    const transitionDuration = 1; // Duration of the transition in seconds

    // Create a list of image sequences with their durations
    const imageSequenceList = imagePaths
      .map((imagePath, index) => {
        const duration =
          index === 0 ? frameDuration : frameDuration - transitionDuration;
        return `file '${imagePath}'\nduration ${duration}\n`;
      })
      .join("");

    // Save the list to a temporary file
    const listFilePath = "temp_list.txt";
    fs.writeFileSync(listFilePath, imageSequenceList);

    command
      .input(listFilePath)
      .inputOptions(["-f concat", "-safe 0"])
      .videoFilters([
        {
          filter: "scale",
          options: "1080:1920",
        },
        {
          filter: "fps",
          options: "30",
        },
        {
          filter: "setpts",
          options: "PTS-STARTPTS",
        },
        {
          filter: "xfade",
          options: `transition=fade:duration=${transitionDuration}:offset=${frameDuration}`,
        },
      ]);
  });
}
