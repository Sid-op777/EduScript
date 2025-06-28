// src/services/exporter.ts

import { exec } from 'child_process';

/**
 * Uses ffmpeg to combine a sequence of frames and an audio file into a video.
 * @param framesDir Path to the directory containing the PNG frames.
 * @param audioPath Path to the audio file.
 * @param outputPath Path for the final output video.
 * @param fps The frames per second of the video.
 * @returns A promise that resolves when ffmpeg finishes.
 */
export function exportVideo(
  framesDir: string,
  audioPath: string,
  outputPath: string,
  fps: number
): Promise<void> {
  console.log('\n--- Exporting Video ---');
  console.log(`[LOG] Using ffmpeg to combine frames and audio.`);

  return new Promise((resolve, reject) => {
    // Note: The frame pattern for ffmpeg on Windows might be different.
    // This pattern '%05d' matches frame_00000.png, frame_00001.png, etc.
    const framePattern = `${framesDir}/frame_%05d.png`;

    const command = [
      'ffmpeg',
      '-y', // Overwrite output file
      '-framerate', fps,
      '-i', `"${framePattern}"`,
      '-i', `"${audioPath}"`,
      '-map', '0:v:0', // Map video from first input
      '-map', '1:a:0', // Map audio from second input
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k', // Set a good audio bitrate
      '-shortest',
      `"${outputPath}"`
    ].join(' ');

    console.log(`[LOG] Executing ffmpeg command:`);
    console.log(command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`\n[FATAL] ffmpeg execution failed:`);
        console.error(stderr);
        return reject(error);
      }
      console.log(`\n[LOG] ffmpeg stdout:`, stdout);
      console.log(`\n✅ Video exported successfully to ${outputPath}`);
      resolve();
    });
  });
}