import ffmpeg from "fluent-ffmpeg";

async function createVideoSegment(
  imagePath: string,
  duration: number,
  outputPath: string,
  fadeDuration: number
): Promise<void> {
  console.info(imagePath, duration, outputPath, fadeDuration);
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .loop(duration)
      .inputOptions("-t", `${duration}`)
      .videoFilters([
        {
          filter: "fade",
          options: `t=in:st=0:d=${fadeDuration}`,
        },
        {
          filter: "fade",
          options: `t=out:st=${duration - fadeDuration}:d=${fadeDuration}`,
        },
      ])
      .on("error", (err) => {
        reject(err);
      })
      .on("end", () => {
        resolve();
      })
      .save(outputPath);
  });
}

async function concatVideoSegments(
  segmentPaths: (string | undefined)[],
  outputPath: string,
  audioPath: string
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
          console.log(
            "An error occurred during concatVideoSegments: " + err.message
          );
        })
        .on("end", function () {
          console.log("Merging finished !");
          resolve();
        })
        .mergeToFile(outputPath, "output/temp");
    });
  } catch (err) {
    console.log("Error during concatenation: ", err);
  }
}

export { createVideoSegment, concatVideoSegments };
