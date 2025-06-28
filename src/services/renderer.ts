// src/services/renderer.ts

import type { Scene } from '../parser/parser';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

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
export function generateSvg(frameState: FrameState, videoDimensions: { width: number; height: number }): string {
  const { width, height } = videoDimensions;
  
  // The coordinate system in our script is centered, but SVG's is top-left.
  // We need to transform coordinates. (0,0) in our script is (width/2, height/2) in SVG.
  // We also flip the Y-axis, since Y is positive downwards in SVG.
  const centerX = width / 2;
  const centerY = height / 2;

  // Let's define a scaling factor. Let's say 1 unit in our script = 50 pixels.
  const scale = 50;

  const elementsSvg = frameState.map(element => {
    const svgX = centerX + (element.x * scale);
    const svgY = centerY - (element.y * scale); // Flipped Y-axis

    switch(element.type) {
      case 'text':
        return `<text x="${svgX}" y="${svgY}" font-family="Arial" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="${element.opacity}">${element.content}</text>`;
      
      case 'circle':
        return `<circle cx="${svgX}" cy="${svgY}" r="${(element.radius || 1) * scale}" fill="blue" opacity="${element.opacity}" />`;
      
      // We will add more shapes like 'arrow' and 'box' here later
      default:
        return '';
    }
  }).join('\n  ');

  // Wrap the elements in a full SVG structure with a black background
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
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
  fps: number = 30
) {
  console.log(`\n--- Instrumenting Scene: "${scene.title}" ---`);
  
  let browser; // Declare browser outside the try block for access in catch

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`[LOG] Created directory: ${outputDir}`);
    }

    console.log('[LOG] Launching Puppeteer...');
    browser = await puppeteer.launch({
      // Adding common arguments that can resolve issues in sandboxed environments (like Docker/Gitpod)
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('[LOG] Puppeteer launched successfully.');

    const page = await browser.newPage();
    console.log('[LOG] New browser page created.');

    await page.setViewport(videoDimensions);
    console.log(`[LOG] Viewport set to ${videoDimensions.width}x${videoDimensions.height}.`);

    const totalFrames = Math.floor(scene.duration * fps);
    console.log(`[LOG] Preparing to render ${totalFrames} frames.`);
    
    for (let i = 0; i < totalFrames; i++) {
      const timeMs = (i / fps) * 1000;
      
      const frameState = calculateFrameState(scene, timeMs);
      const svgContent = generateSvg(frameState, videoDimensions);

      // Log the first frame's SVG content for debugging
      if (i === 0) {
        console.log('[LOG] --- SVG for Frame 0 ---');
        console.log(svgContent);
        console.log('[LOG] ----------------------');
      }

      await page.setContent(svgContent);
      
      const frameNumber = String(i).padStart(5, '0');
      const framePath = path.join(outputDir, `frame_${frameNumber}.png`);
      
      await page.screenshot({ path: framePath as `${string}.png` });

      // This log will now only appear if the screenshot is successful
      process.stdout.write(`🖼️  Successfully rendered frame ${i + 1}/${totalFrames}\r`);
    }

    console.log(`\n[LOG] Frame loop completed successfully.`);
    
    await browser.close();
    console.log('[LOG] Puppeteer browser closed normally.');

    console.log(`\n✅ Scene frames rendered successfully to ${outputDir}`);

  } catch (error) {
    // This is the most important new part!
    console.error('\n\n[FATAL] A critical error occurred during the rendering process.');
    console.error('----------------- ERROR DETAILS -----------------');
    console.error(error);
    console.error('-----------------------------------------------');
    
    // Ensure the browser is closed even if an error occurs to prevent zombie processes
    if (browser) {
      console.log('[LOG] Attempting to close browser after error...');
      await browser.close();
      console.log('[LOG] Puppeteer browser closed after error.');
    }
    
    // Re-throw the error so the main process knows to abort
    throw error;
  }
}