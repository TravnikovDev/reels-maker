import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

// Set the path to the FFmpeg binary
ffmpeg.setFfmpegPath(`${ffmpegStatic}`);
ffmpeg.setFfprobePath(`${ffprobeStatic}`);

export async function concatenateVideoSegments(
  videoPaths: string[],
  transitionDuration: number,
  outputPath: string
): Promise<void> {
  try {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add all video segments as input
      videoPaths.forEach((videoPath) => {
        command.input(videoPath);
      });

      // Build the filter string for concatenation and transitions
      const filterString =
        videoPaths.map((_, index) => `[${index}:v][${index}:a]`).join("") +
        `concat=n=${videoPaths.length}:v=1:a=1[v][a];` +
        `[v]xfade=transition=fade:duration=${transitionDuration}:offset=PTS-STARTPTS[vout]`;

      command
        .videoFilters(filterString)
        .outputOptions("-map [vout]", "-map [a]")
        .videoCodec("libx264")
        .audioCodec("aac")
        .format("mp4")
        .on("error", (error) => reject(error))
        .on("end", () => resolve())
        .save(outputPath);
    });
  } catch (err) {
    console.log("concatenateVideoSegments error: ", err);
  }
}
``;
