/**
 * Formula One Website Enhancements (Production Architecture)
 * Designed & Developed for Nishka Mehta
 *
 * 1. Structural Car Configurations (Classic '91, Modern Ground Effect, Concept X)
 * 2. Interactive Aerodynamics Education in Studio Mode (Downforce, Drag & Wake, Ground Effect, Aero Balance)
 * 3. Clickable Component Exploration in Kit Mode (6 structured engineering fields)
 * 4. Car-Specific Educational Mapping & Dynamic Physics Controls
 */

(function () {
  'use strict';

  // State Management
  const state = {
    engine: null,
    currentMode: 'kit',
    activeCar: 'classic',      // 'classic' | 'modern' | 'concept'
    activeAero: 'none',        // 'none' | 'downforce' | 'drag' | 'groundEffect' | 'balance'
    airspeed: 240,             // km/h
    wingAngle: 28,             // degrees (15 - 38)
    drsOpen: false,            // boolean
    rideHeight: 35,            // mm (25, 35, 48)
    frontAeroSplit: 43,        // % (40 - 48)
    selectedComponentKey: null,
    aeroGroup: null,
    kitHighlightGroup: null,
    carAccessoriesGroup: null,
    pointerDownPos: { x: 0, y: 0 },
    isDragging: false,
    animTime: 0,
    originalGeometries: new Map(), // mesh -> Float32Array (original positions)
    isUndersideView: false,
    cameraPrevPos: null
  };

  // -------------------------------------------------------------
  // CAR-SPECIFIC COMPONENT ENGINEERING DATABASE
  // -------------------------------------------------------------
  const COMPONENT_DB = {
    front_wing: {
      name: 'FRONT WING MAINPLANE & FLAPS',
      matchKeys: ['front_wing_center', 'front_wing_flap_left', 'front_wing_flap_right'],
      location: 'At the leading edge of the vehicle, positioned forward of the front wheels and chassis nose.',
      function: 'Manages incoming undisturbed airflow, contributes 25% to 35% of overall vehicle downforce, and conditions aerodynamic wake around the front wheels.',
      principle: 'Multi-element inverted cambered aerofoils generating intense low pressure on the underside and high pressure above. Upper flap angles are adjustable to trim balance.',
      performanceImpact: 'Directly dictates front-axle grip, high-speed corner entry stability, turn-in authority, and overall vehicle aerodynamic balance.',
      tradeoff: 'Increasing wing flap angle generates vital front downforce but induces parasitic profile drag and shifts the aerodynamic center of pressure forward as speed climbs.',
      carSpecific: {
        classic: '1991 specification: High-mounted, flat multi-element wing with wide vertical endplates designed for clean upper airflow.',
        modern: '2024 ground-effect specification: 3D sweeping curved aerofoil dipping low at the center to feed underfloor tunnels with inward-rolled vortex endplates.',
        concept: 'Concept X specification: Active morphing delta aerofoil with dynamic spanwise angle-of-attack adjustment.'
      }
    },
    front_endplates: {
      name: 'FRONT WING ENDPLATES & DIVEPLANES',
      matchKeys: ['front_wing_endplate_left', 'front_wing_endplate_right'],
      location: 'Outer vertical boundaries at the transverse extremities of the front wing.',
      function: 'Prevents spanwise pressure equalization across wing surfaces and generates energetic outwash vortices to steer turbulent wheel wake away from the floor.',
      principle: 'Vorticity generation and pressure boundary separation; guides high-pressure air outwards around the exposed front tyres.',
      performanceImpact: 'Protects the underfloor leading edge from ingesting turbulent, low-energy tyre wake, preserving underfloor ground-effect suction.',
      tradeoff: 'Aggressive outwash generation creates induced vortex drag and increases aerodynamic sensitivity to yaw angles in crosswinds.',
      carSpecific: {
        classic: 'Classic planar carbon plates with simple trailing edge cutouts.',
        modern: 'Contoured 3D curved surfaces designed under strict FIA regulations to control outwash wake angle.',
        concept: 'Integrated vortex generators with fluidic boundary layer injection ports.'
      }
    },
    rear_wing: {
      name: 'REAR WING & DRS SYSTEM',
      matchKeys: ['rear_wing_main_plane', 'rear_wing_top_flap', 'rear_beam_wing'],
      location: 'High-mounted at the trailing edge of the car above the transmission and diffuser exit.',
      function: 'Generates powerful rear-axle downforce to stabilize the chassis under hard braking and traction; incorporates Drag Reduction System (DRS).',
      principle: 'Deep-camber aerofoil operating in free stream air. DRS hydraulic actuator rotates the upper flap horizontal on straights to dump induced drag.',
      performanceImpact: 'Provides driver confidence through high-speed sweeps and prevents snap oversteer during rapid trail-braking phases.',
      tradeoff: 'The largest single source of pressure drag on the car; high-downforce wing angles severely penalize straight-line top speed.',
      carSpecific: {
        classic: '1991 specification: Tall, rectangular high-drag wing assembly without DRS; pure mechanical downforce.',
        modern: '2024 specification: Swooping curved upper mainplane with FIA-mandated DRS hydraulic slot actuator.',
        concept: 'Concept X specification: Dual-tier kinetic beam wing that articulates dynamically based on telemetry.'
      }
    },
    rear_endplates: {
      name: 'REAR WING ENDPLATES & STRAKES',
      matchKeys: ['rear_wing_endplate_left', 'rear_wing_endplate_right'],
      location: 'Vertical side planes framing both sides of the rear wing aerofoils.',
      function: 'Reduces induced drag by mitigating wingtip vortices and ties rear wing pressure recovery into the upward plume of the rear diffuser.',
      principle: 'Maintains spanwise pressure differentials between the suction lower surface and positive upper surface of the aerofoil.',
      performanceImpact: 'Improves rear wing efficiency by up to 15% and ensures consistent downforce across varying yaw angles.',
      tradeoff: 'Increases lateral surface area, making the vehicle more susceptible to sudden destabilizing gusts in side winds.',
      carSpecific: {
        classic: 'Full-length vertical carbon fins extending down to the floor edge.',
        modern: 'Sculpted rolled endplates merging seamlessly with the wing profile to eliminate sharp vortices.',
        concept: 'Active twin stabilizing fins with integrated brake cooling exhaust.'
      }
    },
    diffuser: {
      name: 'REAR DIFFUSER & PRESSURE EXPANSION',
      matchKeys: ['diffuser_left', 'diffuser_right'],
      location: 'At the rear of the underfloor, expanding upward between the rear suspension and wheels.',
      function: 'Expands high-velocity underfloor air back to ambient atmospheric pressure, generating severe suction across the entire floor underside.',
      principle: 'Bernoulli principle and Venturi expansion duct. As cross-sectional area expands, airflow decelerates and pressure increases, drawing air through the throat at hyper-speed.',
      performanceImpact: 'Produces the most aerodynamically efficient downforce on the car with the lowest drag-to-downforce penalty.',
      tradeoff: 'Extremely sensitive to ride height and pitch angle; excessive kerb bounce can cause sudden flow separation and violent aerodynamic stall.',
      carSpecific: {
        classic: 'Stepped kick-up diffuser typical of the early 1990s flat-bottom regulations.',
        modern: 'Deep, contoured multi-channel diffuser tunnel with vertical vortex control fences.',
        concept: 'Dual-stage boundary-layer extraction diffuser with active pneumatic flow energizers.'
      }
    },
    underfloor: {
      name: 'UNDERFLOOR & VENTURI TUNNELS',
      matchKeys: ['body_bottom'],
      location: 'The entire underside of the carbon monocoque chassis between the front and rear axles.',
      function: 'Generates up to 60% of total car downforce via ground effect, using sculpted longitudinal Venturi tunnels.',
      principle: 'Ground proximity forces air through converging and diverging ducts, producing dramatic negative pressure beneath the car’s center of gravity.',
      performanceImpact: 'Enables massive cornering speeds with minimal trailing turbulent wake compared to over-body wings.',
      tradeoff: 'Demands an ultra-stiff mechanical suspension setup to maintain millimeter-precise ride height, compromising mechanical compliance over kerbs.',
      carSpecific: {
        classic: 'Flat wooden skid block and stepped floor profile, producing ~35% of total car downforce.',
        modern: 'Full 3D curved Venturi tunnels with floor edge fences, producing ~60% of total downforce.',
        concept: 'Adaptive variable-geometry floor channels with integrated ground-effect suction fans.'
      }
    },
    sidepods: {
      name: 'SIDEPODS & RADIATOR INLETS',
      matchKeys: ['sidepod_left', 'sidepod_right'],
      location: 'Flanking either side of the monocoque between the front wheels and rear suspension.',
      function: 'Directs cooling air to internal radiators and intercoolers while conditioning boundary-layer air towards the rear wing and floor edges.',
      principle: 'Aggressive undercut geometry channels clean upper airflow downwards onto the floor margin, sealing underfloor low pressure.',
      performanceImpact: 'Ensures the 1,000+ bhp hybrid power unit survives thermal limits while contributing significantly to aerodynamic downwash.',
      tradeoff: 'Radiator internal cooling drag versus external aerodynamic efficiency; tight packaging increases thermal throttling risks in hot climates.',
      carSpecific: {
        classic: 'Square-inlet sidepods housing large oil and water radiators for the naturally aspirated V10.',
        modern: 'Extreme downwash sidepod undercut guiding air tightly into the rear coke-bottle zone.',
        concept: 'Concealed micro-channel heat exchangers with zero external cooling aperture drag.'
      }
    },
    monocoque: {
      name: 'CARBON COMPOSITE MONOCOQUE',
      matchKeys: ['main_shell'],
      location: 'Central structural core of the vehicle housing the cockpit, fuel cell, and front suspension pick-up points.',
      function: 'Provides ultra-rigid structural foundation capable of resisting severe torsional loads while serving as the driver survival cell.',
      principle: 'Carbon-fibre and Kevlar pre-preg skins cured under autoclave pressure around an aluminium or Nomex honeycomb core.',
      performanceImpact: 'Zero chassis deflection ensures suspension geometry remains true under 5g cornering loads; withstands extreme FIA impact crash tests.',
      tradeoff: 'Extreme manufacturing complexity and expense; absolute torsional rigidity requires meticulous vibration dampening.',
      carSpecific: {
        classic: 'High-pointed narrow pencil nose and exposed mechanical packaging of the 1991 era.',
        modern: 'Longer wheelbase, low-impact absorbing nose tip, and reinforced side impact crash structures.',
        concept: 'Continuous monocoque fuselage with integrated aerodynamic spine and active load sensors.'
      }
    },
    cockpit: {
      name: 'COCKPIT, HALO & WINDSCREEN',
      matchKeys: ['cockpit'],
      location: 'Surrounding the driver cockpit opening and helmet envelope.',
      function: 'Houses steering, pedal box, and Grade 5 titanium Halo safety structure capable of supporting 12,000 kg static load.',
      principle: 'Tubular titanium structure with sculpted carbon aerodynamic fairings designed to deflect large debris and absorb rollover energy.',
      performanceImpact: 'Revolutionary driver safety innovation that has prevented fatal head injuries in modern open-wheel motorsport.',
      tradeoff: 'Adds ~9 kg of mass at the highest vertical point of the chassis, slightly elevating the vehicle center of gravity.',
      carSpecific: {
        classic: 'Open cockpit with low head protection bolsters and small Lexan windscreen; no Halo.',
        modern: 'Mandatory FIA Grade 5 Titanium Halo structure with aerodynamic fairing vane.',
        concept: 'High-strength polycarbonate fighter-jet canopy offering 100% aerodynamic and impact protection.'
      }
    },
    suspension_front: {
      name: 'FRONT SUSPENSION (WISHBONES & PUSHROD)',
      matchKeys: ['suspension_front_left', 'suspension_front_right'],
      location: 'Connecting the front wheel uprights to the inboard dampers inside the nose cone.',
      function: 'Maintains tyre contact patch, controls roll and pitch, and stabilizes aerodynamic platform ride height.',
      principle: 'Unequal-length double wishbone layout with aerodynamic carbon shrouds; pushrod actuates inboard bellcrank and heave torsion bars.',
      performanceImpact: 'Dictates steering precision, mechanical front grip, and prevents aerodynamic underfloor pitch sensitivity.',
      tradeoff: 'Aerodynamic shroud optimization versus kinematic adjustability; ultra-stiff springs benefit downforce but hurt kerb-riding traction.',
      carSpecific: {
        classic: 'Exposed aerodynamic steel/carbon wishbones with external pushrod geometry.',
        modern: 'Integrated aero-profile carbon shrouds with extreme anti-dive kinematic geometry.',
        concept: 'Active electromagnetic pushrods with millisecond-level ride-height adaptation.'
      }
    },
    suspension_rear: {
      name: 'REAR SUSPENSION (MULTI-LINK & PULLROD)',
      matchKeys: ['suspension_back_left', 'suspension_back_right'],
      location: 'Connecting the rear wheel uprights to the transmission casing and inboard dampers.',
      function: 'Controls rear axle kinematics, squat under acceleration, and longitudinal tyre traction under corner exit.',
      principle: 'Multi-link pullrod configuration lowering the vehicle center of gravity while managing dynamic wheel camber and toe curves.',
      performanceImpact: 'Critical for putting down 1,000 bhp without wheelspin and preventing rear tyre thermal degradation.',
      tradeoff: 'Extremely tight packaging inside the aerodynamic coke-bottle zone complicates trackside mechanical setup access.',
      carSpecific: {
        classic: 'Transverse pushrod geometry mounted over the 6-speed longitudinal gearbox.',
        modern: 'Pullrod kinematics packaging dampers low on the floor to clear the diffuser airflow channel.',
        concept: 'Inboard active torsion dampers with multi-stage regenerative energy recovery.'
      }
    },
    brakes: {
      name: 'CARBON-CARBON BRAKE ASSEMBLIES',
      matchKeys: ['brake_disc_front_left', 'brake_disc_front_right', 'brake_disc_back_left', 'brake_disc_back_right'],
      location: 'Inside each wheel hub behind the rim assembly.',
      function: 'Provides immense stopping torque, decelerating the car from 330 km/h to 100 km/h in under 2.2 seconds at over 5g.',
      principle: 'Carbon-fibre matrix discs and carbon pads with over 1,000 drilled radial cooling holes; operates at 350°C to 1,000°C.',
      performanceImpact: 'Late-braking performance defines overtaking opportunities and overall circuit lap time.',
      tradeoff: 'Brittle performance window: below 300°C carbon brakes offer poor friction, while above 1,000°C rapid disc oxidation occurs.',
      carSpecific: {
        classic: '280 mm carbon-carbon discs with 4-piston monobloc Brembo calipers.',
        modern: '32 mm thick discs with over 1,400 cooling holes and brake-by-wire rear energy recovery.',
        concept: 'Integrated ceramic-matrix kinetic regenerative brake discs with vacuum dust scavengers.'
      }
    },
    tyres: {
      name: 'SLICK RACING TYRES',
      matchKeys: ['tire_front_left', 'tire_front_right', 'tire_back_left', 'tire_back_right'],
      location: 'The vehicle’s four primary contact patches with the circuit asphalt surface.',
      function: 'Transmits every acceleration, braking, and lateral cornering force generated by the chassis and aerodynamics to the road.',
      principle: 'Viscoelastic rubber polymers conforming into track micro-textures through molecular adhesion and hysteresis.',
      performanceImpact: 'The single most decisive performance component; all aerodynamic forces must ultimately act through these four contact patches.',
      tradeoff: 'Softer compound provides maximum grip but suffers rapid thermal blistering; harder compound lasts longer but sacrifices peak grip.',
      carSpecific: {
        classic: '13-inch Goodyear racing tyres with thick, flexible sidewalls providing natural mechanical compliance.',
        modern: '18-inch low-profile Pirelli P-Zero tyres with stiff sidewalls designed to stabilize aero ride height.',
        concept: 'Active smart compound tyres with internal thermal sensors and adaptive micro-grooves.'
      }
    },
    wheels: {
      name: 'FORGED MAGNESIUM WHEELS',
      matchKeys: ['rim_front_left', 'rim_front_right', 'rim_back_left', 'rim_back_right'],
      location: 'Supporting the tyres at all four wheel stations.',
      function: 'Mounts the racing rubber and features aerodynamic fairings / wheel covers to minimize rotational aerodynamic turbulence.',
      principle: 'Forged AZ80 magnesium alloy offering maximum structural stiffness with minimal rotational inertia.',
      performanceImpact: 'Lower unsprung mass allows dampers to track road imperfections faster, maintaining tyre contact patch stability.',
      tradeoff: 'Magnesium alloys are expensive and vulnerable to cracking under severe kerb strikes.',
      carSpecific: {
        classic: 'Iconic multi-spoke BBS/Enkei 13-inch forged wheels.',
        modern: 'Mandatory 18-inch BBS forged magnesium rims with aerodynamic wheel cover discs.',
        concept: 'Enclosed aerodynamic aero-spat covers with dynamic turbine cooling vanes.'
      }
    }
  };

  function resolveComponent(partName) {
    if (!partName) return null;
    const clean = partName.toLowerCase();
    for (const [key, comp] of Object.entries(COMPONENT_DB)) {
      if (comp.matchKeys.some(k => clean.includes(k) || k.includes(clean))) {
        return { key, ...comp };
      }
    }
    if (clean.includes('wing') && clean.includes('front')) return { key: 'front_wing', ...COMPONENT_DB.front_wing };
    if (clean.includes('wing') && clean.includes('rear')) return { key: 'rear_wing', ...COMPONENT_DB.rear_wing };
    if (clean.includes('diffuser')) return { key: 'diffuser', ...COMPONENT_DB.diffuser };
    if (clean.includes('tire') || clean.includes('tyre')) return { key: 'tyres', ...COMPONENT_DB.tyres };
    if (clean.includes('rim') || clean.includes('wheel')) return { key: 'wheels', ...COMPONENT_DB.wheels };
    if (clean.includes('suspension')) return { key: 'suspension_front', ...COMPONENT_DB.suspension_front };
    if (clean.includes('brake')) return { key: 'brakes', ...COMPONENT_DB.brakes };
    if (clean.includes('sidepod')) return { key: 'sidepods', ...COMPONENT_DB.sidepods };
    if (clean.includes('bottom') || clean.includes('floor')) return { key: 'underfloor', ...COMPONENT_DB.underfloor };
    if (clean.includes('shell') || clean.includes('body')) return { key: 'monocoque', ...COMPONENT_DB.monocoque };
    if (clean.includes('cockpit')) return { key: 'cockpit', ...COMPONENT_DB.cockpit };
    return null;
  }

  // -------------------------------------------------------------
  // INITIALIZATION & HOOKUP
  // -------------------------------------------------------------
  function initEnhancements(engine) {
    if (!engine || state.engine) return;
    state.engine = engine;
    console.log('[F1 Enhancements] Connected to engine:', engine);

    // Setup Three.js Groups
    initThreeGroups();

    // Cache original geometry for 100% structural fidelity
    captureOriginalGeometries();

    // Attach DOM event handlers
    setupUIEventHandlers();

    // Hook into Mode Manager
    if (engine.modeManager) {
      const origGoTo = engine.modeManager.goTo.bind(engine.modeManager);
      engine.modeManager.goTo = function (mode) {
        onModeWillChange(mode);
        origGoTo(mode);
        onModeDidChange(mode);
      };
      state.currentMode = engine.modeManager.currentMode || 'kit';
    }

    // Set initial mode visibility
    updateModeVisibility(state.currentMode);

    // Hook into render loop
    window.__F1_ON_UPDATE__ = onRenderUpdate;

    // Setup interactive raycasting in Kit mode
    setupKitInteraction();

    console.log('[F1 Enhancements] Structural models, interactive aero, and component picking ready.');
  }

  function initThreeGroups() {
    const { scene, car } = state.engine;
    if (!scene || !car) return;

    const Group = car.container.constructor;

    // Aero visualization container
    state.aeroGroup = new Group();
    state.aeroGroup.name = 'F1_AeroVisualizationGroup';
    scene.add(state.aeroGroup);

    // Kit component highlight container
    state.kitHighlightGroup = new Group();
    state.kitHighlightGroup.name = 'F1_KitHighlightGroup';
    scene.add(state.kitHighlightGroup);

    // Car accessories group attached to car container
    state.carAccessoriesGroup = new Group();
    state.carAccessoriesGroup.name = 'F1_CarAccessoriesGroup';
    car.container.add(state.carAccessoriesGroup);

    buildStructural3DAccessories();
  }

  // -------------------------------------------------------------
  // FEATURE 1: STRUCTURAL CAR GEOMETRY MORPHING & ACCESSORIES
  // -------------------------------------------------------------
  function captureOriginalGeometries() {
    const { car } = state.engine;
    if (!car || !car.mesh) return;

    car.mesh.traverse(obj => {
      if (obj.isMesh && obj.geometry && obj.geometry.attributes.position) {
        if (!state.originalGeometries.has(obj)) {
          const original = new Float32Array(obj.geometry.attributes.position.array);
          state.originalGeometries.set(obj, original);
        }
      }
    });
    console.log(`[F1 Geometry] Captured original geometry for ${state.originalGeometries.size} submeshes.`);
  }

  function buildStructural3DAccessories() {
    const { car, materials } = state.engine;
    if (!car || !car.mesh) return;

    const Group = car.container.constructor;
    const bodyMat = materials?.materials?.body;
    if (!bodyMat) return;

    const submesh = car.mesh.children[0];
    const Geom = submesh.geometry.constructor;
    const Mesh = submesh.constructor;

    // 1. MODERN ACCESSORIES (Titanium Halo, DRS Actuator Pod, 18" Wheel Aerocovers)
    state.modernAccGroup = new Group();
    state.modernAccGroup.name = 'Modern_Structural_Accessories';
    state.modernAccGroup.visible = false;
    state.carAccessoriesGroup.add(state.modernAccGroup);

    // Structural Titanium Halo
    const haloGeom = new Geom();
    const haloVerts = [
      // Central pillar (mounted ahead of driver on monocoque)
      0.55, 0.0, 0.45,   0.24, 0.0, 0.63,
      // Left loop curving around driver helmet
      0.24, 0.0, 0.63,   0.02, 0.22, 0.61,
      0.02, 0.22, 0.61, -0.28, 0.18, 0.54,
      // Right loop
      0.24, 0.0, 0.63,   0.02, -0.22, 0.61,
      0.02, -0.22, 0.61, -0.28, -0.18, 0.54,
      // Rear arch connecting to rollover hoop
      -0.28, 0.18, 0.54, -0.28, -0.18, 0.54
    ];
    haloGeom.setAttribute('position', new submesh.geometry.attributes.position.constructor(new Float32Array(haloVerts), 3));
    const haloMat = new bodyMat.constructor({
      color: 0x141820,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.3
    });
    const haloMesh = new Mesh(haloGeom, haloMat);
    state.modernAccGroup.add(haloMesh);

    // DRS Actuator Pod
    const drsGeom = new Geom();
    const drsVerts = [
      -1.54, 0.0, 0.67,  -1.62, 0.0, 0.72,
      -1.62, 0.0, 0.72,  -1.65, 0.0, 0.68
    ];
    drsGeom.setAttribute('position', new submesh.geometry.attributes.position.constructor(new Float32Array(drsVerts), 3));
    const drsMat = new bodyMat.constructor({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.0 });
    state.modernAccGroup.add(new Mesh(drsGeom, drsMat));

    // 2. CONCEPT X ACCESSORIES (Enclosed Bubble Canopy, Dorsal Shark Fin, Kinetic Beam Wing)
    state.conceptAccGroup = new Group();
    state.conceptAccGroup.name = 'ConceptX_Structural_Accessories';
    state.conceptAccGroup.visible = false;
    state.carAccessoriesGroup.add(state.conceptAccGroup);

    // Enclosed Fighter-Jet Bubble Canopy
    const canopyGeom = new Geom();
    const canopyVerts = [
      // Windshield to canopy apex
      0.58, 0.0, 0.44,   0.08, 0.0, 0.64,
      0.08, 0.0, 0.64,  -0.42, 0.0, 0.58,
      // Left side curve
      0.58, 0.0, 0.44,   0.08, 0.22, 0.58,
      0.08, 0.22, 0.58, -0.42, 0.20, 0.52,
      -0.42, 0.20, 0.52, -0.42, 0.0, 0.58,
      // Right side curve
      0.58, 0.0, 0.44,   0.08, -0.22, 0.58,
      0.08, -0.22, 0.58, -0.42, -0.20, 0.52,
      -0.42, -0.20, 0.52, -0.42, 0.0, 0.58
    ];
    canopyGeom.setAttribute('position', new submesh.geometry.attributes.position.constructor(new Float32Array(canopyVerts), 3));
    const canopyMat = new bodyMat.constructor({
      color: 0x0a0c10,
      roughness: 0.1,
      metalness: 0.95,
      emissive: 0xffaa00,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.88
    });
    state.conceptAccGroup.add(new Mesh(canopyGeom, canopyMat));

    // Dorsal Aerodynamic Shark Fin
    const finGeom = new Geom();
    const finVerts = [
      -0.42, 0.0, 0.58,  -1.35, 0.0, 0.74,
      -1.35, 0.0, 0.74,  -1.48, 0.0, 0.48,
      -1.48, 0.0, 0.48,  -0.42, 0.0, 0.48
    ];
    finGeom.setAttribute('position', new submesh.geometry.attributes.position.constructor(new Float32Array(finVerts), 3));
    const finMat = new bodyMat.constructor({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8 });
    state.conceptAccGroup.add(new Mesh(finGeom, finMat));
  }

  function applyCarStructuralConfiguration(carKey) {
    state.activeCar = carKey;
    const { car, materials } = state.engine;
    if (!car || !car.mesh) return;

    console.log(`[F1 Car Switch] Transforming model geometry to: ${carKey}`);

    // Update UI buttons
    document.querySelectorAll('.demoCarPicker-btn').forEach(btn => {
      const active = btn.dataset.car === carKey;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // 1. TRANSFORM 3D MESH VERTICES IN MEMORY
    car.mesh.traverse(obj => {
      if (obj.isMesh && obj.geometry && state.originalGeometries.has(obj)) {
        const orig = state.originalGeometries.get(obj);
        const current = obj.geometry.attributes.position.array;
        const name = (obj.name || '').toLowerCase();

        for (let i = 0; i < orig.length; i += 3) {
          const xOrig = orig[i];
          const yOrig = orig[i + 1];
          const zOrig = orig[i + 2];

          if (carKey === 'classic') {
            // Restore exact classic early-90s geometry
            current[i] = xOrig;
            current[i + 1] = yOrig;
            current[i + 2] = zOrig;
          } else if (carKey === 'modern') {
            // 2024 Modern Ground Effect Geometry
            // Front wing: swept back as a function of y^2, curved upward at tips
            if (name.includes('front_wing')) {
              const yNorm = Math.min(1.0, Math.abs(yOrig) / 0.7);
              current[i] = xOrig - 0.28 * Math.pow(yNorm, 2); // Swept back
              current[i + 1] = yOrig;
              current[i + 2] = zOrig + 0.08 * Math.pow(yNorm, 2); // Dihedral curve
            }
            // Rear wing: modern curved aerofoil dipping at center
            else if (name.includes('rear_wing')) {
              const yNorm = Math.min(1.0, Math.abs(yOrig) / 0.5);
              current[i] = xOrig;
              current[i + 1] = yOrig * 1.08;
              current[i + 2] = zOrig + 0.05 * (1.0 - Math.pow(yNorm, 2)); // Curved center
            }
            // Sidepods: modern undercut downwash channel
            else if (name.includes('sidepod')) {
              current[i] = xOrig;
              current[i + 1] = yOrig * (0.85 + 0.25 * zOrig); // Lower undercut
              current[i + 2] = zOrig;
            }
            // Underfloor: widened Venturi tunnels & diffuser kickup
            else if (name.includes('bottom') || name.includes('diffuser')) {
              current[i] = xOrig;
              current[i + 1] = yOrig * 1.18; // 18% wider floor
              current[i + 2] = zOrig < 0.2 ? zOrig * 0.8 : zOrig; // Lower ground clearance
            }
            // Nose tip: lowered towards track level
            else if (name.includes('main_shell') && xOrig > 1.2) {
              current[i] = xOrig;
              current[i + 1] = yOrig;
              current[i + 2] = zOrig - 0.08; // Lower modern nose
            } else {
              current[i] = xOrig;
              current[i + 1] = yOrig;
              current[i + 2] = zOrig;
            }
          } else if (carKey === 'concept') {
            // Concept X Futuristic Geometry
            // Front wing: radical forward-swept delta winglets
            if (name.includes('front_wing')) {
              const yNorm = Math.min(1.0, Math.abs(yOrig) / 0.7);
              current[i] = xOrig + 0.24 * yNorm; // Forward delta sweep
              current[i + 1] = yOrig * 1.12;
              current[i + 2] = zOrig + 0.12 * yNorm;
            }
            // Rear wing: low-profile active beam wing
            else if (name.includes('rear_wing')) {
              current[i] = xOrig - 0.12;
              current[i + 1] = yOrig * 1.15;
              current[i + 2] = zOrig - 0.06;
            }
            // Sidepods: razor-sharp angular stealth intakes
            else if (name.includes('sidepod')) {
              current[i] = xOrig;
              current[i + 1] = yOrig * 0.92;
              current[i + 2] = zOrig;
            }
            // Floor & diffuser: extended rear diffuser
            else if (name.includes('bottom') || name.includes('diffuser')) {
              current[i] = xOrig < -1.0 ? xOrig - 0.22 : xOrig; // Extended rear diffuser
              current[i + 1] = yOrig * 1.14;
              current[i + 2] = zOrig;
            } else {
              current[i] = xOrig;
              current[i + 1] = yOrig;
              current[i + 2] = zOrig;
            }
          }
        }

        obj.geometry.attributes.position.needsUpdate = true;
        obj.geometry.computeVertexNormals();
        obj.geometry.computeBoundingBox();
        obj.geometry.computeBoundingSphere();
      }
    });

    // 2. TOGGLE 3D STRUCTURAL ACCESSORIES
    if (state.modernAccGroup) state.modernAccGroup.visible = (carKey === 'modern');
    if (state.conceptAccGroup) state.conceptAccGroup.visible = (carKey === 'concept');

    // 3. APPLY MATCHING AESTHETIC FINISH
    const bodyMat = materials?.materials?.body;
    if (bodyMat) {
      if (carKey === 'classic') {
        bodyMat.emissive.set('#4d586f');
        bodyMat.emissiveIntensity = 1.0;
        bodyMat.roughness = 0.8;
      } else if (carKey === 'modern') {
        bodyMat.emissive.set('#004455');
        bodyMat.emissiveIntensity = 1.2;
        bodyMat.roughness = 0.5;
      } else if (carKey === 'concept') {
        bodyMat.emissive.set('#553300');
        bodyMat.emissiveIntensity = 1.4;
        bodyMat.roughness = 0.2;
      }
      bodyMat.needsUpdate = true;
    }

    // 4. REFRESH ACTIVE EDUCATIONAL OVERLAYS
    if (state.activeAero !== 'none') {
      updateAeroPanel(state.activeAero);
      buildAeroVisuals(state.activeAero);
    }
    if (state.selectedComponentKey) {
      updateComponentPanel(state.selectedComponentKey);
    }
  }

  // -------------------------------------------------------------
  // FEATURE 2: INTERACTIVE AERODYNAMICS EDUCATION IN STUDIO MODE
  // -------------------------------------------------------------
  const AERO_TOPICS = {
    downforce: {
      title: 'DOWNFORCE & AERODYNAMIC LOADING',
      tag: '[ AERODYNAMICS // TOPIC 01 ]',
      desc: 'Downforce is the net vertical aerodynamic force pushing the car into the circuit surface. Unlike increasing the vehicle’s physical mass, downforce increases tyre grip without introducing centrifugal inertia, dramatically raising cornering speeds.',
      principles: [
        'Bernoulli suction on inverted aerofoil undersides',
        'Newtonian downwash deflection of airflow',
        'Normal tyre load: F_grip = μ · (m·g + F_downforce)'
      ],
      tradeoffs: 'Higher wing angles produce downforce at the cost of induced drag (F_drag ∝ C_D·v²). Excessive downforce caps straight-line speed and severely accelerates tyre degradation under high thermal loads.'
    },
    drag: {
      title: 'DRAG & AERODYNAMIC WAKE',
      tag: '[ AERODYNAMICS // TOPIC 02 ]',
      desc: 'Aerodynamic drag opposes the vehicle\'s forward motion. Power required to overcome drag scales with the cube of velocity (P = F_D · v ∝ v³), meaning over 80% of engine output at 300 km/h is consumed simply pushing air aside. The car leaves behind a massive turbulent wake ("dirty air") that destabilizes following cars.',
      principles: [
        'Pressure drag from front stagnation & rear separation',
        'Induced vortex drag generated by wingtip vortices',
        'Drag Reduction System (DRS) dumps rear flap drag by ~30%'
      ],
      tradeoffs: 'Trimming drag increases top speed on straights but compromises stability under high-speed braking and cornering. DRS offers temporary drag shedding on sanctioned straightaways.'
    },
    groundEffect: {
      title: 'GROUND EFFECT & VENTURI TUNNELS',
      tag: '[ AERODYNAMICS // TOPIC 03 ]',
      desc: 'Underfloor ground effect generates over 55% of the total vehicle downforce with remarkable efficiency. Air passing beneath the chassis is funneled through contoured Venturi tunnels, accelerating through a minimum-clearance throat to create severe suction across the chassis floor before expanding through the rear diffuser.',
      principles: [
        'Venturi effect: constriction accelerates fluid, dropping static pressure',
        'Diffuser pressure recovery expands flow back to ambient pressure',
        'Floor edge vortex sealing isolates low pressure from side air ingestion'
      ],
      tradeoffs: 'Extreme ride-height sensitivity. Running the floor just 5 mm too low or striking a kerb can cause catastrophic underfloor flow stall, causing the car to bounce uncontrollably ("porpoising") and lose all grip.'
    },
    balance: {
      title: 'AERODYNAMIC BALANCE & COP MIGRATION',
      tag: '[ AERODYNAMICS // TOPIC 04 ]',
      desc: 'Aerodynamic balance is the longitudinal distribution of downforce between the front and rear axles. To maintain neutral handling across the speed envelope, engineers must track the Center of Pressure (CoP) relative to the vehicle’s Center of Gravity (CoG).',
      principles: [
        'Front axle downforce dictates high-speed turn-in grip',
        'Rear axle downforce provides braking and traction stability',
        'Dynamic pitch sensitivity under braking shifts balance forward'
      ],
      tradeoffs: 'Shifting balance forward cures slow-speed understeer but risks high-speed snap oversteer. Shifting balance rearward stabilizes high-speed sweeps but induces stubborn mid-corner push.'
    }
  };

  function setAeroTopic(topic) {
    state.activeAero = topic;

    // Update buttons
    document.querySelectorAll('.demoAeroPicker-btn').forEach(btn => {
      const active = btn.dataset.concept === topic;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const panel = document.getElementById('demoAeroPanel');
    const speedCtrl = document.getElementById('demoAeroSpeed');

    if (topic === 'none') {
      if (panel) panel.classList.remove('visible');
      if (speedCtrl) speedCtrl.classList.remove('visible');
      clearAeroVisuals();
      restoreCarMaterials();
    } else {
      if (panel) panel.classList.add('visible');
      if (speedCtrl) speedCtrl.classList.add('visible');
      updateAeroPanel(topic);
      buildAeroVisuals(topic);
    }
  }

  function updateAeroPanel(topic) {
    const data = AERO_TOPICS[topic];
    if (!data) return;

    const panel = document.getElementById('demoAeroPanel');
    if (!panel) return;

    const v = state.airspeed;
    const vScale = Math.pow(v / 240, 2).toFixed(2);
    const carMeta = state.activeCar === 'classic' ? '1991 Classic V10' : state.activeCar === 'modern' ? '2024 Ground-Effect V6' : 'Concept X Active Aero';

    let interactiveControlsHTML = '';

    if (topic === 'downforce') {
      const downforceLoad = Math.round(750 * vScale * (state.wingAngle / 28));
      const dragLoad = Math.round(220 * vScale * Math.pow(state.wingAngle / 28, 1.4));
      const projectedTopSpeed = Math.round(350 - (state.wingAngle - 15) * 1.4);

      interactiveControlsHTML = `
        <div class="f1-interactive-block">
          <div class="f1-slider-row">
            <span class="f1-slider-label">REAR WING FLAP ANGLE: <strong>${state.wingAngle}°</strong></span>
            <input type="range" class="f1-slider" id="wingAngleSlider" min="15" max="38" value="${state.wingAngle}">
          </div>
          <div class="f1-live-metrics">
            <div class="f1-live-cell">
              <span class="f1-metric-label">TOTAL DOWNFORCE:</span>
              <span class="f1-metric-val highlight-cyan">${downforceLoad} kgf</span>
            </div>
            <div class="f1-live-cell">
              <span class="f1-metric-label">PROFILE DRAG:</span>
              <span class="f1-metric-val highlight-red">${dragLoad} kgf</span>
            </div>
            <div class="f1-live-cell">
              <span class="f1-metric-label">EST. TOP SPEED:</span>
              <span class="f1-metric-val">${projectedTopSpeed} km/h</span>
            </div>
          </div>
        </div>
      `;
    } else if (topic === 'drag') {
      const topSpeed = state.drsOpen ? 348 : 330;
      const dragReduction = state.drsOpen ? '-32% (DRS ACTIVE)' : '0% (MAX DOWNFORCE)';

      interactiveControlsHTML = `
        <div class="f1-interactive-block">
          <div class="f1-button-row">
            <span class="f1-slider-label">DRS WING ACTUATOR:</span>
            <button class="f1-toggle-btn ${state.drsOpen ? 'active' : ''}" id="drsToggleBtn">
              ${state.drsOpen ? '[ DRS ACTIVATED - FLAP OPEN ]' : '[ DRS CLOSED - HIGH DRAG ]'}
            </button>
          </div>
          <div class="f1-live-metrics">
            <div class="f1-live-cell">
              <span class="f1-metric-label">DRAG STATUS:</span>
              <span class="f1-metric-val ${state.drsOpen ? 'highlight-cyan' : 'highlight-red'}">${dragReduction}</span>
            </div>
            <div class="f1-live-cell">
              <span class="f1-metric-label">STRAIGHTAWAY SPEED:</span>
              <span class="f1-metric-val highlight-cyan">${topSpeed} km/h</span>
            </div>
          </div>
        </div>
      `;
    } else if (topic === 'groundEffect') {
      const suctionStatus = state.rideHeight === 25 ? 'MAX SUCTION (HIGH STALL RISK)' : state.rideHeight === 35 ? 'OPTIMAL VENTURI ENVELOPE' : 'COMPLIANT (LOW SUCTION)';

      interactiveControlsHTML = `
        <div class="f1-interactive-block">
          <div class="f1-button-row">
            <span class="f1-slider-label">STATIC RIDE HEIGHT:</span>
            <button class="f1-chip-btn ${state.rideHeight === 25 ? 'active' : ''}" data-rh="25">25 MM</button>
            <button class="f1-chip-btn ${state.rideHeight === 35 ? 'active' : ''}" data-rh="35">35 MM</button>
            <button class="f1-chip-btn ${state.rideHeight === 48 ? 'active' : ''}" data-rh="48">48 MM</button>
          </div>
          <div class="f1-live-metrics">
            <div class="f1-live-cell">
              <span class="f1-metric-label">VENTURI CONDITION:</span>
              <span class="f1-metric-val highlight-green">${suctionStatus}</span>
            </div>
          </div>
          <div class="f1-button-row" style="margin-top: 8px;">
            <button class="f1-toggle-btn" id="inspectUndersideCameraBtn">
              ${state.isUndersideView ? '[ RETURN TO STUDIO CAMERA ]' : '[ CAMERA: INSPECT UNDERSIDE VENTURI ]'}
            </button>
          </div>
        </div>
      `;
    } else if (topic === 'balance') {
      const rearSplit = 100 - state.frontAeroSplit;
      const handlingState = state.frontAeroSplit > 45 ? 'OVERSTEER BIAS (AGGRESSIVE TURN-IN)' : state.frontAeroSplit < 42 ? 'UNDERSTEER BIAS (STABLE HIGH SPEED)' : 'NEUTRAL / BALANCED PLATFORM';

      interactiveControlsHTML = `
        <div class="f1-interactive-block">
          <div class="f1-slider-row">
            <span class="f1-slider-label">AERO BALANCE SPLIT: <strong>${state.frontAeroSplit}% FRONT / ${rearSplit}% REAR</strong></span>
            <input type="range" class="f1-slider" id="aeroSplitSlider" min="40" max="48" value="${state.frontAeroSplit}">
          </div>
          <div class="f1-live-metrics">
            <div class="f1-live-cell">
              <span class="f1-metric-label">HANDLING TRAIT:</span>
              <span class="f1-metric-val highlight-cyan">${handlingState}</span>
            </div>
          </div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="f1-panel-header">
        <span class="f1-panel-tag">${data.tag}</span>
        <button class="f1-panel-close" id="closeAeroTopicBtn" aria-label="Close Aerodynamic Explorer">&times;</button>
      </div>
      <h3 class="f1-panel-title">${data.title}</h3>
      <p class="f1-panel-desc">${data.desc}</p>

      <div class="f1-panel-section">
        <span class="f1-section-label">PHYSICAL PRINCIPLES:</span>
        <ul class="f1-bullet-list">
          ${data.principles.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>

      <div class="f1-panel-section">
        <span class="f1-section-label">ENGINEERING TRADE-OFFS:</span>
        <p class="f1-field-text">${data.tradeoffs}</p>
      </div>

      ${interactiveControlsHTML}
    `;

    // Bind interactive elements
    document.getElementById('closeAeroTopicBtn')?.addEventListener('click', () => setAeroTopic('none'));

    document.getElementById('wingAngleSlider')?.addEventListener('input', e => {
      state.wingAngle = parseInt(e.target.value, 10);
      updateAeroPanel('downforce');
      buildAeroVisuals('downforce');
    });

    document.getElementById('drsToggleBtn')?.addEventListener('click', () => {
      state.drsOpen = !state.drsOpen;
      updateAeroPanel('drag');
      buildAeroVisuals('drag');
    });

    panel.querySelectorAll('[data-rh]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.rideHeight = parseInt(btn.dataset.rh, 10);
        updateAeroPanel('groundEffect');
        buildAeroVisuals('groundEffect');
      });
    });

    document.getElementById('inspectUndersideCameraBtn')?.addEventListener('click', toggleUndersideCamera);

    document.getElementById('aeroSplitSlider')?.addEventListener('input', e => {
      state.frontAeroSplit = parseInt(e.target.value, 10);
      updateAeroPanel('balance');
      buildAeroVisuals('balance');
    });
  }

  function toggleUndersideCamera() {
    const { camera } = state.engine;
    if (!camera) return;

    state.isUndersideView = !state.isUndersideView;
    if (state.isUndersideView) {
      if (!state.cameraPrevPos) state.cameraPrevPos = camera.position.clone();
      // Position camera below the car looking up into the floor tunnels
      camera.position.set(0.0, -1.9, 0.15);
      camera.lookAt(0, 0, 0.35);
    } else {
      if (state.cameraPrevPos) {
        camera.position.copy(state.cameraPrevPos);
        camera.lookAt(0, 0, 0.2);
      } else {
        camera.position.set(-3.2, 2.4, 3.2);
        camera.lookAt(0, 0, 0.2);
      }
    }
    updateAeroPanel('groundEffect');
  }

  function clearAeroVisuals() {
    if (!state.aeroGroup) return;
    while (state.aeroGroup.children.length > 0) {
      const obj = state.aeroGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
      state.aeroGroup.remove(obj);
    }
  }

  function restoreCarMaterials() {
    const bodyMat = state.engine.materials?.materials?.body;
    if (bodyMat) {
      bodyMat.emissive.set(state.activeCar === 'classic' ? '#4d586f' : state.activeCar === 'modern' ? '#004455' : '#553300');
      bodyMat.emissiveIntensity = 1.0;
    }
  }

  function buildAeroVisuals(topic) {
    clearAeroVisuals();
    const { scene, car, materials } = state.engine;
    if (!state.aeroGroup || !scene || !car) return;

    const submesh = car.mesh?.children?.[0];
    if (!submesh || !submesh.geometry) return;

    const Geom = submesh.geometry.constructor;
    const Mesh = submesh.constructor;
    const Mat = materials?.materials?.body?.constructor || submesh.material.constructor;

    const speedScale = Math.pow(state.airspeed / 240, 2);

    // 1. DOWNFORCE TOPIC
    if (topic === 'downforce') {
      const bodyMat = materials?.materials?.body;
      if (bodyMat) {
        bodyMat.emissive.set(0x00e5ff);
        bodyMat.emissiveIntensity = 1.4;
      }

      const wingFactor = state.wingAngle / 28;
      const forceScale = 0.85 * speedScale * wingFactor;

      // Downward force vectors from front wing, underfloor CoP, and rear wing
      const vectors = [
        { x: 1.45, y: 0.35, z: 0.22, len: forceScale * 0.7, color: 0x00e5ff },
        { x: 1.45, y: -0.35, z: 0.22, len: forceScale * 0.7, color: 0x00e5ff },
        { x: 0.10, y: 0.40, z: 0.16, len: forceScale * 1.1, color: 0x00ffff },
        { x: 0.10, y: -0.40, z: 0.16, len: forceScale * 1.1, color: 0x00ffff },
        { x: -1.58, y: 0.35, z: 0.72, len: forceScale * 1.25, color: 0x00e5ff },
        { x: -1.58, y: -0.35, z: 0.72, len: forceScale * 1.25, color: 0x00e5ff }
      ];

      vectors.forEach(v => {
        createForceArrow(v.x, v.y, v.z, 0, 0, -v.len, v.color);
      });

      // Streamlines curving downward
      createLaminarStreamlines([
        { start: [2.4, 0.35, 0.4], end: [1.2, 0.35, 0.15], color: 0x00e5ff },
        { start: [2.4, -0.35, 0.4], end: [1.2, -0.35, 0.15], color: 0x00e5ff },
        { start: [-1.0, 0.32, 0.88], end: [-2.5, 0.32, 0.52], color: 0x00e5ff },
        { start: [-1.0, -0.32, 0.88], end: [-2.5, -0.32, 0.52], color: 0x00e5ff }
      ]);
    }

    // 2. DRAG & WAKE TOPIC
    else if (topic === 'drag') {
      const bodyMat = materials?.materials?.body;
      if (bodyMat) {
        bodyMat.emissive.set(0xff4422);
        bodyMat.emissiveIntensity = 1.3;
      }

      const dragMultiplier = state.drsOpen ? 0.65 : 1.0;
      const dragLen = 0.75 * speedScale * dragMultiplier;

      // Front drag resistance vector
      createForceArrow(1.85, 0, 0.25, dragLen, 0, 0, 0xff2211);

      // Incoming free-stream air
      const incoming = [];
      for (let y = -0.7; y <= 0.7; y += 0.35) {
        for (let z = 0.12; z <= 0.65; z += 0.25) {
          incoming.push({
            start: [2.8, y, z],
            end: [1.35, y * 1.15, z],
            color: 0xffffff
          });
        }
      }
      createLaminarStreamlines(incoming);

      // Swirling Wake Vortex Particles behind car
      createTurbulentWake(-1.6, -4.2, speedScale * dragMultiplier);
    }

    // 3. GROUND EFFECT TOPIC
    else if (topic === 'groundEffect') {
      const bodyMat = materials?.materials?.body;
      if (bodyMat) {
        bodyMat.emissive.set(0x00ff88);
        bodyMat.emissiveIntensity = 1.5;
      }

      const rhFactor = (48 - state.rideHeight) / 23; // Higher when lower
      const geStreams = [];
      for (let y = -0.38; y <= 0.38; y += 0.12) {
        geStreams.push({
          start: [1.35, y, 0.08],
          end: [-1.65, y * 1.35, 0.24], // Expands up through diffuser
          color: 0x00ff88
        });
      }
      createLaminarStreamlines(geStreams);

      // Suction isobar contour under the floor
      createUnderfloorIsobars(speedScale * (1 + rhFactor * 0.5));
    }

    // 4. AERO BALANCE TOPIC
    else if (topic === 'balance') {
      const bodyMat = materials?.materials?.body;
      if (bodyMat) {
        bodyMat.emissive.set(0x00e5ff);
        bodyMat.emissiveIntensity = 1.2;
      }

      const fRatio = state.frontAeroSplit / 100;
      const rRatio = (100 - state.frontAeroSplit) / 100;

      // Front axle downforce arrow
      createForceArrow(1.42, 0, 0.25, 0, 0, -1.4 * speedScale * fRatio, 0x00e5ff);

      // Rear axle downforce arrow
      createForceArrow(-1.55, 0, 0.65, 0, 0, -1.4 * speedScale * rRatio, 0xffaa00);
    }
  }

  function createForceArrow(x, y, z, dx, dy, dz, colorHex) {
    const submesh = state.engine.car.mesh?.children?.[0];
    if (!submesh) return;

    const Geom = submesh.geometry.constructor;
    const Mesh = submesh.constructor;
    const Mat = submesh.material.constructor;

    const geom = new Geom();
    const vertices = new Float32Array([
      x, y, z,
      x + dx, y + dy, z + dz
    ]);
    geom.setAttribute('position', new submesh.geometry.attributes.position.constructor(vertices, 3));
    const mat = new Mat({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.95
    });
    state.aeroGroup.add(new Mesh(geom, mat));
  }

  function createLaminarStreamlines(lines) {
    const submesh = state.engine.car.mesh?.children?.[0];
    if (!submesh) return;

    const Geom = submesh.geometry.constructor;
    const Mesh = submesh.constructor;
    const Mat = submesh.material.constructor;

    lines.forEach(l => {
      const geom = new Geom();
      const vertices = new Float32Array([
        l.start[0], l.start[1], l.start[2],
        l.end[0], l.end[1], l.end[2]
      ]);
      geom.setAttribute('position', new submesh.geometry.attributes.position.constructor(vertices, 3));
      const mat = new Mat({
        color: l.color,
        emissive: l.color,
        emissiveIntensity: 1.3,
        transparent: true,
        opacity: 0.8
      });
      state.aeroGroup.add(new Mesh(geom, mat));
    });
  }

  function createTurbulentWake(startX, endX, intensity) {
    const submesh = state.engine.car.mesh?.children?.[0];
    if (!submesh) return;

    const Geom = submesh.geometry.constructor;
    const Mesh = submesh.constructor;
    const Mat = submesh.material.constructor;

    const count = 56;
    const vertices = [];
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const x = startX + (endX - startX) * t;
      const spread = (1 - t) * 0.35 + t * 1.3;
      const y = (Math.random() - 0.5) * spread;
      const z = 0.12 + Math.random() * 0.72;
      vertices.push(x, y, z);
      // Swirling vector
      vertices.push(x - 0.12, y + (Math.random() - 0.5) * 0.08, z + (Math.random() - 0.5) * 0.06);
    }
    const geom = new Geom();
    geom.setAttribute('position', new submesh.geometry.attributes.position.constructor(new Float32Array(vertices), 3));
    const mat = new Mat({
      color: 0xff4422,
      emissive: 0xff3311,
      emissiveIntensity: 1.6,
      transparent: true,
      opacity: 0.65
    });
    state.aeroGroup.add(new Mesh(geom, mat));
  }

  function createUnderfloorIsobars(scale) {
    const submesh = state.engine.car.mesh?.children?.[0];
    if (!submesh) return;

    const Geom = submesh.geometry.constructor;
    const Mesh = submesh.constructor;
    const Mat = submesh.material.constructor;

    const geom = new Geom();
    const vertices = new Float32Array([
      1.15, -0.42, 0.04,  -1.25, -0.48, 0.04,
      1.15,  0.42, 0.04,  -1.25,  0.48, 0.04
    ]);
    geom.setAttribute('position', new submesh.geometry.attributes.position.constructor(vertices, 3));
    const mat = new Mat({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.55
    });
    state.aeroGroup.add(new Mesh(geom, mat));
  }

  // -------------------------------------------------------------
  // FEATURE 3: CLICKABLE COMPONENT EXPLORATION IN KIT MODE
  // -------------------------------------------------------------
  function setupKitInteraction() {
    const { canvas } = state.engine;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', e => {
      state.pointerDownPos = { x: e.clientX, y: e.clientY };
      state.isDragging = false;
    });

    canvas.addEventListener('pointermove', e => {
      const dx = Math.abs(e.clientX - state.pointerDownPos.x);
      const dy = Math.abs(e.clientY - state.pointerDownPos.y);
      if (dx > 5 || dy > 5) {
        state.isDragging = true;
      }
    });

    canvas.addEventListener('pointerup', e => {
      if (state.isDragging) return;
      if (state.currentMode !== 'kit') return;
      onKitRaycastPick(e);
    });
  }

  function onKitRaycastPick(e) {
    const { canvas, camera, car, assembly } = state.engine;
    if (!canvas || !camera || !car || !assembly) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const partsList = assembly.partsList || [];
    if (partsList.length === 0) return;

    const tmpVec = new car.container.position.constructor();
    let selectedPart = null;
    let minDist = 0.16; // Screen pick radius

    for (const part of partsList) {
      if (!part.kitLoc) continue;
      tmpVec.copy(part.kitLoc);
      tmpVec.applyMatrix4(car.container.matrixWorld);
      tmpVec.project(camera);

      const dist = Math.hypot(tmpVec.x - mouseX, tmpVec.y - mouseY);
      if (dist < minDist) {
        minDist = dist;
        selectedPart = part;
      }
    }

    if (selectedPart) {
      const comp = resolveComponent(selectedPart.name);
      if (comp) {
        selectKitComponent(comp.key, selectedPart.name);
      }
    } else {
      deselectKitComponent();
    }
  }

  function selectKitComponent(compKey, partName) {
    state.selectedComponentKey = compKey;
    const comp = COMPONENT_DB[compKey];
    if (!comp) return;

    console.log('[Kit Component Clicked]:', comp.name);

    // Update Chips
    document.querySelectorAll('.f1-kit-chip').forEach(chip => {
      const active = chip.dataset.comp === compKey;
      chip.classList.toggle('active', active);
    });

    // 3D Visual Marker on Part
    highlightKitPart(partName || comp.matchKeys[0]);

    // Show Structured 6-Field Panel
    updateComponentPanel(compKey);
  }

  function deselectKitComponent() {
    state.selectedComponentKey = null;
    clearKitHighlights();
    document.querySelectorAll('.f1-kit-chip').forEach(c => c.classList.remove('active'));
    const panel = document.getElementById('demoKitCompPanel');
    if (panel) panel.classList.remove('visible');
  }

  function clearKitHighlights() {
    if (!state.kitHighlightGroup) return;
    while (state.kitHighlightGroup.children.length > 0) {
      const obj = state.kitHighlightGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      state.kitHighlightGroup.remove(obj);
    }
  }

  function highlightKitPart(partName) {
    clearKitHighlights();
    const { assembly, car } = state.engine;
    if (!assembly || !car) return;

    const part = assembly.partsByName?.[partName];
    if (!part || !part.kitLoc) return;

    const submesh = car.mesh?.children?.[0];
    if (!submesh) return;

    const Geom = submesh.geometry.constructor;
    const Mesh = submesh.constructor;
    const Mat = submesh.material.constructor;

    const pos = new car.container.position.constructor();
    pos.copy(part.kitLoc);
    pos.applyMatrix4(car.container.matrixWorld);

    // Create precision 3D highlight marker bracket
    const geom = new Geom();
    const r = 0.28;
    const markerVerts = [
      pos.x - r, pos.y, pos.z, pos.x + r, pos.y, pos.z,
      pos.x, pos.y - r, pos.z, pos.x, pos.y + r, pos.z,
      pos.x, pos.y, pos.z - r, pos.x, pos.y, pos.z + r
    ];
    geom.setAttribute('position', new submesh.geometry.attributes.position.constructor(new Float32Array(markerVerts), 3));
    const mat = new Mat({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.95
    });

    state.kitHighlightGroup.add(new Mesh(geom, mat));
  }

  function updateComponentPanel(compKey) {
    const comp = COMPONENT_DB[compKey];
    if (!comp) return;

    const panel = document.getElementById('demoKitCompPanel');
    if (!panel) return;

    const specificNote = comp.carSpecific?.[state.activeCar] || '';

    panel.classList.add('visible');
    panel.innerHTML = `
      <div class="f1-panel-header">
        <span class="f1-panel-tag">[ ${comp.category.toUpperCase()} // ${state.activeCar.toUpperCase()} ]</span>
        <button class="f1-panel-close" id="closeKitPanelBtn" aria-label="Close Component Reference">&times;</button>
      </div>
      <h3 class="f1-panel-title">${comp.name}</h3>

      <div class="f1-panel-field">
        <span class="f1-field-label">LOCATION:</span>
        <p class="f1-field-text">${comp.location}</p>
      </div>

      <div class="f1-panel-field">
        <span class="f1-field-label">FUNCTION:</span>
        <p class="f1-field-text">${comp.function}</p>
      </div>

      <div class="f1-panel-field">
        <span class="f1-field-label">ENGINEERING PRINCIPLE:</span>
        <p class="f1-field-text">${comp.principle}</p>
      </div>

      <div class="f1-panel-field">
        <span class="f1-field-label">PERFORMANCE IMPACT:</span>
        <p class="f1-field-text">${comp.performanceImpact}</p>
      </div>

      <div class="f1-panel-field">
        <span class="f1-field-label">ENGINEERING TRADE-OFF:</span>
        <p class="f1-field-text">${comp.tradeoff}</p>
      </div>

      ${specificNote ? `
        <div class="f1-panel-metrics" style="margin-top: 8px;">
          <span class="f1-metric-label">ACTIVE CONFIGURATION SPECIFICATION:</span>
          <span class="f1-metric-val highlight-cyan">${specificNote}</span>
        </div>
      ` : ''}
    `;

    document.getElementById('closeKitPanelBtn')?.addEventListener('click', deselectKitComponent);
  }

  // -------------------------------------------------------------
  // MODE TRANSITIONS & VISIBILITY
  // -------------------------------------------------------------
  function onModeWillChange(newMode) {
    if (state.currentMode === 'studio') {
      clearAeroVisuals();
      restoreCarMaterials();
      const aeroPanel = document.getElementById('demoAeroPanel');
      if (aeroPanel) aeroPanel.classList.remove('visible');
    } else if (state.currentMode === 'kit') {
      deselectKitComponent();
    }
  }

  function onModeDidChange(newMode) {
    state.currentMode = newMode;
    updateModeVisibility(newMode);
  }

  function updateModeVisibility(mode) {
    const aeroPicker = document.getElementById('demoAeroPicker');
    const aeroPanel = document.getElementById('demoAeroPanel');
    const aeroSpeed = document.getElementById('demoAeroSpeed');
    const kitChips = document.getElementById('demoKitChips');
    const kitPanel = document.getElementById('demoKitCompPanel');

    if (mode === 'studio') {
      if (aeroPicker) aeroPicker.classList.add('visible');
      if (kitChips) kitChips.classList.remove('visible');
      if (kitPanel) kitPanel.classList.remove('visible');
      if (state.activeAero !== 'none') {
        if (aeroPanel) aeroPanel.classList.add('visible');
        if (aeroSpeed) aeroSpeed.classList.add('visible');
        buildAeroVisuals(state.activeAero);
      }
    } else if (mode === 'kit') {
      if (aeroPicker) aeroPicker.classList.remove('visible');
      if (aeroPanel) aeroPanel.classList.remove('visible');
      if (aeroSpeed) aeroSpeed.classList.remove('visible');
      if (kitChips) kitChips.classList.add('visible');
      clearAeroVisuals();
    } else {
      // assembled (drive)
      if (aeroPicker) aeroPicker.classList.remove('visible');
      if (aeroPanel) aeroPanel.classList.remove('visible');
      if (aeroSpeed) aeroSpeed.classList.remove('visible');
      if (kitChips) kitChips.classList.remove('visible');
      if (kitPanel) kitPanel.classList.remove('visible');
      clearAeroVisuals();
      deselectKitComponent();
    }
  }

  function onRenderUpdate(dt) {
    state.animTime += dt;
    if (state.currentMode === 'studio' && state.activeAero === 'drag' && state.aeroGroup) {
      state.aeroGroup.children.forEach(ch => {
        if (ch.material && ch.material.opacity) {
          ch.position.x = Math.sin(state.animTime * 8) * 0.03;
        }
      });
    }
  }

  // -------------------------------------------------------------
  // DOM EVENT HANDLERS SETUP
  // -------------------------------------------------------------
  function setupUIEventHandlers() {
    // Mode Buttons Listeners
    document.querySelectorAll('.demoFormulaModePicker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        onModeWillChange(btn.dataset.mode);
        onModeDidChange(btn.dataset.mode);
      });
    });

    // Car Selector
    document.querySelectorAll('.demoCarPicker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyCarStructuralConfiguration(btn.dataset.car);
      });
    });

    // Aero Topic Selector
    document.querySelectorAll('.demoAeroPicker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setAeroTopic(btn.dataset.concept);
      });
    });

    // Airspeed Selector
    document.querySelectorAll('.demoAeroSpeed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.airspeed = parseInt(btn.dataset.speed, 10);
        document.querySelectorAll('.demoAeroSpeed-btn').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.speed, 10) === state.airspeed);
        });
        if (state.activeAero !== 'none') {
          updateAeroPanel(state.activeAero);
          buildAeroVisuals(state.activeAero);
        }
      });
    });

    // Kit Component Chips
    document.querySelectorAll('.f1-kit-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectKitComponent(chip.dataset.comp);
      });
    });
  }

  // Immediately setup UI event handlers if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUIEventHandlers);
  } else {
    setupUIEventHandlers();
  }

  // -------------------------------------------------------------
  // BOOTSTRAP HOOK
  // -------------------------------------------------------------
  if (window.__F1_ENGINE__) {
    initEnhancements(window.__F1_ENGINE__);
  } else {
    window.addEventListener('f1:engineReady', e => {
      initEnhancements(e.detail);
    });
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.__F1_ENGINE__) {
        clearInterval(interval);
        initEnhancements(window.__F1_ENGINE__);
      } else if (attempts > 80) {
        clearInterval(interval);
      }
    }, 150);
  }

  window.initF1Enhancements = initEnhancements;
})();
