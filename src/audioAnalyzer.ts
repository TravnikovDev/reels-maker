// import { exec } from 'child_process';
// import { promisify } from 'util';

// const execAsync = promisify(exec);

export async function getAudioPeakTimecodes(audioPath: string): Promise<number[]> {
  try {
    // Generate waveform data from the audio file
    const { stdout: waveformJSON } = await execAsync(
      `audiowaveform -i "${audioPath}" --pixels-per-second 10 -b 8 -o -`
    );
    const waveform = JSON.parse(waveformJSON);

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
    console.error('Error analyzing audio:', error);
    throw error;
  }
}

