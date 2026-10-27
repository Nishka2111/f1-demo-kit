# Formula 3D Interactive Lab Demo

Exact standalone replica of the [Patrick Heintzmann Formula Lab Demo](https://lab.patrickheintzmann.com/demo/demoFormula).

# Formula One Lab — Interactive 3D Engineering Explorer

Explore the engineering behind Formula One cars through an interactive 3D experience. **Formula One Lab** combines 3D visualization with educational explanations to make complex automotive and aerodynamic concepts easier to understand.

The project is designed to let users explore individual car components, understand their engineering purpose, and visualize the aerodynamic principles that influence performance on the track.

## Overview

Formula One cars are engineering systems where aerodynamics, mechanical design, and vehicle dynamics work together. This project aims to make those concepts accessible through an interactive digital laboratory.

Rather than simply displaying a racing car, Formula One Lab encourages users to investigate how its components work and why their designs matter.

## Features

### Interactive 3D Car Exploration
- Explore a detailed 3D Formula One car.
- Inspect individual components by clicking or touching the actual parts in Kit Mode.
- Learn about each component through contextual educational information.
- Explore the car without relying on a separate component-selection menu.

### Aerodynamics Visualization
Explore the aerodynamic concepts that influence Formula One performance, including:
- **Downforce:** How aerodynamic forces press the car toward the track.
- **Drag:** How air resistance opposes forward motion.
- **Lift:** How vertical aerodynamic forces affect vehicle behavior.
- **Airflow:** How air moves around the bodywork and aerodynamic surfaces.
- **Wake and turbulence:** How airflow behaves behind the car.

### Multiple Exploration Modes

**Kit Mode** — Investigate individual car components and learn about their engineering principles.

**Drive / Demo Mode** — Explore aerodynamic concepts through visual demonstrations around the car.

**Studio Mode** — View and inspect the 3D car in a dedicated visualization environment.

### Engineering Education
Educational panels explain:
- Component location
- Primary function
- Engineering principles
- Performance impact
- Design trade-offs

The goal is to connect what users see in the 3D model with the engineering decisions behind it.

## Technology Stack

The project uses a web-based 3D visualization approach. The exact technologies and versions depend on the current implementation.

- **Frontend:** HTML, CSS, JavaScript
- **3D Rendering:** Three.js / WebGL
- **Development:** Node.js
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js and npm
- A modern browser with WebGL support
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/Nishka2111/formula-demo.git
cd formula-demo
```

Install dependencies:

```bash
npm install
```

Start the application using the development script configured in `package.json`:

```bash
npm run dev
```

If the project uses a custom Node.js server instead, start it with:

```bash
node server.js
```

Open the local URL printed in your terminal. If the server uses port 3000, visit:

http://localhost:3000

> **Note:** Use the startup command that matches the scripts and server configuration in the repository.

## Deployment

The project can be deployed using [Vercel](https://vercel.com/).

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the appropriate framework preset, build command, and output directory.
4. Deploy the application.
5. Verify that the production site loads its CSS, JavaScript, 3D assets, and WebGL scene correctly.

A successful deployment should preserve the original styling, interactive car, educational panels, and exploration modes.

## Project Goals

- Make Formula One engineering more accessible.
- Demonstrate the relationship between aerodynamic design and vehicle performance.
- Encourage hands-on exploration of complex mechanical systems.
- Combine interactive 3D graphics with concise technical explanations.
- Build an educational experience that is both visually engaging and technically informative.

## Future Improvements

Potential areas for further development include:
- More detailed aerodynamic force animations.
- Improved visualization of airflow and wake behavior.
- More precise component-level interactions.
- Responsive controls for mobile and touch devices.
- Additional engineering explanations and interactive experiments.
- More realistic visual representations of aerodynamic effects.

## Contributing

Suggestions, bug reports, and contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test the application locally.
5. Submit a pull request describing your improvements.

## Disclaimer

This is an educational visualization project. Aerodynamic visuals are intended to illustrate engineering concepts and should not be interpreted as validated computational fluid dynamics (CFD) simulations or precise real-world performance predictions unless supported by an explicitly validated simulation model.

## License

A license has not yet been specified. Add a `LICENSE` file before distributing the project under specific reuse terms.

---

**Built to make Formula One engineering interactive, visual, and easier to understand.**
