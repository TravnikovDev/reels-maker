import ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";

export async function createSlidingVideo(
  imagePaths: string[],
  durations: number[],
  outputVideoPath: string
): Promise<void> {
  // Create video segments with specified durations
  const segmentPaths: string[] = [];
  for (let i = 0; i < imagePaths.length; i++) {
    const outputPath = path.join("output/resized", `segment_${i}.mp4`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(imagePaths[i])
        .loop(durations[i])
        .inputOptions(`-t ${durations[i]}`)
        .videoCodec("libx264")
        .output(outputPath)
        .on("error", (err) => reject(err))
        .on("end", () => {
          segmentPaths.push(outputPath);
          resolve();
        })
        .run();
    });
  }

  // Add transitions between segments
  const transitionPaths: string[] = [];
  for (let i = 0; i < segmentPaths.length - 1; i++) {
    const outputPath = path.join("output/resized", `transition_${i}.mp4`);
    const transitionDuration = 0.1;
    await new Promise<void>((resolve, reject) => {
      console.info(`Duration: ${durations[i+1] - durations[i] - transitionDuration}`)
      ffmpeg()
        .input(segmentPaths[i])
        .input(segmentPaths[i + 1])
        .complexFilter(
          [
            {
              filter: "xfade",
              options: {
                transition: i % 2 === 0 ? "slideright" : "slideleft",
                duration: transitionDuration,
                offset: durations[i+1] - durations[i] - transitionDuration,
              },
              inputs: ["0:v", "1:v"],
              outputs: "xfade",
            },
          ],
          "xfade"
        )
        .on("error", (err) => reject(err))
        .on("end", () => {
          transitionPaths.push(outputPath);
          resolve();  
        })
        .saveToFile(outputPath);
    });
  }

  await mergeSegments(transitionPaths, outputVideoPath);
}

async function mergeSegments(segmentPaths: string[], outputPath: string) {
  // Concatenate segments using FFmpeg
  const command = ffmpeg();

  // Loop through the segment paths, adding each as an input
  for (const segmentPath of segmentPaths) {
    command.input(segmentPath);
  }

  console.info(segmentPaths);
  // Build a complex filter using the 'concat' filter
  const filter = `concat=n=${segmentPaths.length}:v=1:a=0[out]`;

  await new Promise<void>((resolve, reject) => {
    command
      .complexFilter(filter, ["out"])
      .outputOptions("-pix_fmt", "yuv420p")
      .on("error", (err) => reject(err))
      .on("end", () => resolve())
      .saveToFile(outputPath);
  });

  // Remove the temporary segment files
  // for (const segmentPath of segmentPaths) {
  //   await fs.unlink(segmentPath);
  // }
}
