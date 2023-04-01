import ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";

export async function createSlidingVideo(
  imagePaths: string[],
  durations: number[],
  outputVideoPath: string
): Promise<void> {
  // First loop - create video segments with slideright transition
  const intermediateVideos: string[] = [];
  for (let i = 0; i < imagePaths.length - 1; i += 2) {
    console.info(`intermediate_${i}.mp4`);
    const outputPath = path.join("output/resized", `intermediate_${i}.mp4`);

    const command = ffmpeg();
    command
      .input(imagePaths[i])
      .loop(durations[i])
      .inputOptions(`-t ${durations[i]}`);
    command
      .input(imagePaths[i + 1])
      .loop(durations[i + 1])
      .inputOptions(`-t ${durations[i + 1]}`);
    console.info(
      imagePaths[i],
      durations[i],
      imagePaths[i + 1],
      durations[i + 1]
    );

    const filter = [
      {
        filter: "setpts",
        options: "PTS-STARTPTS",
        inputs: "0:v",
        outputs: "video0",
      },
      {
        filter: "setpts",
        options: "PTS-STARTPTS",
        inputs: "1:v",
        outputs: "video1",
      },
      {
        filter: "xfade",
        options: {
          transition: "slideright",
          duration: 0.2,
          offset: durations[i] - 0.1,
        },
        inputs: ["video0", "video1"],
        outputs: "slideright",
      },
    ];

    await new Promise<void>((resolve, reject) => {
      command
        .complexFilter(filter, "slideright")
        .on("error", (err) => reject(err))
        .on("end", () => {
          intermediateVideos.push(outputPath);
          resolve();
        })
        .saveToFile(outputPath);
      console.info(outputPath);
    });
  }
  // Second loop - concatenate video segments using slideleft transition
  let currentVideos = intermediateVideos;
  while (currentVideos.length > 1) {
    const nextVideos: string[] = [];

    for (let i = 0; i < currentVideos.length - 1; i += 2) {
      const outputPath = path.join(
        "output/resized",
        `intermediate_${currentVideos.length}_${i}.mp4`
      );

      const command = ffmpeg();
      command.input(currentVideos[i]);
      command.input(currentVideos[i + 1]);

      const filter = [
        {
          filter: "setpts",
          options: "PTS-STARTPTS",
          inputs: "0:v",
          outputs: "video0",
        },
        {
          filter: "setpts",
          options: "PTS-STARTPTS",
          inputs: "1:v",
          outputs: "video1",
        },
        {
          filter: "xfade",
          options: {
            transition: "slideleft",
            duration: 0.2,
            offset: durations[i] - 0.1,
          },
          inputs: ["video0", "video1"],
          outputs: "slideleft",
        },
      ];

      await new Promise<void>((resolve, reject) => {
        command
          .complexFilter(filter, "slideleft")
          .on("error", (err) => reject(err))
          .on("end", () => {
            nextVideos.push(outputPath);
            resolve();
          })
          .saveToFile(outputPath);
      });

      // Delete the input video segment after using it
      await fs.unlink(currentVideos[i]);
      if (i + 1 < currentVideos.length) {
        await fs.unlink(currentVideos[i + 1]);
      }
    }

    currentVideos = nextVideos;
  }

  // Rename the final video to the desired output path
  await fs.rename(currentVideos[0], outputVideoPath);
}
