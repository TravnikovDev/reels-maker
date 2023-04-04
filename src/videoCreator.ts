import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import concat from "ffmpeg-concat";

export async function createSlidingVideo(
  imagePaths: string[],
  durations: number[],
  outputVideoPath: string,
  duration: number
): Promise<void> {
  // Create temporary video clips with the correct durations
  const tempVideos = await createVideosFromImages(
    imagePaths,
    durations,
    duration
  );

  // Concatenate video clips with transitions
  await createTransitions(tempVideos, outputVideoPath);

  // Cleanup temporary video files
  // for (const tempVideo of tempVideos) {
  //   await fs.unlink(tempVideo);
  // }
}

async function createVideosFromImages(
  imagePaths: string[],
  durations: number[],
  totalDuration: number
): Promise<string[]> {
  const tempVideos: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    console.info(imagePaths[i]);
    const tempVideoPath = path.join("output/temp", `temp_${i}.mp4`);
    let videoDuration = durations[i + 1] - durations[i];
    if (isNaN(videoDuration)) {
      videoDuration = totalDuration - durations[i];
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(imagePaths[i])
        .loop(videoDuration)
        .outputOptions("-t", `${videoDuration}`)
        .outputOptions("-pix_fmt", "yuv420p")
        .on("error", (err) => reject(err))
        .on("end", () => {
          console.info(
            "Created video from: ",
            imagePaths[i],
            " and it's duration is ",
            videoDuration
          );
          tempVideos.push(tempVideoPath);
          resolve();
        })
        .save(tempVideoPath);
    });
  }

  return tempVideos;
}

async function createTransitions(
  videoPaths: string[],
  outputVideoPath: string
): Promise<void> {
  await concat({
    output: outputVideoPath,
    videos: videoPaths,
    transition: {
      name: 'circleopen',
      duration: 150
    },
  }).then(() => console.log("Concated..."));
}
