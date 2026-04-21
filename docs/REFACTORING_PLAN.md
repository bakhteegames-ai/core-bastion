# Core Bastion - Refactoring Plan & Architecture

## 1. Directory Structure After Refactoring

```
src/
├── app/
│   ├── GameBootstrap.js      # Orchestrator only (no game logic)
│   ├── GameStateMachine.js   # State management
│   └── constants.js
├── core/
│   ├── EventBus.js           # Decoupled communication
│   └── TimeService.js        # Global time with hit-stop support
├── controllers/
│   ├── InputController.js    # Raycasts, clicks, touch
│   ├── AbilityController.js  # Ability timing (dt-based)
│   └── JuiceController.js    # Screen shake, hit stop, damage numbers
├── gameplay/
│   ├── EnemyAgent.js         # Uses ObjectPool, swap-pop removal
│   ├── EnemyManager.js       # Manages enemy pool
│   ├── ObjectPool.js         # Generic pooling system
│   ├── TowerController.js
│   ├── ProjectileController.js
│   ├── BuildManager.js
│   ├── WaveManager.js
│   └── ...
├── systems/
│   ├── UltimateAbilitySystem.js
│   └── WaveModifierSystem.js
├── platform/
│   └── PlatformBridge.js     # Yandex/VK abstraction
├── ui/
│   └── ...
├── meta/
│   └── ...
└── data/
    └── ...
```

## 2. Key Architectural Changes

### 2.1 EventBus Pattern
All systems communicate through events:
- `enemy:killed` → triggers gold reward, ultimate charge, VFX
- `tower:fired` → triggers audio, projectile spawn
- `juice:screen_shake` → triggers camera shake
- `juice:damage_number` → triggers damage number display

### 2.2 Object Pooling (Zero GC During Gameplay)
```javascript
// Warmup during BUILD_PHASE
this.enemyPool = new EntityPool(
  app,
  () => createEnemyEntity(),
  (e) => resetEnemyEntity(e),
  parent,
  50,  // initial size
  200  // max size
);

// During WAVE_ACTIVE - NO 'new' calls!
const enemy = this.enemyPool.get(initData, spawnPosition);
```

### 2.3 Swap & Pop Enemy Removal
```javascript
// OLD (triggers GC + array re-index):
const index = this.enemies.indexOf(enemy);
this.enemies.splice(index, 1);

// NEW (O(1), no GC):
const index = this.enemies.indexOf(enemy);
if (index !== -1) {
  const last = this.enemies[this.enemies.length - 1];
  this.enemies[index] = last;
  this.enemies.pop();
  // Return enemy to pool instead of destroy
  this.enemyPool.release(enemy);
}
```

### 2.4 Pre-allocated Vectors
```javascript
// In class constructor:
this._tempRayDir = new pc.Vec3();
this._tempRayOrigin = new pc.Vec3();
this._tempPos = new pc.Vec3();

// In update() or event handlers - NO 'new pc.Vec3()':
this._tempRayDir.copy(to).sub(from).normalize();
```

## 3. JuiceController Integration

```javascript
// In GameBootstrap.onUpdate():
const timeMult = this.juiceController.getTimeMultiplier();
const effectiveDt = dt * timeMult;

this.juiceController.update(dt);

// Critical hit example in TowerController:
if (isCrit) {
  EventBus.emit(GameEvents.HIT_STOP, { duration: 0.15, slowFactor: 0.2 });
  EventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: 3 });
  EventBus.emit(GameEvents.DAMAGE_NUMBER, { 
    position: enemy.position, 
    damage: critDamage, 
    isCrit: true 
  });
}
```

## 4. FTUE Tutorial State

Add `TUTORIAL` state to GameStateMachine:
```javascript
GameState = {
  BOOT: 'boot',
  READY: 'ready',
  TUTORIAL: 'tutorial',  // NEW
  BUILD_PHASE: 'build',
  WAVE_ACTIVE: 'wave',
  DEFEAT: 'defeat',
  VICTORY: 'victory'
};
```

Tutorial flow:
1. Block all UI except target tower button
2. Force-purchase first tower (free)
3. Guaranteed win wave 1-3 (no HP loss)
4. Auto-unlock first talent after wave 3

## 5. Performance Checklist

- [ ] All Vec3 allocations moved to constructor
- [ ] Enemy removal uses swap-pop
- [ ] EnemyAgent uses ObjectPool
- [ ] Projectile uses ObjectPool
- [ ] VFX particles use ObjectPool
- [ ] No setTimeout/setInterval in gameplay (use dt accumulators)
- [ ] EventBus emits reuse data objects
- [ ] JuiceController pools damage numbers
