// src/parser/parser.d.ts

// This interface describes the structure of the AST our parser produces.
// We can make this more detailed later, but `any` is a good start.
export interface AST {
  type: 'Program';
  video: any;
  scenes: Scene[]; // Use the specific Scene type here
}

export interface Scene {
  type: 'Scene';
  title: string;
  duration: number;
  narration?: string; // Make narration optional
  visuals: any[];
  timeline: any[];
}

// This interface describes the shape of a Peggy parsing error.
export interface ParserError extends Error {
  message: string;
  location: {
    start: {
      line: number;
      column: number;
      offset: number;
    };
    end: {
      line: number;
      column: number;
      offset: number;
    };
  };
}

// This is the most important part. We declare the `parse` function.
// It takes a string (the script content) and returns our AST structure.
// It can also throw a ParserError.
export function parse(input: string): AST;