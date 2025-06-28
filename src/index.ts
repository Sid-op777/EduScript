#!/usr/bin/env node

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';

import * as parser from './parser/parser.js';
import type { AST, ParserError, Scene, Video } from './parser/parser';

import { generateAudio } from './services/tts2';
import { exportVideo, concatenateClips } from './services/exporter';
import { renderSceneFrames } from './services/renderer';
import { getAudioDurationInSeconds } from 'get-audio-duration';

console.log('📘 EduScript Engine v0.1');

yargs(hideBin(process.argv))
  .command(
    'build <filepath>',
    'Builds an EduScript file into a video',
    (yargs) => {
      return yargs.positional('filepath', {
        describe: 'Path to the .eduscript file',
        type: 'string',
      });
    },

    async (argv) => {
      const startTime = Date.now();
      console.log('Starting build process...');

      const filepath = argv.filepath as string;
      const outputDir = 'temp';

      // --- 1. PARSING ---
      if (!filepath || !fs.existsSync(filepath)) {
        console.error(`Error: File not found at '${filepath}'`);
        process.exit(1);
      }
      
      const scriptContent = fs.readFileSync(filepath, 'utf-8');
      let ast: AST;
      try {
        ast = parser.parse(scriptContent);
        console.log('✅ Script parsed successfully!');
      } catch (e: unknown) {
        console.error('❌ Error parsing script:');
        if (typeof e === 'object' && e !== null && 'location' in e) {
          const error = e as ParserError;
          console.error(`  Message: ${error.message}`);
          console.error(`  Location: Line ${error.location.start.line}, Column ${error.location.start.column}`);
        } else {
          console.error(e);
        }
        process.exit(1);
      }
      
      // --- 2. AUDIO GENERATION ---
      console.log('\n--- Generating Audio ---');

      //comment out for testing, it might hit rate limit otherwise
      //simulate sucessfull audio generation after 2 seconds
      setTimeout(() => {},2000);
      console.log('✅ All audio generated successfully!');

      // try{
      //   await Promise.all(
      //     ast.scenes.map(async (scene, index) => {
      //       const sceneAudioPath = path.join(outputDir, `scene_${index + 1}.mp3`);
      //       if (scene.narration) {
      //         await generateAudio(scene.narration, sceneAudioPath);
      //       }
      //     })
      //   );
      //   console.log('✅ All audio generated successfully!');
      // }catch(error){
      //   console.error('❌ Failed during audio generation. Aborting.');
      //   console.error(error); 
      //   process.exit(1);
      // }
      
      // --- 3. RENDER & EXPORT SCENE CLIPS ---
       console.log('\n--- Processing all scenes into video clips ---');
      const renderScale = 2;
      let clipPaths: string[] = [];
      
      try {
        // This function encapsulates all the work for a single scene.
        const processScene = async (scene: Scene, index: number): Promise<string | null> => {
          const sceneIndex = index + 1;
          console.log(`\n🎬 Starting processing for Scene ${sceneIndex}/${ast.scenes.length}: "${scene.title}"`);
          
          const sceneAudioPath = path.join(outputDir, `scene_${sceneIndex}.mp3`);
          const sceneFrameDir = path.join(outputDir, `scene_${sceneIndex}_frames`);
          const sceneClipPath = path.resolve(outputDir, `clip_${sceneIndex}.mp4`);

          if (!fs.existsSync(sceneAudioPath)) {
            console.warn(`[WARN] Skipping scene ${sceneIndex} because its audio file is missing.`);
            return null;
          }

          const audioDuration = await getAudioDurationInSeconds(sceneAudioPath);
          const finalClipDuration = Math.max(scene.duration, audioDuration);
          
          const scaledDimensions = {
            width: ast.video.dimensions.width * renderScale,
            height: ast.video.dimensions.height * renderScale,
          };
          
          // Render frames
          await renderSceneFrames(scene, scaledDimensions, sceneFrameDir, 30, renderScale, finalClipDuration);
          
          // Export individual clip
          await exportVideo(sceneFrameDir, sceneAudioPath, sceneClipPath, 30, ast.video.dimensions, finalClipDuration);
          
          return sceneClipPath;
        };
        
        // Run all scene processing jobs in parallel.
        const processedClips = await Promise.all(ast.scenes.map(processScene));
        // Filter out any nulls from skipped scenes.
        clipPaths = processedClips.filter((p): p is string => p !== null);

      } catch (error) {
        console.error('❌ A critical error occurred during scene processing. Aborting.', error);
        process.exit(1);
      }

      // --- 4. FINAL VIDEO EXPORT ---
      console.log('\n--- Assembling Final Video ---');
      if (clipPaths.length > 0) {
        try {
          const finalVideoPath = 'output.mp4';
          console.log('\n--- Assembling Final Video ---');
          await concatenateClips(clipPaths, finalVideoPath);

          const endTime = Date.now();
          const totalTime = ((endTime - startTime) / 1000).toFixed(2);
          console.log(`\n🎉🎉🎉 Build complete in ${totalTime}s! Your video is ready at ${finalVideoPath} 🎉🎉🎉`);
        } catch(error) {
          console.error('❌ Failed during final video concatenation. Aborting.', error);
          process.exit(1);
        }
      } else {
        console.warn('\n[WARN] No video clips were generated. Final video not created.');
      }
    }
  )
  .demandCommand(1, 'You must provide a command to run.')
  .help()
  .argv;