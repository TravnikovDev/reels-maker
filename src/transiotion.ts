import ffmpeg from "fluent-ffmpeg";

export async function createVideoSegment(
  imagePath: string,
  audioPath: string,
  segmentDuration: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .loop()
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(
        "-pix_fmt yuv420p",
        "-profile:v main",
        "-movflags +faststart",
        "-r 30"
      )
      .duration(segmentDuration)
      .format("mp4")
      .on("error", (error) => reject(error))
      .on("end", () => resolve())
      .save(outputPath);
  });
}

export async function concatenateWithCrossfade(
  segmentPaths: string[],
  crossfadeDuration: number,
  outputPath: string
): Promise<void> {
  const filters = [];

  // Generate video filters for crossfade transitions
  for (let i = 0; i < segmentPaths.length - 1; i++) {
    const start = i * (1 - crossfadeDuration);
    const end = (i + 1) * (1 - crossfadeDuration);
    filters.push(
      `[${i}:v]fade=out:st=${start}:d=${crossfadeDuration}:alpha=1[v${i}out]`
    );
    filters.push(
      `[${i + 1}:v]fade=in:st=${end}:d=${crossfadeDuration}:alpha=1[v${
        i + 1
      }in]`
    );
    filters.push(`[v${i}out][v${i + 1}in]overlay[vo${i + 1}]`);
  }

  // Generate filter chain
  const filterChain = filters.join(";");
  const finalFilter = `[0:v][0:a][vo${
    segmentPaths.length - 1
  }][1:a]concat=n=2:v=1:a=1[v][a]`;

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // Add video segments as input
    segmentPaths.forEach((segmentPath) => {
      command.input(segmentPath);
    });

    command
      .complexFilter([filterChain, finalFilter])
      .outputOptions("-map", "[v]", "-map", "[a]")
      .videoCodec("libx264")
      .audioCodec("aac")
      .format("mp4")
      .on("error", (error) => reject(error))
      .on("end", () => resolve())
      .save(outputPath);
  });
}
