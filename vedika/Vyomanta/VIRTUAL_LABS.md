# Virtual 3D Science Labs Simulator Documentation

This document explains the technical implementation of the 3D Virtual Science Labs built in the Vyomanta LMS frontend. It covers the current architecture, mathematical solvers, rendering patterns, and provides detailed guides for the Physics, Chemistry, and Biology experiments.

---

## 🏗️ 1. Technical Architecture

The Virtual Labs are built on top of a client-side WebGL stack integrated directly into Next.js App Router:
*   **Core Graphics**: Vanilla **Three.js** utilizing rendering loops, perspective cameras, orbital controllers, and material geometries.
*   **Controls**: **OrbitControls** for 3D rotation, panning, and zoom limits.
*   **Layout**: Split-pane responsive CSS layout where the parameters panel is managed by React state, and the WebGL canvas runs inside a React `useEffect` hook.
*   **Performance Optimization (No-SSR)**: Three.js and xterm require client-side globals (`window`, `document`). They are lazily loaded with Next.js dynamic imports (`ssr: false`) to prevent page build crashes.

---

## 🧲 2. Physics Experiments Implementation

### A. Simple Pendulum Lab
*   **Variables**: length $L$, mass $M$, gravity $g$, damping coefficient $c$.
*   **Physics Solver**:
    $$\frac{d^2\theta}{dt^2} + \frac{g}{L}\sin\theta + c\frac{d\theta}{dt} = 0$$
    Implemented using **Euler integration** on every frame:
    ```javascript
    const accel = -(g / L) * Math.sin(angle) - damping * velocity;
    velocity += accel * dt;
    angle += velocity * dt;
    ```
*   **3D Elements**:
    *   Bob: `THREE.SphereGeometry` with standard metallic red material.
    *   String: `THREE.Line` updating points dynamically: $x = L\sin\theta$, $y = y_{\text{pivot}} - L\cos\theta$.
    *   Forces: `THREE.ArrowHelper` indicators showing Velocity Vector (Green) and Acceleration Vector (Red).

### B. Projectile Motion Lab
*   **Variables**: launch speed $v$, launch angle $\theta$, gravity $g$.
*   **Physics Solver**:
    $$x(t) = v \cos\theta \cdot t$$
    $$y(t) = y_{\text{muzzle}} + v \sin\theta \cdot t - \frac{1}{2}g t^2$$
*   **3D Elements**:
    *   Cannon barrel: `THREE.CylinderGeometry` rotated around the Z-axis by $\theta$.
    *   Projectile: `THREE.SphereGeometry` updated over elapsed time $t$.
    *   Trail: `THREE.Line` geometry populated with pre-calculated parabolic points.

### C. Refraction & Reflection (Optics)
*   **Variables**: incident angle $\theta_1$, refractive index 1 $n_1$, refractive index 2 $n_2$.
*   **Physics Solver**:
    *   Reflected beam angle equals incident angle ($\theta_{\text{refl}} = \theta_1$).
    *   Refracted beam angle computed using **Snell's Law**:
        $$\sin\theta_2 = \frac{n_1 \sin\theta_1}{n_2}$$
    *   **Total Internal Reflection (TIR)** occurs if $\sin\theta_2 > 1.0$. The refracted light ray is extinguished, and only the reflected ray is rendered.

### D. Spring-Mass System
*   **Variables**: spring stiffness $k$, mass $M$, damping $c$.
*   **Physics Solver**:
    $$\frac{d^2y}{dt^2} + \frac{c}{M}\frac{dy}{dt} + \frac{k}{M}y = 0$$
*   **3D Elements**:
    *   Spring: Helix curve rendered with `THREE.TubeGeometry` dynamically scaled.
    *   Mass: Heavy metallic box mesh linked to the bottom of the spring.

### E. Ohm's Law Circuit
*   **Variables**: voltage $V$, resistance $R$.
*   **Physics Solver**:
    Current computed via Ohm's Law: $I = \frac{V}{R}$.
*   **3D Elements**:
    *   Circuit board: Battery cylinder, resistor cylinder, and path wires.
    *   Electrons: Glowing yellow spheres translating along wire coordinates at speed proportional to current $I$.

