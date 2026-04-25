# — Deigner's toolbox

## Tagline

A browser-based image effects and compositing tool that treats computational image processing as a design practice

---

## Project Description

**This** is an in-browser design tool for applying computational image effects, compositing outputs into layered arrangements, and using AI to translate intuition into parameters. No installation is required for end users; the tool runs entirely in the browser.

The tool is organized around two modes:

**Effects** is the primary workspace. Users upload an image, select an effect, preview the output, and optionally capture it as a layer. A key feature is **person-aware processing**: using MediaPipe's person segmentation model, effects can be applied exclusively to detected human subjects in the frame — leaving the background untouched, or vice versa.

**Composition** is the collage and arrangement layer. Captured outputs stack as independent layers that can be reordered, toggled, and blended — a lightweight non-destructive compositing environment modeled loosely on Photoshop's layer system.

### Effects

**Texturize**
- *Noise* — Adds structured grain that preserves underlying form while destabilizing surface fidelity
- *ASCII* — Converts luminance values to a character grid; dense regions map to heavier glyphs, sparse regions dissolve
- *Find Edges* — Isolates edge gradients via convolution, reducing photographs to their own structural diagram

**Filter**
- *Frosted Glass* — Applies a masked blur; the image becomes simultaneously present and withheld
- *Gradient Map* — Remaps luminance values to a custom color ramp. This effect is AI-assisted: users can type a **vibe** in natural language (e.g. "late afternoon in a brutalist library" or "something between nausea and calm") and the Claude API generates a matching color gradient. The parameter space becomes linguistic.

**Generative Effect**
- *Pseudo-TD Tracking* — Simulates TouchDesigner-style feedback loops: the image accumulates traces of itself, producing smear and recursion artifacts
- *Draw to Chrome* — Renders the image as if reflected in a distorted metallic surface; form survives, color inverts, depth becomes unreliable

---

## Target Audience

This tool is for beginners, designers, artists, and researchers who likes to explore the nature of images and make free experiments — people who want to ask what an image is made of, not just what it depicts.

**Primary contexts:**
- Visual artists building a compositional practice around computational effects
- Designers exploring non-standard image processing for editorial, print, or screen work
- Students and researchers in computational media, HCI, or design who want a tool that exposes its own logic rather than concealing it

 It is for people who find the artifacts and process of image making interesting.

---

## Motivation

Most image editing tools are built around the metaphor of correction — you use them to get an image closer to how it "should" look. This project starts from the opposite assumption: that the interesting moment is when an image stops being what it was and becomes something else.

**Problems being addressed:**
- Creative software tends to naturalize its own operations, hiding the logic of what it's doing behind friendly UI. This tool does the opposite: the effect names are declarative, the pipeline is visible, and the results are often strange.
- The gap between a felt aesthetic intuition ("I want something colder, more withdrawn") and the technical parameters that produce it (specific hex values, gradient stops, luminance curves) is rarely bridged well. The AI-assisted Gradient Map is a direct attempt to close that gap.

**Research questions being explored:**
- Can natural language serve as a valid design parameter? Does describing a feeling produce a usable color structure?
- What happens to an image when the tool distinguishes figure from ground — when it knows where the body is?
- How does non-destructive layering change creative risk-taking? Does keeping every version make you more willing to experiment?
- What would it mean for a creative tool to have a point of view — not neutrality, but aesthetic judgment?

---

## Human-Centered Design Analysis

### Affordances and Anti-Affordances

The split-panel layout (Original Image | Output) affords direct comparison — the before and after are always simultaneously visible, so no effect is evaluated in isolation. The "Capture to Layer" button affords accumulation without commitment: you keep the output without closing off the possibility of generating another.

The tool deliberately **anti-affords** direct pixel editing. There are no brushes, no selection tools, no clone stamp. You cannot touch individual pixels. This restriction is intentional: it keeps the user operating at the level of processes and parameters rather than corrections. The tool is not a repair environment.

### Intentional Constraints

- Effects are applied globally or to detected persons only — there is no freehand masking. This forces the user to work with the logic of the segmentation model rather than override it.
- The Gradient Map's AI input accepts natural language but does not expose the color values it generates. The translation is opaque by design: you describe the atmosphere, the system handles the conversion, and you accept or reject the result.
- Composition mode has no undo history. Layers can be reordered or hidden, but captured outputs are permanent until deleted. This creates a small pressure toward intentionality in what you choose to keep.

### Signifiers

- Effect names are written in all-caps with no instructional description, signaling that they are categorical labels, not step-by-step guides. The user is expected to try, not to predict.
- The "APPLY EFFECT" button sits at the bottom of the sidebar and remains accessible regardless of scroll position — it is always the terminal action.
- "CAPTURE TO LAYER" and "EXPORT" are visually distinct in the top bar, indicating two different kinds of commitment: internal (to the session) versus external (to a file).
- The persistent "NO EFFECT SELECTED" label at the sidebar bottom functions as a workflow position indicator — it tells you where you are without requiring you to remember.
- The three-dot icons on each panel suggest further options exist without demanding engagement.

