import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

// Load environment variables from .env file
dotenv.config();

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

/**
 * Generates an audio file from text using the updated and configured ElevenLabs API.
 * @param text The text to convert to speech.
 * @param outputFilePath The path to save the generated MP3 file.
 * @returns A promise that resolves when the file is successfully created.
 */
export async function generateAudio(text: string, outputFilePath: string): Promise<void> {
  console.log(`🎙️  Generating audio for: "${text.substring(0, 40)}..."`);

  return new Promise(async (resolve, reject) => {
    try {
      // Voice ID for "Antoni" - a good, clear voice.
      const voiceId = 'JBFqnCBsd6RMkjVDRZzb'; 

      const audioWebStream = await elevenlabs.textToSpeech.convert(voiceId, {
        text: text,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          useSpeakerBoost: true,
        },
      });

      // Convert the Web Stream into a Node.js-compatible Readable stream
      const audioNodeStream = Readable.fromWeb(audioWebStream as any);
      // ----------------------

      // Ensure the output directory exists
      const dir = path.dirname(outputFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const fileStream = fs.createWriteStream(outputFilePath);

      // Now we can pipe the Node.js stream to the file stream
      audioNodeStream.pipe(fileStream);

      fileStream.on('finish', () => {
        console.log(`✅ Audio saved to ${outputFilePath}`);
        resolve();
      });

      fileStream.on('error', (error) => {
        console.error('❌ Error writing audio file:', error);
        reject(error);
      });


    } catch (error) {
      console.error('❌ Error calling ElevenLabs API:', error);
      reject(error);
    }
  });
}