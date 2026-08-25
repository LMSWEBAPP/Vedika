/**
 * Interactive HTML5 STEM Simulations Catalog for Vedika Virtual Labs
 */

export const PHET_SIMULATIONS = {
  physics: [
    {
      id: 'circuit-construction-kit-dc',
      title: "Circuit Construction Kit: DC",
      embedUrl: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html",
      category: "physics",
      badge: "Electricity & Circuits",
      description: "An electronics kit in your computer! Build DC circuits with resistors, light bulbs, switches, and batteries. Measure voltage with a voltmeter and current with an ammeter.",
      objectives: [
        "Explore basic electric circuit components and closed-loop current flow.",
        "Verify Ohm's Law (V = IR) across different load resistors.",
        "Compare series vs parallel circuit current distribution and total resistance."
      ],
      keyFormulas: ["V = I × R", "P = V × I", "R_series = R1 + R2", "1/R_parallel = 1/R1 + 1/R2"],
      guidedQuestions: [
        "What happens to the total current when additional resistors are added in series versus in parallel?",
        "If you double the battery voltage while keeping resistance constant, what happens to the ammeter reading?",
        "Why does a light bulb grow brighter when current through it increases?"
      ]
    },
    {
      id: 'forces-and-motion-basics',
      title: "Forces and Motion: Basics",
      embedUrl: "https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_all.html",
      category: "physics",
      badge: "Mechanics & Newton's Laws",
      description: "Explore net force, friction, acceleration, and inertia. Tug-of-war simulations, moving crates across different surfaces, and observing acceleration vectors.",
      objectives: [
        "Relate net force to the state of motion of an object (Newton's 1st & 2nd Laws).",
        "Observe how static and kinetic friction affect acceleration.",
        "Measure the relationship between mass, applied force, and rate of acceleration."
      ],
      keyFormulas: ["F_net = m × a", "F_friction = μ × N", "v = u + a×t"],
      guidedQuestions: [
        "If applied force equals friction force, what is the acceleration of the object?",
        "Why does an object continue moving at constant speed when net force becomes zero in a frictionless environment?",
        "How does doubling the mass affect acceleration under the same applied force?"
      ]
    },
    {
      id: 'pendulum-lab',
      title: "Simple & Double Pendulum Lab",
      embedUrl: "https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_all.html",
      category: "physics",
      badge: "Oscillations & Waves",
      description: "Play with one or two pendulums and discover how the period of a simple pendulum depends on the length of the string, mass of the bob, amplitude, and gravity.",
      objectives: [
        "Measure the time period T of pendulum oscillation.",
        "Determine the effect of length (L), mass (m), and gravitational acceleration (g) on period T.",
        "Observe energy exchange between kinetic energy (KE) and potential energy (PE)."
      ],
      keyFormulas: ["T = 2π × √(L / g)", "PE = m × g × h", "KE = ½ × m × v²"],
      guidedQuestions: [
        "Does increasing the mass of the bob change the pendulum's time period?",
        "What happens to the pendulum's period if you move the experiment from Earth to the Moon (g = 1.62 m/s²)?",
        "At what point during the swing is kinetic energy maximum?"
      ]
    },
    {
      id: 'projectile-motion',
      title: "Projectile Motion Simulator",
      embedUrl: "https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_all.html",
      category: "physics",
      badge: "Kinematics 2D",
      description: "Blast a cannonball out of a cannon! Adjust angle, initial velocity, mass, diameter, and air resistance to observe parabolic trajectories.",
      objectives: [
        "Determine how launch angle and velocity affect horizontal range and maximum height.",
        "Separate 2D motion into independent horizontal and vertical components.",
        "Evaluate the impact of air resistance and drag coefficients."
      ],
      keyFormulas: [
        "Range R = (u² × sin(2θ)) / g",
        "H_max = (u² × sin²(θ)) / (2g)",
        "Time of Flight t = (2u × sin(θ)) / g"
      ],
      guidedQuestions: [
        "Which launch angle yields maximum horizontal distance in vacuum conditions?",
        "Is the vertical velocity component zero at the peak of the trajectory?",
        "How does air drag affect maximum height compared to ideal vacuum trajectory?"
      ]
    },
    {
      id: 'energy-skate-park',
      title: "Energy Skate Park",
      embedUrl: "https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_all.html",
      category: "physics",
      badge: "Work & Energy",
      description: "Learn about conservation of energy with a skater dude! Build tracks, ramps, and jumps for the skater and view kinetic, potential, thermal energy, and friction.",
      objectives: [
        "Verify the Law of Conservation of Energy (E_total = KE + PE + Thermal).",
        "Analyze real-time bar graphs and pie charts of mechanical energy transitions.",
        "Observe energy loss due to friction turned into thermal dissipation."
      ],
      keyFormulas: ["E_total = KE + PE", "PE = m×g×h", "KE = ½×m×v²", "W = F×d"],
      guidedQuestions: [
        "Where on the track is potential energy at its highest?",
        "What happens to mechanical energy when friction is turned on?",
        "Why does the skater fail to complete a loop if released from a height lower than the loop peak?"
      ]
    },
    {
      id: 'wave-interference',
      title: "Wave Interference & Optics",
      embedUrl: "https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_all.html",
      category: "physics",
      badge: "Waves & Quantum Optics",
      description: "Make waves with a dripping faucet, audio speaker, or laser! Adjust frequency and amplitude, and observe interference patterns from double slits.",
      objectives: [
        "Observe constructive and destructive wave interference patterns.",
        "Verify Young's double-slit experiment interference fringes.",
        "Understand wave velocity, frequency, and wavelength relationships."
      ],
      keyFormulas: ["v = f × λ", "d × sin(θ) = m × λ (Constructive)", "d × sin(θ) = (m + ½) × λ (Destructive)"],
      guidedQuestions: [
        "What happens to fringe spacing on the screen when slit separation d is decreased?",
        "How does increasing light frequency (shifting towards blue/violet) affect wavelength λ?",
        "What conditions produce total destructive interference?"
      ]
    },
    {
      id: 'gravity-and-orbits',
      title: "Gravity & Planetary Orbits",
      embedUrl: "https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_all.html",
      category: "physics",
      badge: "Astrophysics & Gravitation",
      description: "Move the sun, earth, moon and space station to see how it affects their gravitational forces and orbital paths. Visualize gravitational force vectors.",
      objectives: [
        "Understand Newton's Law of Universal Gravitation.",
        "Explore circular and elliptical planetary orbits.",
        "Analyze orbital speed dependence on orbital radius."
      ],
      keyFormulas: ["F_g = G × (m1 × m2) / r²", "v_orbital = √(G × M / r)"],
      guidedQuestions: [
        "If the distance between Earth and Sun is halved, by what factor does gravitational force increase?",
        "What happens to the Moon's trajectory if gravity is suddenly turned off?",
        "Why do satellites closer to Earth require higher orbital velocities?"
      ]
    },
    {
      id: 'ohms-law',
      title: "Ohm's Law Visualizer",
      embedUrl: "https://phet.colorado.edu/sims/html/ohms-law/latest/ohms-law_all.html",
      category: "physics",
      badge: "Electromagnetism",
      description: "See how the equation form of Ohm's law relates to a simple circuit. Change the voltage and resistance, and see the current change according to Ohm's law.",
      objectives: [
        "Directly observe proportional relationship between Voltage (V) and Current (I).",
        "Observe inverse relationship between Resistance (R) and Current (I).",
        "Visualize microscopic electron drift velocity under electric fields."
      ],
      keyFormulas: ["V = I × R", "I = V / R", "R = V / I"],
      guidedQuestions: [
        "If voltage is tripled while resistance remains constant, what happens to current?",
        "Why does increasing resistance cause current to decrease?",
        "What is the mathematical slope of a V vs I linear graph?"
      ]
    }
  ],

  chemistry: [
    {
      id: 'build-an-atom',
      title: "Build an Atom (Subatomic Particles)",
      embedUrl: "https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_all.html",
      category: "chemistry",
      badge: "Atomic Structure & Periodic Table",
      description: "Build atoms from scratch with protons, neutrons, and electrons. See how element identity, atomic mass, net charge, and stability change with subatomic composition.",
      objectives: [
        "Identify element name by proton number (Atomic Number Z).",
        "Calculate Mass Number A = Protons + Neutrons and Net Charge = Protons - Electrons.",
        "Determine atomic stability and ion formation (+ or - charge)."
      ],
      keyFormulas: ["Z = Protons", "A = Protons + Neutrons", "Charge = Protons - Electrons"],
      guidedQuestions: [
        "Which subatomic particle determines the element's identity on the Periodic Table?",
        "What is an isotope, and which particle varies between isotopes of the same element?",
        "How does an atom become a negatively charged anion?"
      ]
    },
    {
      id: 'ph-scale',
      title: "pH Scale: Acids & Bases",
      embedUrl: "https://phet.colorado.edu/sims/html/ph-scale/latest/ph-scale_all.html",
      category: "chemistry",
      badge: "Acid-Base Chemistry",
      description: "Test the pH of everyday liquids such as coffee, milk, soap, and drain cleaner! Investigate how dilution with water alters pH and hydronium/hydroxide concentration.",
      objectives: [
        "Classify liquids as acidic (pH < 7), neutral (pH = 7), or basic/alkaline (pH > 7).",
        "Relate logarithmic pH scale to concentration of H3O+ and OH- ions.",
        "Observe pH changes during dilution with pure water."
      ],
      keyFormulas: ["pH = -log10[H3O+]", "[H3O+] × [OH-] = 10^-14 (at 25°C)", "pH + pOH = 14"],
      guidedQuestions: [
        "If a solution has a pH of 3, what is its H3O+ ion concentration?",
        "How much does H3O+ concentration change when pH increases from 4 to 6?",
        "Does diluting an acidic solution with water bring its pH closer to 7 or 14?"
      ]
    },
    {
      id: 'concentration',
      title: "Solution Concentration & Molarity",
      embedUrl: "https://phet.colorado.edu/sims/html/concentration/latest/concentration_all.html",
      category: "chemistry",
      badge: "Stoichiometry & Solutions",
      description: "Dissolve various solid solutes into water to make colorful chemical solutions. Measure concentration with a concentration meter, add more solute, or evaporate water.",
      objectives: [
        "Define molarity (M) as moles of solute per liter of solution.",
        "Differentiate between unsaturated, saturated, and supersaturated solutions.",
        "Predict concentration changes during evaporation and dilution."
      ],
      keyFormulas: ["Molarity M = moles of solute / Liters of solution", "M1 × V1 = M2 × V2 (Dilution Equation)"],
      guidedQuestions: [
        "What happens to solution concentration when water evaporates while solute remains?",
        "What visual indicator appears when a solution reaches saturation limit?",
        "How much water must be added to 1L of 2M solution to dilute it to 1M?"
      ]
    },
    {
      id: 'states-of-matter',
      title: "States of Matter & Phase Transitions",
      embedUrl: "https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_all.html",
      category: "chemistry",
      badge: "Thermodynamics & Kinetic Theory",
      description: "Heat, cool, and compress atoms and molecules (Neon, Argon, Oxygen, Water) to observe phase changes between Solid, Liquid, Gas, and Plasma.",
      objectives: [
        "Relate molecular motion and kinetic energy to temperature.",
        "Observe phase transitions: melting, freezing, vaporization, condensation, sublimation.",
        "Examine Phase Diagrams (Pressure vs Temperature)."
      ],
      keyFormulas: ["KE_avg = 3/2 × k_B × T", "P × V = n × R × T"],
      guidedQuestions: [
        "Why do water molecules exhibit dipole hydrogen bonding structure in solid ice?",
        "What happens to pressure inside a sealed container when temperature is increased?",
        "Describe particle spacing and kinetic freedom in the gas state versus solid state."
      ]
    },
    {
      id: 'gas-properties',
      title: "Gas Properties (Ideal Gas Laws)",
      embedUrl: "https://phet.colorado.edu/sims/html/gas-properties/latest/gas-properties_all.html",
      category: "chemistry",
      badge: "Gas Dynamics & Thermodynamics",
      description: "Pump gas molecules into a box and see how volume, pressure, temperature, and gravity interact. Hold one variable constant to verify Boyle's Law, Charles's Law, and Gay-Lussac's Law.",
      objectives: [
        "Verify Ideal Gas Law P×V = n×R×T.",
        "Explore Boyle's Law (P ∝ 1/V), Charles's Law (V ∝ T), and Gay-Lussac's Law (P ∝ T).",
        "Observe molecular collision rates on container walls yielding pressure."
      ],
      keyFormulas: ["P × V = n × R × T", "P1 × V1 / T1 = P2 × V2 / T2"],
      guidedQuestions: [
        "If you decrease container volume by half while temperature is constant, what happens to pressure?",
        "Why does increasing temperature cause pressure to rise in a fixed-volume container?",
        "What causes a pressure gauge to register pressure at the microscopic molecular level?"
      ]
    },
    {
      id: 'molecule-shapes',
      title: "Molecule Shapes (VSEPR Theory)",
      embedUrl: "https://phet.colorado.edu/sims/html/molecule-shapes/latest/molecule-shapes_all.html",
      category: "chemistry",
      badge: "Chemical Bonding & Geometry",
      description: "Explore 3D molecular geometries by adding single, double, or triple bonds and lone pairs to a central atom. Discover VSEPR electron domain repulsions and bond angles.",
      objectives: [
        "Predict 3D molecular geometry using VSEPR (Valence Shell Electron Pair Repulsion) theory.",
        "Distinguish between electron geometry and molecular geometry.",
        "Determine bond angles (109.5°, 120°, 180°, 90°) for linear, trigonal planar, tetrahedral, bent, and trigonal pyramidal molecules."
      ],
      keyFormulas: ["VSEPR Steric Number = Bonding Pairs + Lone Pairs"],
      guidedQuestions: [
        "Why does water (H2O) have a bent shape rather than linear geometry?",
        "What bond angle is associated with a perfect tetrahedral molecule like Methane (CH4)?",
        "How do unshared lone pairs affect bond angles compared to bonding pairs?"
      ]
    },
    {
      id: 'reactants-products-and-leftovers',
      title: "Reactants, Products & Leftovers (Limiting Reagent)",
      embedUrl: "https://phet.colorado.edu/sims/html/reactants-products-and-leftovers/latest/reactants-products-and-leftovers_all.html",
      category: "chemistry",
      badge: "Stoichiometry & Yield",
      description: "Make sandwiches and molecules! Learn about limiting reactants, theoretical yield, and unreacted leftover excess reagents in balanced chemical reactions.",
      objectives: [
        "Identify the limiting reactant in a chemical reaction mixture.",
        "Calculate theoretical yield of products formed based on stoichiometric coefficients.",
        "Determine mass and mole quantity of excess reactant remaining."
      ],
      keyFormulas: ["Yield = (Actual / Theoretical) × 100%"],
      guidedQuestions: [
        "If you have 5 slices of bread and 8 cheese slices (where 1 sandwich = 2 bread + 1 cheese), how many sandwiches can you make, and what is leftover?",
        "In the synthesis of Ammonia (N2 + 3H2 → 2NH3), if you start with 2 moles N2 and 3 moles H2, which reagent limits product yield?",
        "Why does the limiting reagent determine maximum product output?"
      ]
    },
    {
      id: 'balancing-chemical-equations',
      title: "Balancing Chemical Equations",
      embedUrl: "https://phet.colorado.edu/sims/html/balancing-chemical-equations/latest/balancing-chemical-equations_all.html",
      category: "chemistry",
      badge: "Chemical Reactions",
      description: "Balance chemical equations for synthesis of ammonia, water separation, and methane combustion! Balance atoms using balance scales and visual molecular representation.",
      objectives: [
        "Apply Law of Conservation of Mass to chemical equations.",
        "Ensure equal counts of each element's atoms on both Reactant and Product sides.",
        "Practice balancing combustion, synthesis, and decomposition reactions."
      ],
      keyFormulas: ["Mass_reactants = Mass_products"],
      guidedQuestions: [
        "Why are subscript numbers inside chemical formulas never altered when balancing equations?",
        "What are the correct stoichiometric coefficients for CH4 + O2 → CO2 + H2O?",
        "How does a balance scale visually show when an equation is balanced?"
      ]
    }
  ],

  biology: [
    {
      id: 'natural-selection',
      title: "Natural Selection & Evolution",
      embedUrl: "https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_all.html",
      category: "biology",
      badge: "Genetics & Evolution",
      description: "Explore natural selection with a population of bunnies! Introduce genetic mutations (fur color, ear shape, teeth length), environmental pressures (wolves, food scarcity), and climate changes.",
      objectives: [
        "Track allele frequency shifts over generations under selective pressure.",
        "Differentiate dominant vs recessive mutations in phenotypic traits.",
        "Observe adaptation, camouflage advantages, and extinction risks."
      ],
      keyFormulas: ["Hardy-Weinberg: p² + 2pq + q² = 1", "p + q = 1"],
      guidedQuestions: [
        "In an equator environment with wolves, why does brown fur mutation confer higher survival fitness than white fur?",
        "How does food scarcity influence selection for long-teeth phenotype?",
        "What happens to a recessive mutation in a small population without selective predators?"
      ]
    },
    {
      id: 'gene-expression-essentials',
      title: "Gene Expression Essentials (Transcription & Translation)",
      embedUrl: "https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_all.html",
      category: "biology",
      badge: "Molecular Biology & Genetics",
      description: "Examine gene regulation! Drag RNA Polymerase to a DNA gene sequence to transcribe mRNA, and watch Ribosomes translate mRNA into folded functional proteins.",
      objectives: [
        "Follow Central Dogma of Molecular Biology: DNA → mRNA → Protein.",
        "Understand role of transcription factors, promoters, and RNA Polymerase.",
        "Observe mRNA degradation, translation rates, and protein folding."
      ],
      keyFormulas: ["Codon (3 mRNA bases) = 1 Amino Acid"],
      guidedQuestions: [
        "What is the role of positive transcription factors bound to the regulatory region?",
        "How does mRNA destruction/degradation affect protein production synthesis level?",
        "What determines the final 3D folded conformation of a newly synthesized protein?"
      ]
    },
    {
      id: 'neuron',
      title: "Neuron Action Potential & Signal Transmission",
      embedUrl: "https://phet.colorado.edu/sims/html/neuron/latest/neuron_all.html",
      category: "biology",
      badge: "Neurobiology & Physiology",
      description: "Stimulate a neuron to fire an action potential! Observe sodium (Na+) and potassium (K+) voltage-gated ion channels opening and closing along the axon membrane.",
      objectives: [
        "Trace resting membrane potential (-70mV), depolarization, repolarization, and hyperpolarization.",
        "Observe Na+/K+ ATPase pump maintaining electrochemical concentration gradients.",
        "Understand threshold potential (-55mV) and all-or-none action potential firing."
      ],
      keyFormulas: ["Nernst Equation: E_ion = (RT / zF) × ln([Ion_out] / [Ion_in])"],
      guidedQuestions: [
        "Which ion influx causes rapid membrane depolarization during an action potential?",
        "Why is an action potential described as an 'all-or-none' electrical event?",
        "What role does the refractory period play in ensuring one-way propagation along the axon?"
      ]
    },
    {
      id: 'color-vision',
      title: "Color Vision & Photoreceptors",
      embedUrl: "https://phet.colorado.edu/sims/html/color-vision/latest/color-vision_all.html",
      category: "biology",
      badge: "Sensory Physiology & Optics",
      description: "Investigate how the human brain perceives colors! Mix Red, Green, and Blue light sources, and examine cone cell photoreceptor stimulation in the retina.",
      objectives: [
        "Explore additive color mixing (Red + Green = Yellow, Red + Blue = Magenta, Green + Blue = Cyan).",
        "Understand trichromatic vision theory with S, M, and L cone photoreceptors.",
        "Observe perception of white light under equal RGB stimulation."
      ],
      keyFormulas: ["Visible Wavelength Range: ~380nm (Violet) to 750nm (Red)"],
      guidedQuestions: [
        "Which cone cell types in the retina are activated when viewing Yellow light?",
        "What color is perceived when Red, Green, and Blue light beams of equal intensity overlap?",
        "How does placing a colored filter affect white light transmission?"
      ]
    },
    {
      id: 'membrane-channels',
      title: "Cell Membrane Transport & Channels",
      embedUrl: "https://phet.colorado.edu/sims/html/membrane-channels/latest/membrane-channels_all.html",
      category: "biology",
      badge: "Cell Biology & Transport",
      description: "Watch particles move across a phospholipid bilayer cell membrane through open, gated, or passive ion channel proteins via diffusion and concentration gradients.",
      objectives: [
        "Compare simple diffusion versus facilitated diffusion through channel proteins.",
        "Observe passive transport moving down concentration gradients (High → Low concentration).",
        "Explore selective permeability of phospholipid bilayers."
      ],
      keyFormulas: ["Fick's Law of Diffusion: J = -D × (dC / dx)"],
      guidedQuestions: [
        "Why can non-polar hydrophobic molecules cross the lipid bilayer without protein channels?",
        "What happens to net particle flux across the membrane when concentrations reach equilibrium?",
        "How do gated channel proteins regulate cellular influx/efflux?"
      ]
    }
  ]
};

export const LAB_SUBJECT_METADATA = {
  physics: {
    title: "Physics Virtual Simulator Lab",
    accentColor: "#10B981",
    gradient: "linear-gradient(135deg, #10B981 0%, #14B8A6 100%)",
    description: "Master classical mechanics, electromagnetism, wave interference, optics, and astrophysics with interactive STEM simulations and 3D WebGL physics engines."
  },
  chemistry: {
    title: "Chemistry Virtual Laboratory",
    accentColor: "#3B82F6",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
    description: "Explore atomic structures, acid-base titrations, gas laws, chemical bonding, and limiting reagents with interactive chemistry labs."
  },
  biology: {
    title: "Biology & Life Sciences Lab",
    accentColor: "#F59E0B",
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    description: "Simulate natural selection, gene expression, action potential neurobiology, membrane transport, and sensory photoreceptors."
  }
};
