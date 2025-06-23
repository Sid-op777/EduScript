#!/usr/bin/env node

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';

import * as parser from './parser/parser.js';
import type { AST, ParserError, Scene } from './parser/parser.d';
import { generateAudio } from './services/tts';

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
      console.log('Starting build process...');
      const filepath = argv.filepath as string;
      const outputDir = 'temp';

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
        // ... (error handling is the same)
        console.error('❌ Error parsing script:');
        if (typeof e === 'object' && e !== null && 'location' in e) {
          const error = e as ParserError;
          console.error(`  Message: ${error.message}`);
          console.error(`  Location: Line ${error.location.start.line}, Column ${error.location.start.column}`);
        } else {
          console.error(e);
        }
        process.exit(1); // Exit if parsing fails
      }

      // --- 2. AUDIO GENERATION ---
      console.log('\n--- Generating Audio ---');
      try {
        // We use Promise.all to run audio generation for all scenes in parallel
        await Promise.all(
          ast.scenes.map(async (scene, index) => {
            const sceneAudioPath = path.join(outputDir, `scene_${index + 1}.mp3`);
            if (scene.narration) {
              await generateAudio(scene.narration, sceneAudioPath);
            }
          })
        );
        console.log('✅ All audio generated successfully!');
      } catch (error) {
        console.error('❌ Failed during audio generation. Aborting.');
        process.exit(1);
      }
      console.log('\nNext step: Implement the Renderer.');
    }
  )
  .demandCommand(1, 'You must provide a command to run.')
  .help()
  .argv;