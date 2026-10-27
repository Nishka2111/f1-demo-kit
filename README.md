# Formula 3D Interactive Lab Demo

Exact standalone replica of the [Patrick Heintzmann Formula Lab Demo](https://lab.patrickheintzmann.com/demo/demoFormula).

## Features

- **Interactive 3D WebGL Formula Car**:
  - **Kit Mode**: Exploded assembly view of the model kit sprue and components.
  - **Drive Mode**: Physics-driven driving simulation powered by Rapier 3D with realistic suspension, tire physics, keyboard controls (WASD / Arrow keys), and mobile virtual joystick support.
  - **Studio Mode**: High-fidelity studio lighting and turntable inspection view.
- **Complete Local Asset Pipeline**:
  - Full 3D GLB models (Formula car, tools, cutting mat, desk supplies, sprues).
  - High-res PBR texture maps (Base Color, ORM, Normal maps).
  - Draco 3D mesh decoders (WebAssembly).
  - Rapier 3D physics engine with inlined WebAssembly.
  - Custom UI fonts (Geist, Agency FB).
  - Zero external cloud dependencies — runs completely offline.

## Quick Start

You can run the demo using the included zero-dependency Node.js server:

```bash
# In the project directory:
node dev-server.js
```

Or using npm:

```bash
npm start
```

Then open:
[http://localhost:3000](http://localhost:3000) or [http://localhost:3000/demo/demoFormula/](http://localhost:3000/demo/demoFormula/)

## Controls

- **W / Up Arrow**: Accelerate
- **S / Down Arrow**: Reverse / Brake
- **A / Left Arrow**: Steer Left
- **D / Right Arrow**: Steer Right
- **Mode Buttons**: Switch between **Kit**, **Drive**, and **Studio**
- **Mouse / Touch**: Orbit camera, pan, zoom, and interactive virtual joystick on touchscreens
