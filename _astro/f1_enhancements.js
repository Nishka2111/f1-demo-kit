/**
 * Formula One Website Enhancements (Production Architecture)
 * Designed & Developed for Nishka Mehta
 *
 * 1. Interactive Aerodynamics Education (Downforce, Drag, Lift, Airflow, Wake)
 * 2. Restrained, Laser-Thin Technical Wind-Tunnel Streamlines & Force Vectors
 * 3. Single Compact [ AERO ] Control & Negative-Space Contextual Overlay
 * 4. Clickable Component Exploration in Kit Mode (structured engineering fields)
 */

(function () {
  'use strict';

  // Global State
  const state = {
    engine: null,
    currentMode: 'kit',
    activeAero: 'none',        // 'none' | 'downforce' | 'drag' | 'groundEffect' | 'balance'
    airspeed: 240,             // km/h
    wingAngle: 28,             // degrees (15 - 38)
    drsOpen: false,            // boolean
    rideHeight: 35,            // mm (25, 35, 48)
    frontAeroSplit: 43,        // % (40 - 48)
    selectedComponentKey: null,
    aeroGroup: null,
    driveAeroGroup: null,
    aeroLoop: { active: false, idx: 0, phase: 'in', t: 0 },
    driveAeroAnim: null,
    uiBound: false,
    pointerDownPos: { x: 0, y: 0 },
    pointerType: 'mouse',
    isDragging: false,
    pickAnchor: null,
    pickCandidates: [],
    pickIndex: 0,
    animTime: 0,
    isUndersideView: false,
    cameraPrevPos: null
  };

  // -------------------------------------------------------------
  // CAR-SPECIFIC COMPONENT ENGINEERING DATABASE (KIT MODE)
  // -------------------------------------------------------------
  const COMPONENT_DB = {
    front_wing: {
      category: 'Aerodynamic Downforce & Wake Control',
      name: 'FRONT WING MAINPLANE & FLAPS',
      matchKeys: ['front_wing_center', 'front_wing_flap_left', 'front_wing_flap_right'],
      location: 'At the leading edge of the vehicle, positioned forward of the front wheels and chassis nose.',
      function: 'Manages incoming undisturbed airflow, contributes 25% to 35% of overall vehicle downforce, and conditions aerodynamic wake around the front wheels.',
      principle: 'Multi-element inverted cambered aerofoils generating intense low pressure on the underside and high pressure above. Upper flap angles are adjustable to trim balance.',
      performanceImpact: 'Directly dictates front-axle grip, high-speed corner entry stability, turn-in authority, and overall vehicle aerodynamic balance.',
      tradeoff: 'Increasing wing flap angle generates vital front downforce but induces parasitic profile drag and shifts the aerodynamic center of pressure forward as speed climbs.',
    },
    front_endplates: {
      category: 'Outwash & Vortex Management',
      name: 'FRONT WING ENDPLATES & DIVEPLANES',
      matchKeys: ['front_wing_endplate_left', 'front_wing_endplate_right'],
      location: 'Outer vertical boundaries at the transverse extremities of the front wing.',
      function: 'Prevents spanwise pressure equalization across wing surfaces and generates energetic outwash vortices to steer turbulent wheel wake away from the floor.',
      principle: 'Vorticity generation and pressure boundary separation; guides high-pressure air outwards around the exposed front tyres.',
      performanceImpact: 'Protects the underfloor leading edge from ingesting turbulent, low-energy tyre wake, preserving underfloor ground-effect suction.',
      tradeoff: 'Aggressive outwash generation creates induced vortex drag and increases aerodynamic sensitivity to yaw angles in crosswinds.',
    },
    rear_wing: {
      category: 'Aerodynamic Downforce & Active DRS',
      name: 'REAR WING & DRS SYSTEM',
      matchKeys: ['rear_wing_main_plane', 'rear_wing_top_flap', 'rear_beam_wing'],
      location: 'High-mounted at the trailing edge of the car above the transmission and diffuser exit.',
      function: 'Generates powerful rear-axle downforce to stabilize the chassis under hard braking and traction; incorporates Drag Reduction System (DRS).',
      principle: 'Deep-camber aerofoil operating in free stream air. DRS hydraulic actuator rotates the upper flap horizontal on straights to dump induced drag.',
      performanceImpact: 'Provides driver confidence through high-speed sweeps and prevents snap oversteer during rapid trail-braking phases.',
      tradeoff: 'The largest single source of pressure drag on the car; high-downforce wing angles severely penalize straight-line top speed.',
    },
    rear_endplates: {
      category: 'Trailing Vortex Mitigation',
      name: 'REAR WING ENDPLATES & STRAKES',
      matchKeys: ['rear_wing_endplate_left', 'rear_wing_endplate_right'],
      location: 'Vertical side planes framing both sides of the rear wing aerofoils.',
      function: 'Reduces induced drag by mitigating wingtip vortices and ties rear wing pressure recovery into the upward plume of the rear diffuser.',
      principle: 'Maintains spanwise pressure differentials between the suction lower surface and positive upper surface of the aerofoil.',
      performanceImpact: 'Improves rear wing efficiency by up to 15% and ensures consistent downforce across varying yaw angles.',
      tradeoff: 'Increases lateral surface area, making the vehicle more susceptible to sudden destabilizing gusts in side winds.',
    },
    diffuser: {
      category: 'Ground Effect Underfloor Suction',
      name: 'REAR DIFFUSER & PRESSURE EXPANSION',
      matchKeys: ['diffuser_left', 'diffuser_right'],
      location: 'At the rear of the underfloor, expanding upward between the rear suspension and wheels.',
      function: 'Expands high-velocity underfloor air back to ambient atmospheric pressure, generating severe suction across the entire floor underside.',
      principle: 'Bernoulli principle and Venturi expansion duct. As cross-sectional area expands, airflow decelerates and pressure increases, drawing air through the throat at hyper-speed.',
      performanceImpact: 'Produces the most aerodynamically efficient downforce on the car with the lowest drag-to-downforce penalty.',
      tradeoff: 'Extremely sensitive to ride height and pitch angle; excessive kerb bounce can cause sudden flow separation and violent aerodynamic stall.',
    },
    underfloor: {
      category: 'Venturi Tunnel Aerodynamics',
      name: 'UNDERFLOOR & VENTURI TUNNELS',
      matchKeys: ['body_bottom'],
      location: 'The entire underside of the carbon monocoque chassis between the front and rear axles.',
      function: 'Generates up to 60% of total car downforce via ground effect, using sculpted longitudinal Venturi tunnels.',
      principle: 'Ground proximity forces air through converging and diverging ducts, producing dramatic negative pressure beneath the car’s center of gravity.',
      performanceImpact: 'Enables massive cornering speeds with minimal trailing turbulent wake compared to over-body wings.',
      tradeoff: 'Demands an ultra-stiff mechanical suspension setup to maintain millimeter-precise ride height, compromising mechanical compliance over kerbs.',
    },
    sidepods: {
      category: 'Thermal Packaging & Downwash Flow',
      name: 'SIDEPODS & RADIATOR INLETS',
      matchKeys: ['sidepod_left', 'sidepod_right'],
      location: 'Flanking either side of the monocoque between the front wheels and rear suspension.',
      function: 'Directs cooling air to internal radiators and intercoolers while conditioning boundary-layer air towards the rear wing and floor edges.',
      principle: 'Aggressive undercut geometry channels clean upper airflow downwards onto the floor margin, sealing underfloor low pressure.',
      performanceImpact: 'Ensures the 1,000+ bhp hybrid power unit survives thermal limits while contributing significantly to aerodynamic downwash.',
      tradeoff: 'Radiator internal cooling drag versus external aerodynamic efficiency; tight packaging increases thermal throttling risks in hot climates.',
    },
    monocoque: {
      category: 'Composite Chassis Survival Cell',
      name: 'CARBON COMPOSITE MONOCOQUE',
      matchKeys: ['main_shell'],
      location: 'Central structural core of the vehicle housing the cockpit, fuel cell, and front suspension pick-up points.',
      function: 'Provides ultra-rigid structural foundation capable of resisting severe torsional loads while serving as the driver survival cell.',
      principle: 'Carbon-fibre and Kevlar pre-preg skins cured under autoclave pressure around an aluminium or Nomex honeycomb core.',
      performanceImpact: 'Zero chassis deflection ensures suspension geometry remains true under 5g cornering loads; withstands extreme FIA impact crash tests.',
      tradeoff: 'Extreme manufacturing complexity and expense; absolute torsional rigidity requires meticulous vibration dampening.',
    },
    cockpit: {
      category: 'Driver Cockpit & Impact Structures',
      name: 'COCKPIT, HALO & WINDSCREEN',
      matchKeys: ['cockpit'],
      location: 'Surrounding the driver cockpit opening and helmet envelope.',
      function: 'Houses steering, pedal box, and Grade 5 titanium Halo safety structure capable of supporting 12,000 kg static load.',
      principle: 'Tubular titanium structure with sculpted carbon aerodynamic fairings designed to deflect large debris and absorb rollover energy.',
      performanceImpact: 'Revolutionary driver safety innovation that has prevented fatal head injuries in modern open-wheel motorsport.',
      tradeoff: 'Adds ~9 kg of mass at the highest vertical point of the chassis, slightly elevating the vehicle center of gravity.',
    },
    suspension_front: {
      category: 'Kinematics & Platform Stability',
      name: 'FRONT SUSPENSION (WISHBONES & PUSHROD)',
      matchKeys: ['suspension_front_left', 'suspension_front_right'],
      location: 'Connecting the front wheel uprights to the inboard dampers inside the nose cone.',
      function: 'Maintains tyre contact patch, controls roll and pitch, and stabilizes aerodynamic platform ride height.',
      principle: 'Unequal-length double wishbone layout with aerodynamic carbon shrouds; pushrod actuates inboard bellcrank and heave torsion bars.',
      performanceImpact: 'Dictates steering precision, mechanical front grip, and prevents aerodynamic underfloor pitch sensitivity.',
      tradeoff: 'Aerodynamic shroud optimization versus kinematic adjustability; ultra-stiff springs benefit downforce but hurt kerb-riding traction.',
    },
    suspension_rear: {
      category: 'Traction Kinematics & Roll Center',
      name: 'REAR SUSPENSION (MULTI-LINK & PULLROD)',
      matchKeys: ['suspension_back_left', 'suspension_back_right'],
      location: 'Connecting the rear wheel uprights to the transmission casing and inboard dampers.',
      function: 'Controls rear axle kinematics, squat under acceleration, and longitudinal tyre traction under corner exit.',
      principle: 'Multi-link pullrod configuration lowering the vehicle center of gravity while managing dynamic wheel camber and toe curves.',
      performanceImpact: 'Critical for putting down 1,000 bhp without wheelspin and preventing rear tyre thermal degradation.',
      tradeoff: 'Extremely tight packaging inside the aerodynamic coke-bottle zone complicates trackside mechanical setup access.',
    },
    brakes: {
      category: 'High-Temperature Carbon Braking',
      name: 'CARBON-CARBON BRAKE ASSEMBLIES',
      matchKeys: ['brake_disc_front_left', 'brake_disc_front_right', 'brake_disc_back_left', 'brake_disc_back_right'],
      location: 'Inside each wheel hub behind the rim assembly.',
      function: 'Provides immense stopping torque, decelerating the car from 330 km/h to 100 km/h in under 2.2 seconds at over 5g.',
      principle: 'Carbon-fibre matrix discs and carbon pads with over 1,000 drilled radial cooling holes; operates at 350°C to 1,000°C.',
      performanceImpact: 'Late-braking performance defines overtaking opportunities and overall circuit lap time.',
      tradeoff: 'Brittle performance window: below 300°C carbon brakes offer poor friction, while above 1,000°C rapid disc oxidation occurs.',
    },
    tyres: {
      category: 'Contact Patch Viscoelastic Friction',
      name: 'SLICK RACING TYRES',
      matchKeys: ['tire_front_left', 'tire_front_right', 'tire_back_left', 'tire_back_right'],
      location: 'The vehicle’s four primary contact patches with the circuit asphalt surface.',
      function: 'Transmits every acceleration, braking, and lateral cornering force generated by the chassis and aerodynamics to the road.',
      principle: 'Viscoelastic rubber polymers conforming into track micro-textures through molecular adhesion and hysteresis.',
      performanceImpact: 'The single most decisive performance component; all aerodynamic forces must ultimately act through these four contact patches.',
      tradeoff: 'Softer compound provides maximum grip but suffers rapid thermal blistering; harder compound lasts longer but sacrifices peak grip.',
    },
    wheels: {
      category: 'Unsprung Mass & Rotational Aero',
      name: 'FORGED MAGNESIUM WHEELS',
      matchKeys: ['rim_front_left', 'rim_front_right', 'rim_back_left', 'rim_back_right'],
      location: 'Supporting the tyres at all four wheel stations.',
      function: 'Mounts the racing rubber and features aerodynamic fairings / wheel covers to minimize rotational aerodynamic turbulence.',
      principle: 'Forged AZ80 magnesium alloy offering maximum structural stiffness with minimal rotational inertia.',
      performanceImpact: 'Lower unsprung mass allows dampers to track road imperfections faster, maintaining tyre contact patch stability.',
      tradeoff: 'Magnesium alloys are expensive and vulnerable to cracking under severe kerb strikes.',
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
  // THREE.JS CONSTRUCTORS RESOLVER
  // -------------------------------------------------------------
  function getThreeKit() {
    if (!state.engine) return null;
    const { scene, car, assembly } = state.engine;
    let anyMesh = null;
    if (assembly?.partsList?.length > 0) {
      anyMesh = assembly.partsList.find(p => p.obj?.isMesh && p.obj?.geometry)?.obj;
    }
    if (!anyMesh && car?.mesh) {
      car.mesh.traverse(o => { if (!anyMesh && o.isMesh && o.geometry) anyMesh = o; });
    }
    if (!anyMesh && scene) {
      scene.traverse(o => { if (!anyMesh && o.isMesh && o.geometry) anyMesh = o; });
    }
    if (!anyMesh) return null;

    return {
      Geom: anyMesh.geometry.constructor,
      Mesh: anyMesh.constructor,
      Mat: anyMesh.material?.constructor || state.engine?.materials?.materials?.body?.constructor,
      PosAttr: anyMesh.geometry.attributes.position.constructor,
      Vector3: car?.container?.position?.constructor || anyMesh.position.constructor,
      Group: car?.container?.constructor || scene?.constructor
    };
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

    // Attach DOM event handlers
    setupUIEventHandlers();

    // Hook into Mode Manager safely
    if (engine.modeManager && typeof engine.modeManager.goTo === 'function') {
      const origGoTo = engine.modeManager.goTo.bind(engine.modeManager);
      engine.modeManager.goTo = function (mode) {
        onModeWillChange(mode);
        origGoTo(mode);
        onModeDidChange(mode);
      };
      state.currentMode = engine.modeManager.currentMode || 'kit';
    }

    // Hook into Mode Picker
    if (engine.modePicker?.eventOnModeChange?.addEventListener) {
      engine.modePicker.eventOnModeChange.addEventListener(mode => {
        onModeDidChange(mode);
      });
    }

    // Hook into render loop
    window.__F1_ON_UPDATE__ = onRenderUpdate;

    // Setup interactive raycasting in Kit mode
    setupKitInteraction();

    // Initialize Visibility & Display for Initial Mode.
    // Kit mode intentionally reveals no educational content until the user
    // selects a car part — including during loading and first render.
    updateModeVisibility(state.currentMode);

    console.log('[F1 Enhancements] Clean, minimal architecture ready.');
  }

  function initThreeGroups() {
    const tk = getThreeKit();
    const { scene, car } = state.engine;
    if (!scene || !car || !tk) return;

    // Aero visualization container (Studio: world space)
    state.aeroGroup = new tk.Group();
    state.aeroGroup.name = 'F1_AeroVisualizationGroup';
    scene.add(state.aeroGroup);

    // Drive-mode aero force arrows (attached to the car so they follow it)
    state.driveAeroGroup = new tk.Group();
    state.driveAeroGroup.name = 'F1_DriveAeroVisualizationGroup';
    car.container.add(state.driveAeroGroup);
  }

  // -------------------------------------------------------------
  // FEATURE 2: MINIMALIST, IMMERSIVE AERODYNAMICS IN STUDIO MODE
  // -------------------------------------------------------------
  const AERO_TOPICS = {
    downforce: {
      tag: 'AERO / 01',
      title: 'DOWNFORCE',
      desc: 'Wings and underfloor aerodynamics generate a force towards the track, increasing tyre loading and helping the car corner at higher speeds.',
      principles: 'Bernoulli suction on inverted aerofoils and Newtonian downwash airflow deflection.',
      tradeoffs: 'Greater downforce raises cornering grip but increases induced drag, penalizing straight-line top speed.'
    },
    drag: {
      tag: 'AERO / 02',
      title: 'DRAG',
      desc: 'Aerodynamic drag is the resistance that opposes the car’s forward motion, produced by pressure differences and skin friction across the whole car.',
      principles: 'Pressure drag across blunt trailing edges, skin-friction drag over every surface, and induced drag from the vortices that create downforce.',
      tradeoffs: 'Cutting drag raises straight-line speed and efficiency, but trimming downforce to do so reduces cornering grip.'
    },
    groundEffect: {
      tag: 'AERO / 03',
      title: 'GROUND EFFECT',
      desc: 'Venturi tunnels beneath the floor accelerate air, dropping static pressure to suction the chassis securely to the circuit.',
      principles: 'Venturi converging-diverging ducted acceleration and diffuser ambient pressure recovery.',
      tradeoffs: 'Produces high-efficiency downforce with minimal drag, but is highly sensitive to ride-height changes.'
    },
    balance: {
      tag: 'AERO / 04',
      title: 'AERO BALANCE',
      desc: 'The distribution of downforce between front and rear axles dictates steering turn-in authority and high-speed stability.',
      principles: 'Longitudinal Center of Pressure (CoP) alignment relative to the vehicle Center of Gravity (CoG).',
      tradeoffs: 'Forward balance boosts high-speed turn-in at the risk of oversteer; rearward balance creates secure stability with understeer.'
    },
    lift: {
      tag: 'FORCE / 03',
      title: 'LIFT',
      desc: 'Lift is the upward vertical aerodynamic force on the car. Where downforce presses the car down, positive lift unloads the tyres and reduces grip.',
      principles: 'Arises from the pressure difference between the upper and lower surfaces of every bodywork element.',
      tradeoffs: 'Every surface is shaped to invert lift into negative lift (downforce); the sharper the inversion, the more drag it tends to add.'
    },
    sideForce: {
      tag: 'FORCE / 04',
      title: 'SIDE FORCE',
      desc: 'Side force is the lateral aerodynamic force on the car, generated in yaw by crosswinds, cornering slip angle and asymmetric bodywork.',
      principles: 'Pressure imbalance across the flanks, sidepods and floor edges, plus directional (yawed) airflow over the bodywork.',
      tradeoffs: 'Managed well it adds cornering stability; managed poorly it destabilises the car in crosswinds and adds straight-line drag.'
    },
    airflow: {
      tag: 'AERO / 04',
      title: 'AIRFLOW',
      desc: 'Air arriving at speed is guided from the front wing, over and around the bodywork, then re-energised toward the rear wing, floor and diffuser.',
      principles: 'Streamline attachment and downwash: the front wing conditions the flow while sidepod undercuts and floor edges channel it rearward for consistent downforce.',
      tradeoffs: 'Clean, attached flow maximises downforce efficiency; early separation or turbulence wastes energy and destabilises the rear of the car.'
    },
    wake: {
      tag: 'AERO / 05',
      title: 'WAKE & TURBULENCE',
      desc: 'Behind the car the air leaves disturbed and lower in energy, forming a spreading wake of vortices shed by the rear wing, diffuser and tyres.',
      principles: 'Flow separation, wing-tip vortices and diffuser pressure recovery: the diffuser slows the underfloor flow back to ambient as the wing sheds trailing vortices.',
      tradeoffs: 'A smaller, higher-energy wake lowers this car’s drag, but it also robs a following car of downforce — the effect known as “dirty air”.'
    }
  };

  // Drive-mode force set (vertical / longitudinal / lateral decomposition)
  const AERO_MENU_LABELS = {
    downforce: 'Downforce',
    drag: 'Drag',
    lift: 'Lift',
    airflow: 'Airflow',
    wake: 'Wake & Turbulence',
    sideForce: 'Side Force',
    groundEffect: 'Ground Effect',
    balance: 'Aero Balance'
  };
  const STUDIO_TOPICS = ['downforce', 'drag', 'groundEffect', 'balance'];
  const DRIVE_TOPIC_COLORS = {
    downforce: 0x2ef2ff,
    drag: 0xffa53c,
    lift: 0xff4d6d,
    airflow: 0x7cf9ff,
    wake: 0xffb15e
  };

  // Demo-mode aero loop: each concept is shown slowly, one at a time, on repeat.
  const AERO_LOOP_SEQUENCE = ['downforce', 'drag', 'lift', 'airflow', 'wake'];
  const AERO_LOOP_PHASE = { in: 0.8, hold: 3.4, out: 0.8 };

  function renderAeroMenu(topics) {
    const dropdown = document.getElementById('demoAeroDropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    const addOption = (topic, extraClass) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'f1-aero-opt' + (extraClass ? ' ' + extraClass : '');
      btn.dataset.topic = topic;
      btn.setAttribute('role', 'menuitem');
      btn.textContent = topic === 'none' ? '[ Reset View ]' : (AERO_MENU_LABELS[topic] || topic);
      if (state.activeAero === topic) btn.classList.add('active');
      btn.addEventListener('click', () => {
        setAeroTopic(topic);
        dropdown.classList.remove('open');
        document.getElementById('demoAeroBtn')?.setAttribute('aria-expanded', 'false');
      });
      dropdown.appendChild(btn);
    };

    topics.forEach(t => addOption(t, ''));
    addOption('none', 'f1-aero-off');
  }

  function setAeroTopic(topic) {
    state.activeAero = topic;

    const aeroBtn = document.getElementById('demoAeroBtn');
    const aeroInfo = document.getElementById('demoAeroInfo');

    // Update active state in dropdown
    document.querySelectorAll('.f1-aero-opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.topic === topic);
    });

    if (topic === 'none') {
      if (aeroBtn) {
        aeroBtn.textContent = '[ AERO ]';
        aeroBtn.classList.remove('active');
      }
      if (aeroInfo) aeroInfo.classList.remove('visible');
      clearAeroVisuals();
      clearDriveAeroVisuals();
      restoreCarMaterials();
      return;
    }

    // Update button label to indicate active topic
    const label = AERO_TOPICS[topic]?.title || topic.toUpperCase();
    if (aeroBtn) {
      aeroBtn.textContent = `[ AERO: ${label} ]`;
      aeroBtn.classList.add('active');
    }

    updateAeroOverlay(topic);
    buildAeroVisuals(topic);
  }

  function updateAeroOverlay(topic) {
    const data = AERO_TOPICS[topic];
    const info = document.getElementById('demoAeroInfo');
    if (!data || !info) return;

    const tagEl = document.getElementById('demoAeroTag');
    const titleEl = document.getElementById('demoAeroTitle');
    const descEl = document.getElementById('demoAeroDesc');
    const principlesEl = document.getElementById('demoAeroPrinciples');
    const tradeoffEl = document.getElementById('demoAeroTradeoff');
    const detailsEl = document.getElementById('demoAeroDetails');
    const moreBtn = document.getElementById('toggleAeroDetailsBtn');

    if (tagEl) tagEl.textContent = data.tag;
    if (titleEl) titleEl.textContent = data.title;
    if (descEl) descEl.textContent = data.desc;
    if (principlesEl) principlesEl.textContent = data.principles;
    if (tradeoffEl) tradeoffEl.textContent = data.tradeoffs;

    // Reset details disclosure to collapsed
    if (detailsEl) detailsEl.style.display = 'none';
    if (moreBtn) moreBtn.textContent = '[+ MORE]';

    info.classList.add('visible');
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
    const { car, materials } = state.engine || {};
    if (!car || !materials) return;
    const bodyMat = materials.materials?.body;
    if (bodyMat) {
      bodyMat.color?.set(0xffffff);
      bodyMat.needsUpdate = true;
    }
  }

  // -------------------------------------------------------------
  // FEATURE 3: RESTRAINED, TECHNICAL STREAMLINES (NO POLYGONS/SHARDS)
  // -------------------------------------------------------------
  function clearDriveAeroVisuals() {
    state.driveAeroAnim = null;
    const group = state.driveAeroGroup;
    if (!group) return;
    while (group.children.length > 0) {
      const obj = group.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
      group.remove(obj);
    }
  }

  function buildAeroVisuals(topic) {
    clearAeroVisuals();
    clearDriveAeroVisuals();
    const tk = getThreeKit();
    if (!tk) return;

    const LineSegments = state.engine.LineSegments;
    const LineBasicMaterial = state.engine.LineBasicMaterial;
    if (!LineSegments || !LineBasicMaterial) return;

    // Drive mode: physically meaningful force arrows in the car's own frame
    if (state.currentMode === 'assembled') {
      buildDriveAeroVisuals(topic);
      return;
    }

    if (topic === 'downforce') {
      buildDownforceVisuals(tk, LineSegments, LineBasicMaterial);
    } else if (topic === 'drag') {
      buildDragWakeVisuals(tk, LineSegments, LineBasicMaterial);
    } else if (topic === 'groundEffect') {
      buildGroundEffectVisuals(tk, LineSegments, LineBasicMaterial);
    } else if (topic === 'balance') {
      buildAeroBalanceVisuals(tk, LineSegments, LineBasicMaterial);
    }
  }

  // Appends a single 3D arrow (shaft + 4-sided pyramid head) as line segments.
  // Car frame: +X forward, +Y up, +/-Z lateral.
  function pushArrow(verts, from, to, headLen, headWidth, thickness) {
    const [x0, y0, z0] = from;
    const [x1, y1, z1] = to;

    let dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len; dy /= len; dz /= len;

    const hl = Math.min(headLen, len * 0.55);
    const hw = headWidth;
    const bx = x1 - dx * hl, by = y1 - dy * hl, bz = z1 - dz * hl;

    // First perpendicular axis (u)
    let ux, uy, uz;
    if (Math.abs(dy) < 0.9) { ux = -dz; uy = 0; uz = dx; }
    else { ux = 1; uy = 0; uz = 0; }
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;

    // Shaft: a thin two-line ribbon when a thickness is given, so bold arrows
    // stay legible (WebGL ignores line width on most platforms).
    const th = thickness || 0;
    if (th > 0) {
      verts.push(x0 + ux * th, y0 + uy * th, z0 + uz * th, x1 + ux * th, y1 + uy * th, z1 + uz * th);
      verts.push(x0 - ux * th, y0 - uy * th, z0 - uz * th, x1 - ux * th, y1 - uy * th, z1 - uz * th);
    } else {
      verts.push(x0, y0, z0, x1, y1, z1);
    }

    // Second perpendicular axis (v = d x u)
    let vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
    const vl = Math.hypot(vx, vy, vz) || 1; vx /= vl; vy /= vl; vz /= vl;

    const p1 = [bx + ux * hw, by + uy * hw, bz + uz * hw];
    const p2 = [bx - ux * hw, by - uy * hw, bz - uz * hw];
    const p3 = [bx + vx * hw, by + vy * hw, bz + vz * hw];
    const p4 = [bx - vx * hw, by - vy * hw, bz - vz * hw];

    // Cone edges from tip
    verts.push(x1, y1, z1, p1[0], p1[1], p1[2]);
    verts.push(x1, y1, z1, p2[0], p2[1], p2[2]);
    verts.push(x1, y1, z1, p3[0], p3[1], p3[2]);
    verts.push(x1, y1, z1, p4[0], p4[1], p4[2]);
    // Base ring
    verts.push(p1[0], p1[1], p1[2], p3[0], p3[1], p3[2]);
    verts.push(p3[0], p3[1], p3[2], p2[0], p2[1], p2[2]);
    verts.push(p2[0], p2[1], p2[2], p4[0], p4[1], p4[2]);
    verts.push(p4[0], p4[1], p4[2], p1[0], p1[1], p1[2]);
  }

  // Car-local extents used to place the drive-mode indicators.
  const DRIVE_X_FRONT = 2.0;   // assembled car frame: x spans roughly [-1.83, 1.83]
  const DRIVE_X_REAR = -2.0;

  function getDriveKit() {
    const tk = getThreeKit();
    if (!tk) return null;
    const { LineSegments, LineBasicMaterial, Points, PointsMaterial } = state.engine || {};
    if (!LineSegments || !LineBasicMaterial || !Points || !PointsMaterial) return null;
    return { tk, LineSegments, LineBasicMaterial, Points, PointsMaterial };
  }

  function addDriveArrows(kit, arrows, color) {
    const { tk, LineSegments, LineBasicMaterial } = kit;
    const geom = new tk.Geom();
    geom.setAttribute('position', new tk.PosAttr(new Float32Array(arrows), 3));
    const mat = new LineBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, depthTest: false });
    const seg = new LineSegments(geom, mat);
    seg.name = 'F1_DriveForceArrows';
    seg.renderOrder = 20;
    seg.frustumCulled = false;
    state.driveAeroGroup.add(seg);
  }

  // Animated streamline particles flowing front -> rear over and around the car.
  function buildAirflowParticles(kit) {
    const { tk, Points, PointsMaterial } = kit;
    const COUNT = 140;
    const laneZ = [0, -0.35, 0.35, -0.60, 0.60, -0.80, 0.80];
    const xs = new Float32Array(COUNT), ys = new Float32Array(COUNT), zs = new Float32Array(COUNT);
    const spd = new Float32Array(COUNT), pha = new Float32Array(COUNT), hump = new Float32Array(COUNT);
    const pos = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      xs[i] = DRIVE_X_REAR + Math.random() * (DRIVE_X_FRONT - DRIVE_X_REAR);
      ys[i] = 0.18 + Math.random() * 0.28;
      zs[i] = laneZ[i % laneZ.length] + (Math.random() - 0.5) * 0.12;
      spd[i] = 2.4 + Math.random() * 1.8;
      pha[i] = Math.random() * Math.PI * 2;
      hump[i] = 0.16 + Math.random() * 0.18;
      pos[i * 3] = xs[i]; pos[i * 3 + 1] = ys[i]; pos[i * 3 + 2] = zs[i];
    }

    const geom = new tk.Geom();
    geom.setAttribute('position', new tk.PosAttr(pos, 3));
    const mat = new PointsMaterial({ color: DRIVE_TOPIC_COLORS.airflow, size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const points = new Points(geom, mat);
    points.name = 'F1_DriveAirflow';
    points.renderOrder = 21;
    points.frustumCulled = false;
    state.driveAeroGroup.add(points);

    state.driveAeroAnim = { kind: 'airflow', points, count: COUNT, xs, ys, zs, spd, pha, hump, a: null, xmin: DRIVE_X_REAR, xmax: DRIVE_X_FRONT };
  }

  // Spreading wake flow-lines plus turbulent particles behind the rear wing / diffuser.
  function buildWakeFlow(kit) {
    const { tk, LineSegments, LineBasicMaterial, Points, PointsMaterial } = kit;

    const lines = [];
    const levels = [[0.60, -0.32], [0.60, 0.32], [0.30, -0.46], [0.30, 0.46], [0.10, -0.22], [0.10, 0.22]];
    levels.forEach(([y, z], i) => {
      const dir = z >= 0 ? 1 : -1;
      const spread = dir * (0.30 + 0.10 * i);
      lines.push(-1.70, y, z, -2.50, y + 0.03, z + spread * 0.35);
      lines.push(-2.50, y + 0.03, z + spread * 0.35, -3.40, y + 0.10 + 0.05 * i, z + spread);
      lines.push(-3.40, y + 0.10 + 0.05 * i, z + spread, -4.30, y + 0.18 + 0.08 * i, z + spread * 1.7);
    });
    const geomL = new tk.Geom();
    geomL.setAttribute('position', new tk.PosAttr(new Float32Array(lines), 3));
    const matL = new LineBasicMaterial({ color: DRIVE_TOPIC_COLORS.wake, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const seg = new LineSegments(geomL, matL);
    seg.name = 'F1_DriveWakeLines';
    seg.renderOrder = 20;
    seg.frustumCulled = false;
    state.driveAeroGroup.add(seg);

    const COUNT = 90;
    const xs = new Float32Array(COUNT), ys = new Float32Array(COUNT), zs = new Float32Array(COUNT);
    const spd = new Float32Array(COUNT), pha = new Float32Array(COUNT), spreadA = new Float32Array(COUNT);
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const x0 = -1.60 - Math.random() * 0.5;
      xs[i] = x0;
      ys[i] = 0.05 + Math.random() * 0.55;
      zs[i] = (Math.random() - 0.5) * 1.2;
      spd[i] = 1.4 + Math.random() * 1.6;
      pha[i] = Math.random() * Math.PI * 2;
      spreadA[i] = 0.16 + Math.random() * 0.26;
      pos[i * 3] = xs[i]; pos[i * 3 + 1] = ys[i]; pos[i * 3 + 2] = zs[i];
    }
    const geomP = new tk.Geom();
    geomP.setAttribute('position', new tk.PosAttr(pos, 3));
    const matP = new PointsMaterial({ color: DRIVE_TOPIC_COLORS.wake, size: 0.15, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const points = new Points(geomP, matP);
    points.name = 'F1_DriveWakeParticles';
    points.renderOrder = 21;
    points.frustumCulled = false;
    state.driveAeroGroup.add(points);

    state.driveAeroAnim = { kind: 'wake', points, count: COUNT, xs, ys, zs, spd, pha, a: spreadA, xmin: -4.5, xmax: -1.5 };
  }

  function buildDriveAeroVisuals(topic) {
    const kit = getDriveKit();
    if (!kit || !state.driveAeroGroup) return;
    state.driveAeroAnim = null;

    if (topic === 'downforce') {
      const a = [];
      const add = (f, t) => pushArrow(a, f, t, 0.28, 0.10, 0.022);
      add([1.45, 0.60, -0.42], [1.45, 0.08, -0.42]);
      add([1.45, 0.60, 0.42], [1.45, 0.08, 0.42]);
      add([-1.60, 1.02, -0.34], [-1.60, 0.55, -0.34]);
      add([-1.60, 1.02, 0.34], [-1.60, 0.55, 0.34]);
      add([0.20, 0.40, -0.52], [0.20, -0.06, -0.52]);
      add([0.20, 0.40, 0.52], [0.20, -0.06, 0.52]);
      add([-0.60, 0.38, -0.52], [-0.60, -0.06, -0.52]);
      add([-0.60, 0.38, 0.52], [-0.60, -0.06, 0.52]);
      addDriveArrows(kit, a, DRIVE_TOPIC_COLORS.downforce);
    } else if (topic === 'lift') {
      const a = [];
      const add = (f, t) => pushArrow(a, f, t, 0.28, 0.10, 0.022);
      add([1.45, 0.08, -0.42], [1.45, 0.60, -0.42]);
      add([1.45, 0.08, 0.42], [1.45, 0.60, 0.42]);
      add([-1.60, 0.55, -0.34], [-1.60, 1.02, -0.34]);
      add([-1.60, 0.55, 0.34], [-1.60, 1.02, 0.34]);
      add([0.00, 0.18, -0.45], [0.00, 0.82, -0.45]);
      add([0.00, 0.18, 0.45], [0.00, 0.82, 0.45]);
      addDriveArrows(kit, a, DRIVE_TOPIC_COLORS.lift);
    } else if (topic === 'drag') {
      const a = [];
      const add = (f, t) => pushArrow(a, f, t, 0.28, 0.10, 0.022);
      add([0.85, 0.42, -0.42], [-1.10, 0.42, -0.42]);
      add([0.85, 0.42, 0.42], [-1.10, 0.42, 0.42]);
      add([0.40, 0.22, 0.00], [-1.85, 0.22, 0.00]);
      add([0.25, 0.05, -0.26], [-1.75, 0.05, -0.26]);
      add([0.25, 0.05, 0.26], [-1.75, 0.05, 0.26]);
      add([-0.90, 0.82, -0.34], [-2.05, 0.82, -0.34]);
      add([-0.90, 0.82, 0.34], [-2.05, 0.82, 0.34]);
      addDriveArrows(kit, a, DRIVE_TOPIC_COLORS.drag);
    } else if (topic === 'airflow') {
      buildAirflowParticles(kit);
    } else if (topic === 'wake') {
      buildWakeFlow(kit);
    }
  }

  // Per-frame motion for the particle/flow concepts; correct in the car's frame.
  function animateDriveAeroConcept(dt) {
    const a = state.driveAeroAnim;
    if (!a || !a.points) return;
    const t = state.animTime;
    const arr = a.points.geometry.attributes.position.array;
    const n = a.count;

    for (let i = 0; i < n; i++) {
      let x = a.xs[i] - a.spd[i] * dt;
      if (x < a.xmin) x = a.xmax;
      a.xs[i] = x;

      let y, z;
      if (a.kind === 'airflow') {
        const dxn = (x - 0.20) / 0.80;
        y = a.ys[i] + a.hump[i] * Math.exp(-dxn * dxn) + Math.sin(t * 2.2 + a.pha[i]) * 0.02;
        z = a.zs[i] + Math.sin(t * 1.5 + a.pha[i]) * 0.03;
      } else {
        const spread = Math.max(0, a.xmax - x);
        z = a.zs[i] * (1 + a.a[i] * spread) + Math.sin(t * 3.1 + a.pha[i]) * 0.10;
        y = a.ys[i] + Math.sin(t * 2.6 + a.pha[i] * 1.7) * 0.07 - 0.015 * spread;
      }
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    a.points.geometry.attributes.position.needsUpdate = true;
  }

  // -------------------------------------------------------------
  // DEMO MODE: CONTINUOUS AERO FORCE ANIMATION LOOP
  // Shows each force slowly (fade in -> hold -> fade out) then repeats.
  // -------------------------------------------------------------
  // Fade every material currently in the drive group (arrows or particles).
  function applyDriveAeroOpacity(value) {
    const group = state.driveAeroGroup;
    if (!group) return;
    const v = Math.max(0, Math.min(1, value));
    group.traverse(o => {
      if (!o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => { m.opacity = v; });
    });
  }

  function showDriveAeroForce(topic) {
    if (!state.driveAeroGroup) return false;
    clearDriveAeroVisuals();
    buildDriveAeroVisuals(topic);
    applyDriveAeroOpacity(0);
    return state.driveAeroGroup.children.length > 0;
  }

  function startDriveAeroLoop() {
    if (state.aeroLoop.active) return; // never stack loops
    const first = AERO_LOOP_SEQUENCE[0];
    if (!showDriveAeroForce(first)) return; // renderer not ready

    state.aeroLoop.active = true;
    state.aeroLoop.idx = 0;
    state.aeroLoop.phase = 'in';
    state.aeroLoop.t = 0;

    const aeroBtn = document.getElementById('demoAeroBtn');
    if (aeroBtn) {
      aeroBtn.classList.add('active');
      aeroBtn.textContent = '[ AERO ]';
    }
    updateAeroOverlay(first);
  }

  function stopDriveAeroLoop() {
    if (!state.aeroLoop.active) return;
    state.aeroLoop.active = false;
    state.aeroLoop.phase = 'in';
    state.aeroLoop.t = 0;
    clearDriveAeroVisuals();

    const aeroBtn = document.getElementById('demoAeroBtn');
    if (aeroBtn) {
      aeroBtn.classList.remove('active');
      aeroBtn.textContent = '[ AERO ]';
    }
    const aeroInfo = document.getElementById('demoAeroInfo');
    if (aeroInfo) aeroInfo.classList.remove('visible');
  }

  function toggleDriveAeroLoop() {
    if (state.aeroLoop.active) stopDriveAeroLoop();
    else startDriveAeroLoop();
  }

  function updateDriveAeroLoop(dt) {
    const loop = state.aeroLoop;
    if (!loop.active) return;

    const step = Math.min(dt, 0.05);
    loop.t += step;
    animateDriveAeroConcept(step);

    if (loop.phase === 'in') {
      applyDriveAeroOpacity(loop.t / AERO_LOOP_PHASE.in);
      if (loop.t >= AERO_LOOP_PHASE.in) { loop.phase = 'hold'; loop.t = 0; }
    } else if (loop.phase === 'hold') {
      applyDriveAeroOpacity(1);
      if (loop.t >= AERO_LOOP_PHASE.hold) {
        loop.phase = 'out';
        loop.t = 0;
        const aeroInfo = document.getElementById('demoAeroInfo');
        if (aeroInfo) aeroInfo.classList.remove('visible');
      }
    } else { // 'out'
      applyDriveAeroOpacity(1 - loop.t / AERO_LOOP_PHASE.out);
      if (loop.t >= AERO_LOOP_PHASE.out) {
        loop.idx = (loop.idx + 1) % AERO_LOOP_SEQUENCE.length;
        loop.phase = 'in';
        loop.t = 0;
        showDriveAeroForce(AERO_LOOP_SEQUENCE[loop.idx]);
        updateAeroOverlay(AERO_LOOP_SEQUENCE[loop.idx]);
      }
    }
  }

  // 1. Downforce: Crisp downward force indicators & wing accents
  function buildDownforceVisuals(tk, LineSegments, LineBasicMaterial) {
    const lines = [];

    // Adds a vertical downward force vector with subtle arrow tick barbs
    function addDownwardVector(x, y, zTop, zBottom) {
      lines.push(x, y, zTop, x, y, zBottom);
      const barb = 0.035;
      lines.push(x, y, zBottom, x - barb, y, zBottom + barb * 1.5);
      lines.push(x, y, zBottom, x + barb, y, zBottom + barb * 1.5);
      lines.push(x, y, zBottom, x, y - barb, zBottom + barb * 1.5);
      lines.push(x, y, zBottom, x, y + barb, zBottom + barb * 1.5);
    }

    // Front Wing Downward Vectors (at front wing tips)
    addDownwardVector(1.45, -0.44, 0.22, 0.02);
    addDownwardVector(1.45, 0.44, 0.22, 0.02);

    // Rear Wing Downward Vectors (at rear wing plane)
    addDownwardVector(-1.58, -0.42, 0.70, 0.40);
    addDownwardVector(-1.58, 0.42, 0.70, 0.40);

    // Underfloor Ground-Effect Suction Indicators (under sidepods)
    addDownwardVector(0.2, -0.36, 0.10, -0.01);
    addDownwardVector(0.2, 0.36, 0.10, -0.01);
    addDownwardVector(-0.5, -0.36, 0.10, -0.01);
    addDownwardVector(-0.5, 0.36, 0.10, -0.01);

    // Subtle Surface Accents on Front & Rear Wing Leading Edges
    lines.push(1.46, -0.62, 0.18, 1.46, 0.62, 0.18);
    lines.push(-1.58, -0.52, 0.68, -1.58, 0.52, 0.68);

    const geom = new tk.Geom();
    geom.setAttribute('position', new tk.PosAttr(new Float32Array(lines), 3));
    const mat = new LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    state.aeroGroup.add(new LineSegments(geom, mat));
  }

  // 2. Drag & Wake: Continuous thin streamlines along bodywork and delicate trailing wake
  function buildDragWakeVisuals(tk, LineSegments, LineBasicMaterial) {
    const streamLines = [];

    function addStreamline(pts) {
      for (let i = 0; i < pts.length - 1; i++) {
        streamLines.push(pts[i][0], pts[i][1], pts[i][2], pts[i+1][0], pts[i+1][1], pts[i+1][2]);
      }
    }

    // Over-body streamlines arriving from +X travelling rearward to -X
    // Centerline / Roll-hoop streamline
    addStreamline([
      [2.2, 0, 0.35], [1.6, 0, 0.32], [1.0, 0, 0.42], [0.3, 0, 0.60],
      [-0.4, 0, 0.62], [-1.1, 0, 0.60], [-1.55, 0, 0.70], [-2.3, 0, 0.72]
    ]);

    // Left and Right Sidepod waist streamlines
    [-0.42, 0.42].forEach(y => {
      addStreamline([
        [2.2, y, 0.20], [1.5, y, 0.18], [0.8, y * 0.95, 0.24], [0.0, y * 0.82, 0.26],
        [-0.7, y * 0.75, 0.24], [-1.4, y * 0.92, 0.30], [-2.3, y * 1.05, 0.32]
      ]);
    });

    // Front wheel outwash streamlines
    [-0.68, 0.68].forEach(y => {
      addStreamline([
        [2.2, y, 0.18], [1.5, y * 1.15, 0.20], [0.8, y * 1.25, 0.22],
        [0.0, y * 1.20, 0.22], [-1.0, y * 1.12, 0.22], [-2.0, y * 1.08, 0.22]
      ]);
    });

    // Trailing turbulent wake strictly behind the rear wing & diffuser (-X < -1.6)
    // 6 delicate, restrained wake streamlines (no polygonal shards!)
    const wakeLines = [];
    const wakeLevels = [
      { y: -0.42, z: 0.68 }, { y: 0.42, z: 0.68 },
      { y: -0.18, z: 0.68 }, { y: 0.18, z: 0.68 },
      { y: -0.32, z: 0.16 }, { y: 0.32, z: 0.16 }
    ];

    wakeLevels.forEach((wl, idx) => {
      const spread = 0.08 * (idx % 2 === 0 ? 1 : -1);
      const startX = -1.62;
      const midX = -2.1;
      const endX = -2.7;
      wakeLines.push(
        startX, wl.y, wl.z,
        midX, wl.y + spread * 0.4, wl.z + 0.02,
        midX, wl.y + spread * 0.4, wl.z + 0.02,
        endX, wl.y + spread, wl.z + 0.04
      );
    });

    // Body streamlines: laser-thin aero cyan
    const geomStream = new tk.Geom();
    geomStream.setAttribute('position', new tk.PosAttr(new Float32Array(streamLines), 3));
    const matStream = new LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    state.aeroGroup.add(new LineSegments(geomStream, matStream));

    // Trailing wake: restrained technical warm amber
    const geomWake = new tk.Geom();
    geomWake.setAttribute('position', new tk.PosAttr(new Float32Array(wakeLines), 3));
    const matWake = new LineBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const wakeMesh = new LineSegments(geomWake, matWake);
    wakeMesh.name = 'F1_TrailingWakeSegments';
    state.aeroGroup.add(wakeMesh);
  }

  // 3. Ground Effect: Venturi streamlines and isobars strictly beneath the floor
  function buildGroundEffectVisuals(tk, LineSegments, LineBasicMaterial) {
    const lines = [];

    function addStreamline(pts) {
      for (let i = 0; i < pts.length - 1; i++) {
        lines.push(pts[i][0], pts[i][1], pts[i][2], pts[i+1][0], pts[i+1][1], pts[i+1][2]);
      }
    }

    // 4 Venturi tunnel streamlines passing beneath the floor
    [-0.28, 0.28].forEach(y => {
      addStreamline([
        [1.15, y, 0.07], [0.5, y * 0.95, 0.04], [0.0, y * 0.95, 0.04],
        [-0.5, y * 0.98, 0.04], [-1.0, y * 1.05, 0.08], [-1.45, y * 1.15, 0.18]
      ]);
    });

    // Outer floor edge streamlines
    [-0.44, 0.44].forEach(y => {
      addStreamline([
        [1.0, y, 0.06], [0.2, y * 0.98, 0.04], [-0.4, y * 0.98, 0.04],
        [-0.9, y * 1.02, 0.05], [-1.35, y * 1.05, 0.14]
      ]);
    });

    // Transverse negative pressure isobars beneath the floor
    const isobars = [0.5, 0.1, -0.3, -0.7];
    isobars.forEach(x => {
      lines.push(x, -0.42, 0.04, x, 0.42, 0.04);
    });

    // Diffuser exit expansion lines
    lines.push(-1.45, -0.42, 0.18, -1.45, 0.42, 0.18);

    const geom = new tk.Geom();
    geom.setAttribute('position', new tk.PosAttr(new Float32Array(lines), 3));
    const mat = new LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    state.aeroGroup.add(new LineSegments(geom, mat));
  }

  // 4. Aero Balance: Axle vectors, longitudinal datum, and Center of Pressure crosshair
  function buildAeroBalanceVisuals(tk, LineSegments, LineBasicMaterial) {
    const lines = [];

    // Front axle downward vector
    const xF = 1.35;
    lines.push(xF, 0, 0.30, xF, 0, 0.05);
    lines.push(xF, 0, 0.05, xF - 0.04, 0, 0.09);
    lines.push(xF, 0, 0.05, xF + 0.04, 0, 0.09);
    // Front axle width bar
    lines.push(xF, -0.55, 0.12, xF, 0.55, 0.12);

    // Rear axle downward vector
    const xR = -1.35;
    lines.push(xR, 0, 0.55, xR, 0, 0.28);
    lines.push(xR, 0, 0.28, xR - 0.04, 0, 0.32);
    lines.push(xR, 0, 0.28, xR + 0.04, 0, 0.32);
    // Rear axle width bar
    lines.push(xR, -0.58, 0.16, xR, 0.58, 0.16);

    // Longitudinal balance datum line connecting axles along floor
    lines.push(xF, 0, 0.05, xR, 0, 0.05);

    // Center of Pressure marker cross at x = 0.12 (43% front / 57% rear)
    const xCoP = 0.12;
    lines.push(xCoP, -0.12, 0.05, xCoP, 0.12, 0.05);
    lines.push(xCoP - 0.08, 0, 0.05, xCoP + 0.08, 0, 0.05);

    const geom = new tk.Geom();
    geom.setAttribute('position', new tk.PosAttr(new Float32Array(lines), 3));
    const mat = new LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    state.aeroGroup.add(new LineSegments(geom, mat));
  }

  // -------------------------------------------------------------
  // FEATURE 4: CLICKABLE COMPONENT EXPLORATION IN KIT MODE
  // -------------------------------------------------------------
  function setupKitInteraction() {
    const { canvas } = state.engine || {};
    if (!canvas) return;

    canvas.addEventListener('pointerdown', e => {
      state.pointerDownPos = { x: e.clientX, y: e.clientY };
      state.pointerType = e.pointerType || 'mouse';
      state.isDragging = false;
    });

    canvas.addEventListener('pointermove', e => {
      const dx = Math.abs(e.clientX - state.pointerDownPos.x);
      const dy = Math.abs(e.clientY - state.pointerDownPos.y);
      // Touch taps wobble more than mouse clicks, so allow a wider tolerance.
      const threshold = state.pointerType === 'touch' ? 12 : 5;
      if (dx > threshold || dy > threshold) {
        state.isDragging = true;
      }
    });

    canvas.addEventListener('pointerup', e => {
      if (state.isDragging) return;
      if (state.currentMode !== 'kit') return;
      onKitRaycastPick(e);
    });

    canvas.addEventListener('pointercancel', () => { state.isDragging = true; });
  }

  // Screen-space proximity pick against every part's exploded (kit) anchor.
  // Parts that share a location (tyre / rim / brake on a wheel) are all kept as
  // candidates and cycled through on repeated taps so each one is reachable.
  function onKitRaycastPick(e) {
    const { canvas, camera, car, assembly } = state.engine || {};
    if (!canvas || !camera || !car || !assembly) return;

    const partsList = assembly.partsList || [];
    if (partsList.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const tmpVec = new car.container.position.constructor();
    const candidates = [];
    const PICK_RADIUS = 0.19; // generous NDC radius so small parts stay easy to hit

    for (const part of partsList) {
      if (!part.kitLoc) continue;
      const comp = resolveComponent(part.name);
      if (!comp) continue;

      tmpVec.copy(part.kitLoc);
      tmpVec.applyMatrix4(car.container.matrixWorld);
      tmpVec.project(camera);

      const dist = Math.hypot(tmpVec.x - mouseX, tmpVec.y - mouseY);
      if (dist <= PICK_RADIUS) {
        candidates.push({ part, comp, dist, depth: tmpVec.z });
      }
    }

    if (candidates.length === 0) {
      state.pickAnchor = null;
      state.pickCandidates = [];
      state.pickIndex = 0;
      deselectKitComponent();
      return;
    }

    // Nearest anchor first; on a near-tie prefer the part nearer the camera
    // (so the visible, outer component wins rather than one hidden inside it).
    candidates.sort((a, b) => (a.dist - b.dist) || (a.depth - b.depth));

    const anchor = state.pickAnchor;
    const sameSpot = anchor && Math.hypot(anchor.x - e.clientX, anchor.y - e.clientY) < 16;
    if (sameSpot && state.pickCandidates.length === candidates.length) {
      state.pickIndex = (state.pickIndex + 1) % candidates.length;
    } else {
      state.pickIndex = 0;
    }
    state.pickAnchor = { x: e.clientX, y: e.clientY };
    state.pickCandidates = candidates;

    const chosen = candidates[state.pickIndex];
    selectKitComponent(chosen.comp.key, chosen.part.name);
  }

  function selectKitComponent(compKey) {
    state.selectedComponentKey = compKey;
    const comp = COMPONENT_DB[compKey];
    if (!comp) return;

    console.log('[Kit Component Selected]:', comp.name);

    // Show Structured 6-Field Panel
    updateComponentPanel(compKey);
  }

  function deselectKitComponent() {
    state.selectedComponentKey = null;
    const panel = document.getElementById('demoKitCompPanel');
    if (panel) panel.classList.remove('visible');
  }

  function updateComponentPanel(compKey) {
    const comp = COMPONENT_DB[compKey];
    if (!comp) return;

    const panel = document.getElementById('demoKitCompPanel');
    if (!panel) return;

    panel.classList.add('visible');
    panel.innerHTML = `
      <div class="f1-panel-header">
        <span class="f1-panel-tag">[ ${comp.category ? comp.category.toUpperCase() : 'COMPONENT'} ]</span>
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
      const aeroInfo = document.getElementById('demoAeroInfo');
      if (aeroInfo) aeroInfo.classList.remove('visible');
      const aeroDropdown = document.getElementById('demoAeroDropdown');
      if (aeroDropdown) aeroDropdown.classList.remove('open');
    } else if (state.currentMode === 'kit') {
      deselectKitComponent();
    } else if (state.currentMode === 'assembled') {
      if (state.aeroLoop.active) stopDriveAeroLoop();
      clearDriveAeroVisuals();
      restoreCarMaterials();
      const aeroInfo = document.getElementById('demoAeroInfo');
      if (aeroInfo) aeroInfo.classList.remove('visible');
      const aeroDropdown = document.getElementById('demoAeroDropdown');
      if (aeroDropdown) aeroDropdown.classList.remove('open');
    }
  }

  function onModeDidChange(newMode) {
    state.currentMode = newMode;
    updateModeVisibility(newMode);
  }

  function updateModeVisibility(mode) {
    const aeroControl = document.getElementById('demoAeroControl');
    const aeroInfo = document.getElementById('demoAeroInfo');
    const aeroDropdown = document.getElementById('demoAeroDropdown');
    const kitPanel = document.getElementById('demoKitCompPanel');

    if (mode === 'assembled') {
      // Demo (Drive) mode: the AERO button drives a looping force visualization.
      if (state.aeroLoop.active) stopDriveAeroLoop();
      if (state.activeAero !== 'none') setAeroTopic('none');
      if (aeroControl) aeroControl.classList.add('visible');
      if (kitPanel) kitPanel.classList.remove('visible');
      if (aeroDropdown) aeroDropdown.classList.remove('open');
      if (aeroInfo) aeroInfo.classList.remove('visible');
      clearAeroVisuals();
      clearDriveAeroVisuals();
      restoreCarMaterials();
      const aeroBtn = document.getElementById('demoAeroBtn');
      if (aeroBtn) { aeroBtn.textContent = '[ AERO ]'; aeroBtn.classList.remove('active'); }
    } else if (mode === 'studio') {
      // Studio keeps the selectable topic dropdown.
      if (aeroDropdown) aeroDropdown.classList.remove('open');
      renderAeroMenu(STUDIO_TOPICS);
      if (aeroControl) aeroControl.classList.add('visible');
      if (kitPanel) kitPanel.classList.remove('visible');

      if (state.activeAero !== 'none') {
        updateAeroOverlay(state.activeAero);
        buildAeroVisuals(state.activeAero);
      } else {
        if (aeroInfo) aeroInfo.classList.remove('visible');
        clearAeroVisuals();
        clearDriveAeroVisuals();
        restoreCarMaterials();
      }
    } else if (mode === 'kit') {
      if (aeroControl) aeroControl.classList.remove('visible');
      if (aeroInfo) aeroInfo.classList.remove('visible');
      if (aeroDropdown) aeroDropdown.classList.remove('open');
      clearAeroVisuals();
      clearDriveAeroVisuals();
      // Kit mode reveals no educational content until the user selects a part.
      deselectKitComponent();
    }
  }

  function onRenderUpdate(dt) {
    state.animTime += dt;
    if (state.currentMode === 'studio' && state.activeAero === 'drag' && state.aeroGroup) {
      const wake = state.aeroGroup.getObjectByName('F1_TrailingWakeSegments');
      if (wake) {
        // Subtle, smooth pulsation along -X to simulate dynamic wake dissipation
        wake.position.x = Math.sin(state.animTime * 3) * 0.02;
      }
    }
    if (state.aeroLoop.active) {
      updateDriveAeroLoop(dt);
    }
  }

  // -------------------------------------------------------------
  // DOM EVENT HANDLERS SETUP
  // -------------------------------------------------------------
  function setupUIEventHandlers() {
    // Guard against double-binding (bootstrap + initEnhancements both call this),
    // which would make toggle buttons fire twice and never appear to work.
    if (state.uiBound) return;
    state.uiBound = true;

    // Mode Buttons Listeners
    document.querySelectorAll('.demoFormulaModePicker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetMode = btn.dataset.mode;
        if (state.engine?.modeManager?.goTo) {
          state.engine.modeManager.goTo(targetMode);
        } else {
          onModeWillChange(targetMode);
          onModeDidChange(targetMode);
        }
      });
    });

    // Single Compact AERO button toggle
    const aeroBtn = document.getElementById('demoAeroBtn');
    const aeroDropdown = document.getElementById('demoAeroDropdown');

    aeroBtn?.addEventListener('click', e => {
      e.stopPropagation();
      // In Demo (Drive) mode the AERO button toggles the looping force animation.
      if (state.currentMode === 'assembled') {
        toggleDriveAeroLoop();
        return;
      }
      aeroDropdown?.classList.toggle('open');
      const isOpen = aeroDropdown?.classList.contains('open');
      aeroBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close dropdown on click outside
    document.addEventListener('click', e => {
      if (!e.target.closest('#demoAeroControl')) {
        aeroDropdown?.classList.remove('open');
        aeroBtn?.setAttribute('aria-expanded', 'false');
      }
    });

    // Dropdown options are (re)built per mode by renderAeroMenu().
    // Seed the Studio set so the control works before the first mode change.
    renderAeroMenu(STUDIO_TOPICS);

    // Close Compact Aero Info Overlay button
    document.getElementById('closeAeroInfoBtn')?.addEventListener('click', () => {
      setAeroTopic('none');
    });

    // Toggle Details inside Compact Aero Info
    document.getElementById('toggleAeroDetailsBtn')?.addEventListener('click', () => {
      const details = document.getElementById('demoAeroDetails');
      const moreBtn = document.getElementById('toggleAeroDetailsBtn');
      if (!details || !moreBtn) return;
      const isHidden = details.style.display === 'none';
      details.style.display = isHidden ? 'block' : 'none';
      moreBtn.textContent = isHidden ? '[- LESS]' : '[+ MORE]';
    });

    // Close button for pre-rendered Kit panel
    document.getElementById('closeKitPanelBtn')?.addEventListener('click', deselectKitComponent);
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
