export interface Video {
  type: 'Video';
  dimensions: {
    width: number;
    height: number;
  };
}

export interface Scene {
  type: 'Scene';
  title: string;
  duration: number;
  narration?: string;
  visuals: any[];
  timeline: any[];
}
    
export interface AST {
  type: 'Program';
  video: Video;
  scenes: Scene[];
}

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

export function parse(input: string): AST;