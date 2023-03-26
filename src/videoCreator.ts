import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

const width = 1080;
const height = 1920;

async function createVideoSegment(
  imagePath: string,
  audioPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<void> {
  const duration = endTime - startTime;

  const command = `-y -i "${imagePath}" -i "${audioPath}" -filter_complex "[0:v]scale=${width}:${height},setsar=1,fps=30[img];[1:a]atrim=start=${startTime}:end=${endTime},asetpts=PTS-STARTPTS[aud]" -map "[img]" -map "[aud]" -t ${duration} -strict -2 "${outputPath}"`;

  try {
    await execAsync(`ffmpeg ${command}`);
  } catch (error) {
    console.error("Error during video segment creation:", error);
    throw error;
  }
}

async function concatVideoSegments(
  segmentPaths: string[],
  outputPath: string
): Promise<void> {
  const fileListPath = path.join(path.dirname(outputPath), "filelist.txt");

  try {
    const fileListContent = segmentPaths
      .map((segmentPath) => `file '${segmentPath}'`)
      .join("\n");
    fs.writeFileSync(fileListPath, fileListContent);

    const command = `-y -f concat -safe 0 -i "${fileListPath}" -c copy "${outputPath}"`;
    await execAsync(`ffmpeg ${command}`);
  } catch (error) {
    console.error("Error during video concatenation:", error);
    throw error;
  } finally {
    // Clean up the file list
    fs.unlinkSync(fileListPath);
  }
}

export { createVideoSegment, concatVideoSegments };