---

## 🧪 3. Chemistry Experiments Implementation

Implemented inside [ChemistryLab.jsx](file:///c:/Users/seshu/vyomanta/frontend/components/labs/ChemistryLab.jsx):

### A. Atomic Structure Bohr Builder
*   **Variables**: Protons ($Z$, charge), Neutrons ($N$, isotope), Electrons.
*   **3D Elements**:
    *   Nucleus: Clusters of red (protons) and blue (neutrons) spheres positioned randomly in a compact cluster.
    *   Orbits: Concentric circles with radius matching Bohr shells.
    *   Electrons: Glowing yellow spheres rotating along circular orbits at speeds inversely proportional to radius.

### B. Gas Laws (PV=nRT)
*   **Variables**: Temperature ($T$), Volume ($V$), Gas Moles ($n$).
*   **Physics Solver**:
    Pressure $P = \frac{nRT}{V}$ computed dynamically.
*   **3D Elements**:
    *   Chamber: Wireframe container box with glass walls.
    *   Piston: Metallic lid block translated vertically depending on Volume ($V$).
    *   Molecules: Bouncing particle spheres moving in random vectors, reflecting off walls and the movable piston lid.

### C. Acid-Base Titration Reactions
*   **Variables**: HCl acid volume/concentration, NaOH base concentration.
*   **Chemistry Solver**:
    $$pH = -\log_{10}[H^+]$$
*   **3D Elements**:
    *   Erlenmeyer flask: Conical model containing base liquid cylinder.
    *   Buret stand: Cylinder buret dripping liquid drops dynamically into the flask.
    *   Neutralization indicator: Liquid cylinder color blends from clear transparent to bright magenta pink when $pH > 8.2$.

### D. Molecular Gas Diffusion
*   **Variables**: Temperature ($T$), Gas Type (Helium vs Neon vs Xenon).
*   **Physics Solver**:
    Root-mean-square speed of diffusion: $v_{\text{rms}} = \sqrt{\frac{3RT}{M_w}}$.
*   **3D Elements**:
    *   Chamber: Dual compartment box separated by a sliding metal partition.
    *   Diffusion: Particle spheres diffuse through the gap at average speed $v_{\text{rms}}$ when the partition is opened.

### E. Periodic Table Trends
*   **Variables**: Selected Element ($Z=1$ to $Z=10$), Property (Atomic Radius vs Electronegativity).
*   **3D Elements**:
    *   Atom sphere: Scales its size proportional to atomic radius (e.g. Lithium is large, Neon is small) or electronegativity.
    *   Color: interpolates from blue to orange/red depending on electronegativity values.

---

## 🧬 4. Biology Experiments Implementation

Implemented inside [BiologyLab.jsx](file:///c:/Users/seshu/vyomanta/frontend/components/labs/BiologyLab.jsx):

### A. 3D Animal Cell Organelles Explorer
*   **Variables**: Selected Organelle (Nucleus, Mitochondria, ER, Golgi, Lysosome).
*   **3D Elements**:
    *   Organelle Meshes: Red central Nucleus, orange curved Mitochondria beans, purple wavy ER folds, green stacked Golgi plates, and blue Lysosomes.
    *   Raycaster selection: Highlights selected organelles with a pulsing scale animation and displays detailed biological function cards on the sidebar.

### B. Ecosystem Food Web
*   **Variables**: Plant, Rabbit, and Fox populations.
*   **Physics Solver**:
    **Lotka-Volterra predator-prey dynamics** differential equation solver:
    $$\frac{dP}{dt} = \alpha P - \beta P R$$
    $$\frac{dR}{dt} = \delta P R - \gamma R - \epsilon R F$$
    $$\frac{dF}{dt} = \eta R F - \theta F$$
*   **3D Elements**:
    *   Landscape: Green plants, hopping white rabbits (hopping on vertical Y-axis), and running orange foxes.
    *   Chart: A live coordinate SVG line graph plotting populations of Plants (Green), Rabbits (White), and Foxes (Gold) in real-time.
