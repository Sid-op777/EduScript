// This is the top-level rule.
Program
  = _ video:VideoBlock scenes:(_ SceneBlock)+ _? {
      return {
        type: "Program",
        video: video,
        scenes: scenes.map(s => s[1]) 
      };
    }

// --- Block Definitions ---

VideoBlock
  = "video" _ "{" _ props:VideoProperties _ "}" {
      return { type: "Video", ...props };
    }

SceneBlock
  = "scene" _ title:StringLiteral _ "{" _ props:SceneProperties+ _ "}" {
      const scene = props.reduce((acc, prop) => ({ ...acc, ...prop }), {});
      return { type: "Scene", title: title, ...scene };
    }

// --- Property Definitions within Blocks ---

VideoProperties
  = dimensions:Dimensions { return { dimensions } }

SceneProperties
  = prop:(Duration / Narration / VisualsBlock / TimelineBlock) _ { return prop; }

Dimensions
  = "dimensions" _ ":" _ "(" _ w:Integer _ "," _ h:Integer _ ")" {
      return { width: w, height: h };
    }

Duration
  = "duration" _ ":" _ d:DurationLiteral { return { duration: d } }

Narration
  = "narration" _ ":" _ text:StringLiteral { return { narration: text } }

// --- Visuals and Timeline Blocks ---

VisualsBlock
  = "visuals" _ "{" _ elements:VisualElement* _ "}" {
      return { visuals: elements };
    }

VisualElement
  = _ element:(TextElement / CircleElement) _ { return element; }

TextElement
  = "text" _ "(" _ content:StringLiteral _ "," _ id:IdProperty _ "," _ at:AtProperty _ ")" {
      return { type: "text", content, id, at };
    }

CircleElement
  = "circle" _ "(" _ id:IdProperty _ "," _ at:AtProperty _ "," _ radius:RadiusProperty _ ")" {
      return { type: "circle", id, at, radius };
    }

TimelineBlock
  = "timeline" _ "{" _ events:TimelineEvent* _ "}" {
      return { timeline: events };
    }

TimelineEvent
  = _ "at" _ "(" _ time:DurationLiteral _ ")" _ "{" _ animations:AnimationCommand* _ "}" {
      return { type: "at", time, animations };
    }

AnimationCommand
  = _ cmd:FadeCommand _ { return cmd; }

FadeCommand
  = "fade" _ "(" _ target:StringLiteral _ "," _ direction:("in" / "out") _ "," _ duration:DurationProperty _ ")" {
      return { type: "fade", target, direction, duration };
    }

// --- Reusable Property Rules ---

IdProperty = "id" _ ":" _ val:StringLiteral { return val }
AtProperty = "at" _ ":" _ "(" _ x:Number _ "," _ y:Number _ ")" { return { x, y } }
RadiusProperty = "radius" _ ":" _ val:Number { return val }
DurationProperty = "duration" _ ":" _ val:DurationLiteral { return val }

// --- Lexical Tokens / Primitives (The lowest level) ---

Number "number"
  = num:$( "-"? [0-9]+ ("." [0-9]+)? ) { return parseFloat(num); }

Integer "integer"
  = digits:[0-9]+ { return parseInt(digits.join(""), 10); }

StringLiteral "string"
  = '"' chars:([^"]*) '"' { return chars.join(""); }

DurationLiteral "duration"
  = val:Number "s" { return val; }

_ "whitespace"
  = ( [ \t\n\r] / Comment )*

Comment "comment"
  = "//" [^\n]*