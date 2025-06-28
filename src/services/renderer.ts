// src/services/renderer.ts

import type { Scene } from '../parser/parser';
import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

// Defines the state of a single visual element at a specific moment in time.
interface ElementState {
  id: string;
  type: 'text' | 'circle'; // For now, we support text and circle
  opacity: number;
  // We'll add more properties like position (x, y) and size here later
  content?: string; // For text elements
  radius?: number;  // For circle elements
  x: number;
  y: number;
}

// A snapshot of the entire canvas at a specific moment.
type FrameState = ElementState[];

/**
 * Calculates the state of all elements for a single frame at a specific time.
 * @param scene The AST for the scene.
 * @param timeMs The current time in milliseconds.
 * @returns A FrameState array describing what to draw.
 */
export function calculateFrameState(scene: Scene, timeMs: number): FrameState {
  const timeS = timeMs / 1000; // Convert time to seconds for comparison with our AST
  const frameState: FrameState = [];

  // 1. Initialize all visual elements from the AST
  for (const element of scene.visuals) {
    frameState.push({
      id: element.id,
      type: element.type,
      opacity: 1, // Start with full opacity by default
      content: element.content,
      radius: element.radius,
      // For the MVP, position is static and doesn't change
      x: element.at.x, 
      y: element.at.y,
    });
  }

  // 2. Apply timeline animations
  // This is the core animation logic!
  for (const event of scene.timeline) {
    if (event.type === 'at') {
      for (const anim of event.animations) {
        if (anim.type === 'fade') {
          const targetElement = frameState.find(el => el.id === anim.target);
          if (!targetElement) continue; // Skip if target not found

          const animStartTime = event.time; // e.g., 1s
          const animDuration = anim.duration; // e.g., 1.5s
          const animEndTime = animStartTime + animDuration;

          if (anim.direction === 'out' && animDuration === 0) {
            // Special case: instant fade out (making it invisible from the start)
            if (timeS >= animStartTime) {
              targetElement.opacity = 0;
            }
          } else if (timeS >= animStartTime && timeS <= animEndTime) {
            // The animation is currently active
            const progress = (timeS - animStartTime) / animDuration;
            if (anim.direction === 'in') {
              targetElement.opacity = progress; // Fades from 0 to 1
            } else { // 'out'
              targetElement.opacity = 1 - progress; // Fades from 1 to 0
            }
          } else if (timeS > animEndTime) {
            // The animation is finished, lock the final state
            targetElement.opacity = (anim.direction === 'in') ? 1 : 0;
          }
        }
      }
    }
  }

  return frameState;
}

/**
 * Generates an SVG string from a given FrameState.
 * @param frameState The state of all elements to render.
 * @param videoDimensions The dimensions of the video.
 * @returns A string containing the full SVG markup.
 */
export function generateSvg(
  frameState: FrameState,
  videoDimensions: { width: number; height: number },
  renderScale: number
): string {
  const { width, height } = videoDimensions;
  
  // The coordinate system in our script is centered, but SVG's is top-left.
  // We need to transform coordinates. (0,0) in our script is (width/2, height/2) in SVG.
  // We also flip the Y-axis, since Y is positive downwards in SVG.
  const centerX = width / 2;
  const centerY = height / 2;

  // Let's define a scaling factor. Let's say 1 unit in our script = 50 pixels.
  const baseScale = 50;

  const elementsSvg = frameState.map(element => {
    const svgX = centerX + (element.x * baseScale * renderScale);
    const svgY = centerY - (element.y * baseScale * renderScale);

    switch(element.type) {
      case 'text':
        // --- FIX: Scale the font-size ---
        const fontSize = 40 * renderScale;
        return `<text x="${svgX}" y="${svgY}" font-family="Arial" font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="${element.opacity}">${element.content}</text>`;
      
      case 'circle':
        // --- FIX: Scale the radius ---
        const radius = (element.radius || 1) * baseScale * renderScale;
        return `<circle cx="${svgX}" cy="${svgY}" r="${radius}" fill="blue" opacity="${element.opacity}" />`;
      
      default:
        return '';
    }
  }).join('\n  ');

  // Wrap the elements in a full SVG structure with a black background
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
    <rect width="100%" height="100%" fill="black" />
    ${elementsSvg}
  </svg>
    `.trim();
  }


/**
 * Renders a sequence of frames for a given scene.
 * @param scene The scene AST.
 * @param videoDimensions Dimensions of the video.
 * @param outputDir The directory to save the frames in.
 * @param fps The frames per second for the video.
 */
export async function renderSceneFrames(
  scene: Scene,
  videoDimensions: { width: number; height: number },
  outputDir: string,
  fps: number = 30,
  renderScale: number 
) {
  console.log(`\n--- Rendering Scene: "${scene.title}" [Engine: resvg] ---`);

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      // console.log(`[LOG] Created directory: ${outputDir}`);
    }

    const totalFrames = Math.floor(scene.duration * fps);

    const opts = {
      background: 'rgba(0, 0, 0, 1)', // Black background
      fitTo: {
        mode: 'original' as const,
      },
      font: {
        loadSystemFonts: true, // This is important!
      },
    };

    for (let i = 0; i < totalFrames; i++) {
      const timeMs = (i / fps) * 1000;
      
      // This logic remains the same
      const frameState = calculateFrameState(scene, timeMs);
      const svgContent = generateSvg(frameState, videoDimensions, renderScale);

      // --- NEW RENDERING LOGIC ---
      const resvg = new Resvg(svgContent, opts);
      const pngData = await resvg.render();
      const pngBuffer = pngData.asPng();
      // -------------------------

      const frameNumber = String(i).padStart(5, '0');
      const framePath = path.join(outputDir, `frame_${frameNumber}.png`);
      
      // Write the buffer directly to a file
      await fs.promises.writeFile(framePath, pngBuffer);

      // --- Optional: A nicer progress bar ---
      const barLength = 40;
      const progress = (i + 1) / totalFrames;
      const filledLength = Math.round(barLength * progress);
      const bar = '█'.repeat(filledLength) + '─'.repeat(barLength - filledLength);

      process.stdout.write(
        `\r🖼️  Rendering frames: [\x1b[32m${bar}\x1b[0m] ${i + 1}/${totalFrames}`
      );
    }

    process.stdout.write('\n'); 
    console.log(`✅ Scene frames rendered successfully to ${outputDir}`);

  } catch (error) {
    console.error('\n\n[FATAL] A critical error occurred during the rendering process.');
    console.error('----------------- ERROR DETAILS -----------------');
    console.error(error);
    console.error('-----------------------------------------------');
    
    throw error;
  }
}