import * as fs from "fs";
import * as readline from "readline";
import ffmpeg from "fluent-ffmpeg";
import * as util from "util";
import { exec } from "child_process";

const execPromise = util.promisify(exec);

export async function getAudioPeakTimecodes(
  audioPath: string,
  minTimeDiff: number = 0.05
): Promise<number[]> {
  console.info(audioPath);
  try {
    const { stdout } = await execPromise(
      `audiowaveform -i "${audioPath}" --pixels-per-second 10 -b 8 -o - --output-format json`
    );
    const samples = JSON.parse(stdout).data;
    const absoluteAmplitude: Array<number> = [];
    console.info(samples);

    for (let i = 0; i < samples.length - 2; i += 2) {
      absoluteAmplitude.push(Math.abs(samples[i]) + Math.abs(samples[i + 1]));
    }

    const maxAmplitude = Math.max(...absoluteAmplitude);
    const peakThreshold = parseInt(`${maxAmplitude * 0.7}`);

    let peakTimecodes: number[] = [];
    let lastPeakTime = -minTimeDiff;

    for (let i = 0; i < absoluteAmplitude.length; i++) {
      console.info(i);
      const currentTime = i / 10;

      if (absoluteAmplitude[i] >= peakThreshold) {
        console.info(i, absoluteAmplitude[i], peakThreshold);
      }

      if (
        absoluteAmplitude[i] >= peakThreshold &&
        currentTime - lastPeakTime >= minTimeDiff
      ) {
        peakTimecodes.push(currentTime);
        lastPeakTime = currentTime;
      }
    }

    // Limit the number of peak timecodes to a maximum of 30
    if (peakTimecodes.length > 30) {
      const step = Math.floor(peakTimecodes.length / 30);
      peakTimecodes = peakTimecodes.filter(
        (_value, index) => index % step === 0
      );
    }

    console.log("Peak timecodes:", peakTimecodes);
    return peakTimecodes;
  } catch (error) {
    console.error("Error during audio analysis:", error);
    throw error;
  }
}

export async function audioCut() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const audioFilePath = "assets/audio/audio.mp3";
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