### Visual and Spatial Cues

The sidebar hierarchy (category label → effect buttons → apply action) creates a top-to-bottom flow that mirrors the intended workflow sequence. 
The two-panel main layout makes the spatial logic of before/after a persistent structural feature rather than a mode you toggle into.

### System Response to User Input

- Selecting an effect updates the sidebar state label and primes the Apply button
- Clicking Apply processes the canvas and renders output in the right panel
- Typing a vibe into the Gradient Map input and confirming triggers a Claude API call; the generated gradient is applied to the output panel
- Toggling Person Detection re-routes the effect pipeline through MediaPipe segmentation before applying, masking the result to the detected figure only

### Feedback

Feedback is primarily visual. The Output panel updates immediately on effect application, so the result of any action is visible within the same viewport as the original. There is no confirmation dialog for most operations — the output is the feedback. The Gradient Map AI call shows a brief loading state while the API responds, making the presence of external computation legible.

### Feedback Loops

The core loop is **apply → evaluate → capture or discard → apply again**. Because the original is always visible and the output always reflects the most recent application, users naturally develop a rhythm of variation: trying the same effect with different parameters, or chaining effects by capturing an output and re-uploading it as a new input. 


---

## Installation

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- An [Anthropic API key](https://console.anthropic.com/) (required for Gradient Map AI input)

### Setup

```bash
# Clone the repository
git clone https://github.com/yilinliu610/design-tool.git
cd design-tool

# Install dependencies
npm install

# Create a local environment file
cp .env.example .env.local
```

Open `.env.local` and add your Anthropic API key:

```
VITE_ANTHROPIC_API_KEY=your_key_here
```

### Run

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

---

## Usage

### Effects Mode

1. Click **+** in the Original Image panel or drag and drop an image file to upload
2. Select an effect from the left sidebar under Texturize, Filter, or Generative Effect
3. If using **Gradient Map**, type a vibe or atmosphere description into the text input — the Claude API will generate a matching color ramp before applying
4. Toggle **Person Detection** if you want the effect applied only to detected human subjects in the frame
5. Click **APPLY EFFECT** to process
6. Review the result in the Output panel
7. Click **CAPTURE TO LAYER** in the top bar to save this output to Composition mode

### Composition Mode

1. Switch to **COMPOSITION** in the top navigation
2. Captured outputs appear as stacked layers in the panel
3. Drag layers to reorder them
4. Toggle layer visibility with the eye icon
5. Adjust blend mode and opacity per layer as needed
6. Click **EXPORT** to download the composited result as a flat image

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

## Acknowledgments

### Technologies and Libraries

- [Vite](https://vitejs.dev/) — build tooling and dev server
- [React](https://react.dev/) — UI framework
- [Tailwind CSS](https://tailwindcss.com/) — utility-first styling
- [TensorFlow.js](https://www.tensorflow.org/js) — in-browser machine learning runtime
- [MediaPipe](https://developers.google.com/mediapipe) — person segmentation and detection
- [Anthropic Claude API](https://www.anthropic.com/) — natural language to color gradient translation
- HTML5 Canvas API — all image processing and compositing operations

### Inspiration and Design References

- [toooools.are.na](https://toooools.are.na/) — for the ethos of the small, opinionated, single-purpose tool
- TouchDesigner — for the feedback loop logic underlying Pseudo-TD Tracking


---

## Roadmap

### Distilled Critic

The most significant planned addition: a language model configured with the author's aesthetic sensibilities will watch your composition in real time and comment on formal decisions — density, rhythm, edge behavior, the spatial logic of filled versus empty space. The critic speaks unprompted after idle periods, or can be invoked directly. It has opinions. It can be ignored.

### Click-to-Subject Detection

Extend the current person-only segmentation to arbitrary subject selection: the user clicks anywhere on the image and the system identifies and masks that subject, allowing effects to be applied to objects, textures, architectural elements, or negative space — not only human figures.

### Gesture and Performative Parameter Control

Aaron's feedback during critique :), a future version will explore **performative interaction**: using webcam input to map body position, hand gestures, or movement to effect parameters in real time. Exploring the tool's capability from a studio instrument to a performance instrument like a live audiovisual setup than an image editor.

### Expanded Effect Library

- Halftone and risograph simulation
- Reaction-diffusion patterns seeded from image luminance values
- Optical flow trails from video input

### Video Input

Currently the tool processes static images only. A planned update will support video upload and frame-by-frame effect application, with export as GIF or MP4.
