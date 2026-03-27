# ATTRIBUTION

This file lists all third-party assets used in Core Bastion.

## License: CC0 / Public Domain

All audio and visual effects in this game are **code-generated/synthesized** and do not require external asset files.

### Audio (Synthesized via Web Audio API)
- **Source**: Code-generated using Web Audio API oscillators and noise buffers
- **License**: CC0 (public domain)
- **Created by**: Development team
- **Files**: None (generated at runtime)

Audio effects include:
- Tower fire (square wave frequency sweep)
- Enemy hit (filtered noise burst)
- Enemy death (descending sawtooth sweep)
- Enemy leak (two-tone alarm)
- Wave start (ascending major chord)
- Wave complete (C major chord spread)
- Build tower (mechanical thud + click)
- Defeat (descending minor sequence)
- Button click (short sine pulse)

### Visual Effects (Code-driven via PlayCanvas)
- **Source**: Procedurally generated using PlayCanvas primitives
- **License**: CC0 (public domain)
- **Created by**: Development team
- **Files**: None (generated at runtime)

VFX effects include:
- Hit burst (sphere particle burst with physics)
- Death effect (burst + expanding ring)
- Leak effect (flash at base)
- Build effect (burst + ring)

### Fonts
- System fonts (Segoe UI, Tahoma, Geneva, Verdana, sans-serif)
- No custom fonts used

### Third-Party Code
- **PlayCanvas Engine** (MIT License) - https://playcanvas.com/
- **Vite** (MIT License) - https://vitejs.dev/

## No External Assets

This game uses **no external 3D models, textures, or audio files**. All visuals are created using PlayCanvas primitive shapes with procedural materials, and all audio is synthesized at runtime using the Web Audio API.

This approach ensures:
- Zero loading time for assets
- Minimal bundle size
- Full browser compatibility
- No licensing concerns for redistribution
- Consistent visual style

## Attribution Not Required

Since all assets are code-generated and released under CC0, no attribution is required for reuse or redistribution of this game or its code.

---

Last updated: 2024
