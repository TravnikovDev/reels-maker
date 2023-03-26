import { exec } from "child_process";
import { promisify } from "util";
import ffmpeg from "fluent-ffmpeg";

const execAsync = promisify(exec);

async function convertMP3toWAV(
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec("pcm_s16le")
      .format("wav")
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

async function getAudioPeakTimecodes2(
  audioPath: string
): Promise<number[]> {
  try {
    // Convert MP3 to WAV
    const wavAudioPath = audioPath.replace(/\.mp3$/, ".wav");
    await convertMP3toWAV(audioPath, wavAudioPath);

    // Generate waveform data from the WAV audio file
    const { stdout: waveformJSON } = await execAsync(
      `audiowaveform -i "${wavAudioPath}" --pixels-per-second 10 -b 8 -o - --output-format json`
    );
    const waveform = JSON.parse(waveformJSON);

    // Remove the temporary WAV file
    // fs.unlinkSync(wavAudioPath);

    // Extract peak timecodes
    const peakTimecodes: number[] = [];
    const samples = waveform.data;
    const threshold = 0.8;
    const minTimeDiff = 0.2;
    let lastPeakTime = -minTimeDiff;

    for (let i = 0; i < samples.length; i++) {
      const currentTime = i / waveform.sample_rate;
      const amplitude = Math.abs(samples[i]);

      if (amplitude >= threshold && currentTime - lastPeakTime >= minTimeDiff) {
        peakTimecodes.push(currentTime);
        lastPeakTime = currentTime;
      }
    }

    // Limit the number of peak timecodes to a maximum of 30
    if (peakTimecodes.length > 30) {
      peakTimecodes.splice(30);
    }

    return peakTimecodes;
  } catch (error) {
    console.error("Error analyzing audio:", error);
    throw error;
  }
}

async function getAudioPeakTimecodes(audioPath: string): Promise<number[]> {
  try {
    const { stdout: waveformJSON } = await execAsync(
      `audiowaveform -i "${audioPath}" --pixels-per-second 10 -b 8 -o - --output-format json`
    );

    const waveform = JSON.parse(waveformJSON);
    const data = waveform.data;

    const threshold = 0.8 * Math.max(...data);
    const minTimeDiff = 0.2;

    const peakTimecodes: number[] = [];
    let lastPeakTime = -minTimeDiff;

    for (let i = 0; i < data.length; i++) {
      const currentTime = i / waveform.sample_rate;
      const amplitude = Math.abs(data[i]);

      if (amplitude >= threshold && currentTime - lastPeakTime >= minTimeDiff) {
        peakTimecodes.push(currentTime);
        lastPeakTime = currentTime;
      }
    }

    // Limit the number of peak timecodes to a maximum of 30
    if (peakTimecodes.length > 30) {
      peakTimecodes.length = 30;
    }

    return peakTimecodes;
  } catch (error) {
    console.error("Error during audio analysis:", error);
    throw error;
  }
}

export { getAudioPeakTimecodes, getAudioPeakTimecodes2 };
