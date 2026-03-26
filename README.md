# Core Bastion

A casual tower defense game built with PlayCanvas for Yandex Games platform.

## Overview

Core Bastion is a browser-based tower defense MVP where players defend their base against waves of enemies by strategically placing towers.

## Features

- **Wave-based gameplay** with progressive difficulty scaling
- **Strategic tower placement** on designated build slots
- **Build phase system** - prepare defenses between waves
- **Base defense** - protect your core from enemy invasion
- **Continue system** - watch ads to continue after defeat
- **Local high score** - track your best wave achieved
- **Responsive design** - works on desktop and mobile

## Tech Stack

- **Engine**: PlayCanvas (WebGL)
- **Build**: Vite
- **Language**: JavaScript (ES6+)
- **Platform**: Yandex Games (primary), Web (secondary)

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── app/              # Core game systems
│   ├── GameBootstrap.js    # Main game loop
│   ├── GameStateMachine.js # State management
│   └── constants.js        # Game constants
├── audio/            # Audio system (stubs)
├── gameplay/         # Game mechanics
│   ├── BaseHealth.js       # Base HP system
│   ├── BuildManager.js     # Tower placement
│   ├── EconomyService.js   # Gold management
│   ├── EnemyAgent.js       # Enemy behavior
│   ├── ProjectileController.js
│   ├── TowerController.js  # Tower targeting
│   └── WaveManager.js      # Wave spawning
├── data/             # Configuration
│   ├── balance.js    # Tower/enemy stats
│   ├── level.js      # Level layout
│   └── waves.js      # Wave formulas
├── platform/         # Platform integration
│   ├── YandexBridge.js     # Yandex SDK
│   └── EditorBridge.js     # Editor integration
├── save/             # Save system
├── scene/            # Scene creation
│   └── SceneFactory.js     # Battlefield creation
└── ui/               # User interface
    ├── HudController.js    # HUD management
    └── strings.js    # UI strings
```

## Game Design

### Core Loop

1. **Build Phase** (3 seconds) - Place towers on available slots
2. **Wave Active** - Enemies spawn and follow the path
3. **Towers Attack** - Auto-target and fire at enemies
4. **Wave Complete** - Return to build phase for next wave
5. **Defeat** - Base HP reaches 0

### States

- `BOOT` → `READY` → `BUILD_PHASE` → `WAVE_ACTIVE` → `BUILD_PHASE` (loop)
- `WAVE_ACTIVE` → `DEFEAT` (when base HP = 0)
- `DEFEAT` → `AD_PAUSED` (optional continue)

### Balance

| Element | Value |
|---------|-------|
| Starting Gold | 100 |
| Tower Cost | 100 |
| Tower Range | 5.5 units |
| Tower Damage | 10 |
| Base HP | 10 |
| Enemy HP (Wave 1) | 20 |
| Enemy Speed | 2.0 units/sec |
| Build Phase | 3.0 seconds |

## Deployment

### Yandex Games

1. Build the project: `npm run build`
2. Zip the `dist/` folder contents
3. Upload to Yandex Games developer console
4. Configure `game.yml` settings

### Standalone Web

1. Build the project: `npm run build`
2. Deploy `dist/` folder to any static hosting

## License

MIT

## Credits

Built with PlayCanvas Engine
