import { GoogleGenAI,} from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

function saveBinaryFile(fileName: string, content: Buffer) {
  writeFile(fileName, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file ${fileName}:`, err);
      return;
    }
    console.log(`File ${fileName} saved to file system.`);
  });
}

export async function generateAudio(text: string, outputFilePath: string) {

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const config = {
    temperature: 1,
    responseModalities: [
        'audio',
    ],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Algenib',
        }
      }
    },
  };
  const model = 'gemini-2.5-flash-preview-tts';
  const style_instruction = 'Read aloud in a warm, friendly, and confident tone, like a professional educational video narrator. Speak clearly and naturally, with slight enthusiasm and accurate enunciation. Vary your intonation to emphasize key ideas, and make complex information sound simple and engaging without sounding robotic or overly dramatic.';
  const contents = [{ parts: [{ text: `${style_instruction}:${text}`}] }];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  for await (const chunk of response) {
    const inlineData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData) continue;

    let fileExtension = mime.getExtension(inlineData.mimeType || '') || 'wav';
    let buffer = Buffer.from(inlineData.data || '', 'base64');

    // If extension isn't known, attempt to convert to WAV
    if (!mime.getExtension(inlineData.mimeType || '')) {
      buffer = convertToWav(inlineData.data || '', inlineData.mimeType || '');
    }

    saveBinaryFile(outputFilePath, buffer);
    break;
  }
}

interface WavConversionOptions {
  numChannels : number,
  sampleRate: number,
  bitsPerSample: number
}

function convertToWav(rawData: string, mimeType: string) {
  const options = parseMimeType(mimeType)
  const wavHeader = createWavHeader(rawData.length, options);
  const buffer = Buffer.from(rawData, 'base64');

  return Buffer.concat([wavHeader, buffer]);
}

function parseMimeType(mimeType : string) {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options : Partial<WavConversionOptions> = {
    numChannels: 1,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions) {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);                      // ChunkID
  buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
  buffer.write('WAVE', 8);                      // Format
  buffer.write('fmt ', 12);                     // Subchunk1ID
  buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);        // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
  buffer.writeUInt32LE(byteRate, 28);           // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
  buffer.write('data', 36);                     // Subchunk2ID
  buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

  return buffer;
}
