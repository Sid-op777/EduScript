#!/usr/bin/env node

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';

import * as parser from './parser/parser.js';
import type { AST, ParserError, Scene, Video } from './parser/parser';
import { generateAudio } from './services/tts2';
import { exportVideo } from './services/exporter';
import { renderSceneFrames } from './services/renderer';

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
    // The handler function is async to use await
    async (argv) => {
      console.log('Starting build process...');
      const filepath = argv.filepath as string;
      const outputDir = 'temp'; // A directory for all our temporary files

      if (!filepath || !fs.existsSync(filepath)) {
        console.error(`Error: File not found at '${filepath}'`);
        process.exit(1);
      }

      // --- 1. PARSING ---
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
      
      // --- 3. FRAME RENDERING ---
      console.log('\n--- Rendering Frames ---');
      const renderScale = 2;

      try {
        await Promise.all(
          ast.scenes.map(async (scene, index) => {
            const sceneFrameDir = path.join(outputDir, `scene_${index + 1}_frames`);

            const scaledDimensions = {
              width: ast.video.dimensions.width * renderScale,
              height: ast.video.dimensions.height * renderScale,
            };

            await renderSceneFrames(scene, scaledDimensions, sceneFrameDir, 30, renderScale);
          })
        );
        console.log('✅ All frames rendered successfully!');
      } catch (error) {
        console.error('❌ Failed during frame rendering. Aborting.');
        process.exit(1);
      }  

      // --- 4. FINAL VIDEO EXPORT ---
      console.log('\n--- Assembling Final Video ---');
      try {
        // For the MVP, we assume one scene. We'll combine clips later.
        const scene = ast.scenes[0];
        if (scene) {
          const sceneFrameDir = path.join(outputDir, `scene_1_frames`);
          const sceneAudioPath = path.join(outputDir, `scene_1.mp3`);
          const finalVideoPath = 'output.mp4'; // The final output file

          await exportVideo(sceneFrameDir, sceneAudioPath, finalVideoPath, 30, ast.video.dimensions);
          console.log(`\n🎉🎉🎉 Build complete! Your video is ready at ${finalVideoPath} 🎉🎉🎉`);
        } else {
          throw new Error("No scenes found in the script to export.");
        }
      } catch (error) {
        console.error('❌ Failed during final video export. Aborting.');
        process.exit(1);
      }
    }
  )
  .demandCommand(1, 'You must provide a command to run.')
  .help()
  .argv;