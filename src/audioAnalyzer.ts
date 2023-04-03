import * as readline from "readline";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

import * as util from "util";
import * as fs from "fs";
import { exec } from "child_process";

const execPromise = util.promisify(exec);
const pixelsPerSecond = 10;

export async function getAudioPeakTimecodes(
  audioFilePath: string,
  minTimeDiff: number
): Promise<number[]> {
  const { stdout } = await execPromise(
    `audiowaveform -i "${audioFilePath}" --pixels-per-second ${pixelsPerSecond} -b 8 -o - --output-format json`
  );
  const samples = JSON.parse(stdout).data;

  // Calculate the moving average
  const windowSize = Math.floor(pixelsPerSecond * minTimeDiff);
  const movingAverages = [];
  for (let i = 0; i < samples.length - windowSize + 1; i += 2) {
    const windowSamples = samples.slice(i, i + windowSize * 2);
    const sum = windowSamples.reduce(
      (acc: number, curr: number, index: number) => {
        if (index % 2 === 0) {
          return acc + Math.abs(curr);
        }
        return acc;
      },
      0
    );
    movingAverages.push(sum / (windowSize * 2));
  }

  // Define the threshold value
  const threshold = 2 * Math.max(...movingAverages);
  console.info("threshold - ", threshold);

  // Identify the points that exceed the threshold and apply the minimum time difference constraint
  const peakTimecodes: number[] = [];
  let lastPeakTime = -minTimeDiff;
  for (let i = 0; i < samples.length; i += 2) {
    const currentTime = i / (pixelsPerSecond * 2);
    console.info(
      "sample & threadsold: ",
      Math.abs(samples[i]),
      `${Math.abs(samples[i]) > threshold ? " > " : " < "}`,
      threshold
    );
    if (
      Math.abs(samples[i]) > threshold &&
      currentTime - lastPeakTime >= minTimeDiff
    ) {
      peakTimecodes.push(currentTime);
      lastPeakTime = currentTime;
    }
  }

  return peakTimecodes;
}

export async function audioCut(audioFilePath: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const outputAudioFilePath = "output/trimmed_audio.mp3";

  const startTime = await new Promise<number>((resolve) => {
    rl.question(
      "Enter the start time (in seconds, format: 0.00):",
      (answer) => {
        resolve(parseFloat(answer));
      }
    );
  });

  const endTime = await new Promise<number>((resolve) => {
    rl.question("Enter the end time (in seconds, format: 0.00): ", (answer) => {
      resolve(parseFloat(answer));
    });
  });

  rl.close();

  if (isNaN(startTime) || isNaN(endTime)) {
    console.error("Invalid start or end time provided.");
    return;
  }

  const duration = endTime - startTime;

  if (duration < 5 || duration > 30) {
    console.error("Duration should be between 5 and 30 seconds.");
    return;
  }

  await trimAudio(audioFilePath, outputAudioFilePath, startTime, endTime);

  return endTime - startTime;
}

async function trimAudio(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    console.info("audio times", startTime, endTime - startTime);
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(outputPath)
      .on("error", (err) => {
        console.error("Error during audio trimming:", err.message);
        reject(err);
      })
      .on("end", () => {
        console.log("Audio trimming completed:", outputPath);
        resolve();
      })
      .run();
  });
}

export async function addAudioToVideo(
  videoInputPath: string,
  audioInputPath: string,
  outputPath: string,
  audioDuration: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(videoInputPath)
      .input(audioInputPath)
      .videoCodec("copy")
      .audioCodec("aac")
      .outputOptions("-t", `${audioDuration}`)
      .on("error", (err) => {
        reject(err);
      })
      .on("end", () => {
        resolve();
      })
      .save(outputPath);
  });
}

export async function getAudioFiles(): Promise<string[]> {
  const audioFiles = await fs.promises.readdir("assets/audio");
  return audioFiles.filter((file) => /\.(mp3|wav)$/i.test(file));
}

export async function selectAudioFile(audioFiles: string[]): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Available audio files:");
  audioFiles.forEach((file, index) => {
    console.log(`${index + 1}: ${file}`);
  });

  const selectedFile = await new Promise<number>((resolve) => {
    rl.question("Select an audio file by entering its number: ", (answer) => {
      const index = parseInt(answer);
      if (isNaN(index) || index < 1 || index > audioFiles.length) {
        console.error("Invalid selection. Please try again.");
        return resolve(-1);
      }
      resolve(index - 1);
    });
  });

  rl.close();

  if (selectedFile === -1) {
    return selectAudioFile(audioFiles);
  }

  return path.join("assets/audio", audioFiles[selectedFile]);
}
