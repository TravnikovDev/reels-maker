import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Set the path to the FFmpeg binary
ffmpeg.setFfmpegPath(`${ffmpegStatic}`);

export async function createImageSequences(
  imagePaths: string[],
  audioPath: string,
  frameDuration: number[],
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    imagePaths.forEach((imagePath, index) => {
      command.input(imagePath).duration(frameDuration[index]);
    });

    command
      .input(audioPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions('-pix_fmt yuv420p', '-profile:v main', '-movflags +faststart', '-r 30')
      .format('mp4')
      .on('error', (error) => reject(error))
      .on('end', () => resolve())
      .save(outputPath);
  });
}
