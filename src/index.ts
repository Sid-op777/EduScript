#!/usr/bin/env node

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';

console.log('📘 EduScript Engine v0.1');

// Use yargs to set up the command-line interface
yargs(hideBin(process.argv))
  .command(
    // The command syntax
    'build <filepath>',
    // The command description
    'Builds an EduScript file into a video',
    // Builder function to define options
    (yargs) => {
      return yargs.positional('filepath', {
        describe: 'Path to the .eduscript file',
        type: 'string',
      });
    },
    // Handler function that executes when the command is run
    (argv) => {
      console.log('Starting build process...');

      // The `argv` object contains the parsed arguments
      const filepath = argv.filepath as string;

      if (!filepath) {
        console.error('Error: File path is required.');
        process.exit(1);
      }
      
      console.log(`Input file: ${filepath}`);

      // Check if the file exists
      if (!fs.existsSync(filepath)) {
        console.error(`Error: File not found at '${filepath}'`);
        process.exit(1);
      }

      // At this point, we would start the real build process.
      // For the MVP, we just confirm that we can access the file.
      console.log('✅ File found. Core engine shell is working!');
      console.log('Next step: Implement the parser.');
    }
  )
  .demandCommand(1, 'You must provide a command to run.')
  .help()
  .argv;