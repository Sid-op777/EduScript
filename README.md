# EduScript

**Notice:** This project is currently under active development. The features and APIs described below represent the full project vision and may not all be implemented in the current version.

[![Build Status](https://img.shields.io/badge/build-wip-yellow)](https://github.com/Sid-op777/EduScript)
[![License](https://img.shields.io/badge/license-NonCommercial-blue.svg)](./LICENSE)

EduScript is a declarative scripting language and rendering engine for the programmatic generation of structured, animated educational videos.

## Vision

The goal of EduScript is to create a complete system that bridges the gap between structured text and dynamic multimedia. It enables developers, educators, and advanced AI models to author compelling video content by describing narration, visuals, and complex animations in a clean, human-readable, and version-controllable format.

This system is designed to serve as a foundational layer for AI-driven content platforms, automated lesson generation, and any application requiring programmatic video creation.

## Key Features

*   **Declarative DSL:** A powerful, intuitive Domain-Specific Language for describing every aspect of a video. Instead of imperative commands, you define the desired end state, and the engine handles the execution.
*   **Rich Visual Primitives:** Support for a wide range of visual elements, including `text`, `box`, `circle`, `arrow`, `image`, `code`, and `latex` for mathematical formulas.
*   **Expressive Animation Engine:** A robust timeline system for coordinating complex animations. Supports sequential and grouped animations, and expressive verbs like `fade`, `move`, `draw`, `write`, `transform`, and `morph`.
*   **Layout Management:** An intelligent layout system with containers like `stack` and `row` for automatic alignment and distribution of elements, removing the need for manual coordinate calculations.
*   **Theming and Styling:** A CSS-like styling system allows for the creation of reusable themes and styles to ensure visual consistency across videos.
*   **Narration-Synced Events:** A killer feature to trigger animations precisely when specific words are spoken, creating tightly synchronized and professional-feeling content.
*   **Full Programmatic Control:** A REST API provides endpoints for validation, building, and retrieving generated videos, enabling full integration into automated workflows.
*   **LLM-Centric Design:** The syntax, API, and error feedback mechanisms are designed to be "LLM-friendly," enabling self-correction loops where an AI can iteratively fix its own generated scripts.

## Usage and Workflow

The EduScript engine can be utilized through multiple workflows catering to different users.

### 1. CLI-Based Generation

The primary interface for developers and automated systems is the command-line tool.

**Installation & Setup:**

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/Sid-op777/EduScript.git
    cd EduScript
    ```
2.  **Install dependencies:**
    ```sh
    npm install
    ```
3.  **Set up environment variables:**
    Copy the `.env.example` to `.env` and add your API keys (e.g., for TTS services).

**Building a Video:**

```sh
# This command executes the full build pipeline
npm run dev -- build ./examples/lesson.eduscript
```

### 2. API-Driven Workflow (for Developers)

A REST API allows for programmatic interaction with the engine.

*   `POST /validate`: Submit a script for syntax and logical validation before committing to a full build.
*   `POST /build`: Submit a valid script and associated assets to begin an asynchronous video generation job.
*   `GET /status/{jobId}`: Poll for the status of a build job and retrieve the final video URL upon completion.

### 3. Web-Based IDE (for Creators)

A future goal includes a web-based interface providing a live editor with a real-time preview, allowing non-technical creators to write and refine EduScript files visually.

## The EduScript Language

EduScript uses a clean, block-based syntax. Below is an example showcasing a wide range of planned features.

### Full Example Script

```eduscript
// Define global video properties and reusable styles
video "Advanced Vector Operations" {
  dimensions: (1920, 1080)
  voice: "elevenlabs::antoni"

  styles {
    heading {
      font_family: "Inter"
      font_size: 48pt
      color: "#FFFFFF"
    }
    body_text {
      font_family: "Calibri"
      font_size: 24pt
      color: "#F0F0F0"
    }
    highlight_code {
      background_color: "#282c34"
      stroke_color: "#F5A623"
      stroke_width: 2px
    }
  }
}

// A scene demonstrating various features
scene "Vector Dot Product" {
  duration: 15s
  narration: "The dot product of two vectors, A and B, is a scalar value. It is calculated by multiplying their corresponding components and [summing] the results."

  visuals {
    text("Dot Product", id: "title", at: canvas.top_center + (0, -1), style: "heading")
    
    // Use a layout container for clean alignment
    row(id: "vectors", at: (0, 0), spacing: 4) {
      code("A = [2, 3]", id: "vecA")
      latex("•", id: "dot_symbol")
      code("B = [4, 1]", id: "vecB")
    }

    latex("A • B = (2)(4) + (3)(1) = 8 + 3 = 11", id: "calculation", at: (0, -3), style: "body_text")
  }

  timeline {
    // Start with the calculation invisible
    at(0s) {
      fade("calculation", out, duration: 0s)
    }

    // A sequence of animations
    sequence {
      // Group animations to run them simultaneously
      group {
        fade("title", in, duration: 1s)
        fade("vectors", in, duration: 1.5s)
      }
      
      // Animate based on a spoken word in the narration
      on_narration("summing") {
        fade("calculation", in, duration: 1s)
        style("vecA", style: "highlight_code")
        style("vecB", style: "highlight_code")
      }
    }
  }
}
```

## License

EduScript is licensed under the EduScript License v1.0 — a custom non-commercial copyleft license.

- You are free to use, modify, and distribute this software for **non-commercial purposes only**.
- Any derivatives must be licensed under the same terms.
- Commercial use is prohibited without explicit permission.
- Contributions are subject to approval by the project maintainers.

See the [`LICENSE`](./LICENSE) file for the full license text.

Understood. You want a comprehensive, forward-looking README that describes the full vision of the project, tailored for your specific GitHub repository. It should act as a complete project manifest, with a notice at the top indicating that it's a work in progress.

Here is the revised, professional README, updated to your specifications.
