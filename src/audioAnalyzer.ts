import * as util from "util";
import { exec } from "child_process";

const execPromise = util.promisify(exec);

export async function getAudioPeakTimecodes(
  audioPath: string,
  minTimeDiff: number = 0.2
): Promise<number[]> {
  try {
    const { stdout } = await execPromise(
      `audiowaveform -i "${audioPath}" --pixels-per-second 10 -b 8 -o - --output-format json`
    );
    const samples = JSON.parse(stdout).data;

    const maxAmplitude = Math.max(...samples);
    const peakThreshold = maxAmplitude * 0.8;

    let peakTimecodes: number[] = [];
    let lastPeakTime = -minTimeDiff;

    for (let i = 0; i < samples.length; i++) {
      const currentTime = i / 10;

      if (
        samples[i] >= peakThreshold &&
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
