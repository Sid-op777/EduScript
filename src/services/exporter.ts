import { exec } from 'child_process';
import fs from 'fs';
import { getAudioDurationInSeconds } from 'get-audio-duration';

/**
 * Uses ffmpeg to combine a sequence of frames and an audio file into a video.
 * @param framesDir Path to the directory containing the PNG frames.
 * @param audioPath Path to the audio file.
 * @param outputPath Path for the final output video.
 * @param fps The frames per second of the video.
 * @returns A promise that resolves when ffmpeg finishes.
 */
export async function exportVideo(
  framesDir: string,
  audioPath: string,
  outputPath: string,
  fps: number,
  targetDimensions: { width: number, height: number },
  finalClipDuration: number
): Promise<void> {
  console.log('\n--- Exporting Video ---');
  console.log(`[LOG] Using ffmpeg to combine frames and audio.`);

  console.log(`\n--- Exporting Video (Clip duration: ${finalClipDuration.toFixed(2)}s) ---`);

  return new Promise((resolve, reject) => {
    const framePattern = `${framesDir}/frame_%05d.png`;

    const command = [
      'ffmpeg',
      '-y',
      '-framerate', fps,
      '-i', `"${framePattern}"`,
      '-i', `"${audioPath}"`,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-vf', `scale=${targetDimensions.width}:${targetDimensions.height}`,
      '-t', finalClipDuration,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
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

/**
 * Uses ffmpeg to concatenate multiple video clips into a single video.
 * @param clipPaths An array of paths to the video clips.
 * @param outputPath The path for the final output video.
 * @returns A promise that resolves when ffmpeg finishes.
 */
export function concatenateClips(
  clipPaths: string[],
  outputPath: string
): Promise<void> {
  console.log('\n--- Concatenating Scene Clips ---');

  return new Promise((resolve, reject) => {
    // Create a temporary text file for ffmpeg's concat demuxer
    const listFilePath = 'temp/concat_list.txt';
    // The content of the file needs to be in the format: file '/path/to/clip.mp4'
    const fileContent = clipPaths.map(p => {
      const normalizedPath = p.replace(/\\/g, '/');
      return `file '${normalizedPath}'`;
    }).join('\n');
    
    try {
      fs.writeFileSync(listFilePath, fileContent);
      console.log(`[LOG] Created concat list file at ${listFilePath}`);
    } catch (error) {
      return reject(error);
    }
    
    const command = [
      'ffmpeg',
      '-y', // Overwrite output file
      '-f', 'concat', // Use the concat demuxer
      '-safe', '0', // Necessary for using absolute/relative paths in the list file
      '-i', `"${listFilePath}"`,
      '-c', 'copy', // Copy streams without re-encoding (very fast!)
      `"${outputPath}"`
    ].join(' ');

    console.log(`[LOG] Executing ffmpeg concat command:`);
    console.log(command);

    exec(command, (error, stdout, stderr) => {
      // Clean up the temporary list file
      fs.unlinkSync(listFilePath);

      if (error) {
        console.error(`\n[FATAL] ffmpeg concatenation failed:`);
        console.error(stderr);
        return reject(error);
      }
      console.log(`\n[LOG] ffmpeg stdout:`, stdout);
      console.log(`\n✅ Final video assembled successfully at ${outputPath}`);
      resolve();
    });
  });
}