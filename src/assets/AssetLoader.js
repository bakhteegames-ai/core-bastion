import * as pc from 'playcanvas';

/**
 * AssetLoader
 * Loads GLTF models and other assets for the game.
 */
export class AssetLoader {
  constructor(app) {
    this.app = app;
    this.assets = {};
    this.loaded = false;
  }

  /**
   * Load all game assets.
   * @returns {Promise<boolean>}
   */
  async loadAll() {
    return new Promise((resolve) => {
      const assetList = [
        { name: 'enemy', url: '/assets/models/enemy.glb', type: 'container' },
        { name: 'turret', url: '/assets/models/turret.glb', type: 'container' },
        { name: 'broken_halo_env', url: '/assets/models/broken_halo_env.glb', type: 'container' },
        { name: 'broken_halo_reactor', url: '/assets/models/broken_halo_reactor.glb', type: 'container' },
        { name: 'broken_halo_pad', url: '/assets/models/broken_halo_pad.glb', type: 'container' },
        { name: 'broken_halo_beacon', url: '/assets/models/broken_halo_beacon.glb', type: 'container' },
        { name: 'broken_halo_portal', url: '/assets/models/broken_halo_portal.glb', type: 'container' }
      ];

      let loadedCount = 0;
      const totalAssets = assetList.length;

      if (totalAssets === 0) {
        this.loaded = true;
        resolve(true);
        return;
      }

      assetList.forEach((assetDef) => {
        const asset = new pc.Asset(assetDef.name, assetDef.type, {
          url: assetDef.url
        });

        asset.on('load', (loadedAsset) => {
          console.log(`[AssetLoader] Loaded: ${assetDef.name}`);
          this.assets[assetDef.name] = loadedAsset;
          loadedCount++;

          if (loadedCount === totalAssets) {
            this.loaded = true;
            console.log('[AssetLoader] All assets loaded');
            resolve(true);
          }
        });

        asset.on('error', (err) => {
          console.warn(`[AssetLoader] Failed to load ${assetDef.name}:`, err);
          loadedCount++;

          if (loadedCount === totalAssets) {
            this.loaded = true;
            resolve(true);
          }
        });

        this.app.assets.add(asset);
        this.app.assets.load(asset);
      });
    });
  }

  /**
   * Get a loaded asset by name.
   * @param {string} name
   * @returns {pc.Asset|null}
   */
  getAsset(name) {
    return this.assets[name] || null;
  }

  /**
   * Create an entity from a loaded GLTF asset.
   * @param {string} name - Asset name
   * @returns {pc.Entity|null}
   */
  createEntityFromModel(name) {
    const asset = this.getAsset(name);
    if (!asset || !asset.resource) {
      console.warn(`[AssetLoader] Asset not loaded: ${name}`);
      return null;
    }

    try {
      // Create entity from container
      const entity = asset.resource.instantiateRenderEntity({
        castShadows: true,
        receiveShadows: true
      });
      return entity;
    } catch (e) {
      console.warn(`[AssetLoader] Failed to create entity from ${name}:`, e);
      return null;
    }
  }

  /**
   * Check if assets are loaded.
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded;
  }
}
