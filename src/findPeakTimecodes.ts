import * as fs from "fs";
import sharp from "sharp";
// import { AudioContext } from "web-audio-api";
// import { decode } from "audiobuffer-to-wav";

const MIN_TIME_DIFFERENCE = 0.2;
const MAX_PEAKS = 30;

export async function findPeakTimecodes(audioFile: string): Promise<number[]> {
  const audioContext = new AudioContext();

  const fileBuffer = fs.readFileSync(audioFile);
  const audioData = new Uint8Array(fileBuffer.buffer);

  const peaks: number[] = [];

  const findPeaks = (audioBuffer: AudioBuffer) => {
    const channelData = audioBuffer.getChannelData(0);
    const threshold = 0.95;
    let lastPeakTime = -MIN_TIME_DIFFERENCE;

    for (let i = 0; i < channelData.length; i++) {
      const currentTime = i / audioBuffer.sampleRate;
      const amplitude = Math.abs(channelData[i]);

      if (
        amplitude >= threshold &&
        currentTime - lastPeakTime >= MIN_TIME_DIFFERENCE
      ) {
        peaks.push(currentTime);
        lastPeakTime = currentTime;

        if (peaks.length >= MAX_PEAKS) {
          break;
        }
      }
    }
  };

  await new Promise<void>((resolve, reject) => {
    audioContext.decodeAudioData(
      audioData.buffer,
      (audioBuffer: AudioBuffer) => {
        if (audioBuffer) {
          findPeaks(audioBuffer);
          resolve();
        } else {
          reject(new Error("Error decoding audio data"));
        }
      }
    );
  });

  return peaks;
}
