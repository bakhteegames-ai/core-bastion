/**
 * SpatialGrid
 * Оптимизированная пространственная сетка для быстрого поиска ближайших врагов.
 * Разбивает игровое поле на ячейки, позволяя искать врагов только в соседних ячейках.
 * 
 * Performance: O(1) поиск вместо O(n)
 */
export class SpatialGrid {
  constructor(width, depth, cellSize = 4) {
    this.width = width;
    this.depth = depth;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(depth / cellSize);
    this.grid = new Map(); // Map<"col,row", Set<EnemyAgent>>
  }

  /**
   * Получить ключ ячейки по координатам
   */
  _getCellKey(x, z) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(z / this.cellSize);
    return `${col},${row}`;
  }

  /**
   * Добавить врага в сетку
   */
  add(enemy) {
    const pos = enemy.position;
    if (!pos) return;
    
    const key = this._getCellKey(pos.x, pos.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key).add(enemy);
    enemy._spatialGridKey = key; // Кэшируем ключ для быстрого удаления
  }

  /**
   * Удалить врага из сетки
   */
  remove(enemy) {
    if (!enemy._spatialGridKey) return;
    
    const key = enemy._spatialGridKey;
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(enemy);
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }
    enemy._spatialGridKey = null;
  }

  /**
   * Обновить позицию врага в сетке
   */
  update(enemy) {
    const pos = enemy.position;
    if (!pos) return;
    
    const newKey = this._getCellKey(pos.x, pos.z);
    const oldKey = enemy._spatialGridKey;
    
    // Если враг перешёл в другую ячейку
    if (newKey !== oldKey) {
      this.remove(enemy);
      this.add(enemy);
    }
  }

  /**
   * Получить всех врагов в радиусе от точки
   * @param {number} x - X координата центра
   * @param {number} z - Z координата центра
   * @param {number} radius - Радиус поиска
   * @returns {EnemyAgent[]} - Массив врагов в радиусе
   */
  queryRadius(x, z, radius) {
    const result = [];
    const seen = new Set(); // Избегаем дубликатов
    
    // Вычисляем диапазон ячеек для проверки
    const minCol = Math.floor((x - radius) / this.cellSize);
    const maxCol = Math.floor((x + radius) / this.cellSize);
    const minRow = Math.floor((z - radius) / this.cellSize);
    const maxRow = Math.floor((z + radius) / this.cellSize);
    
    // Проверяем все ячейки в диапазоне
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col},${row}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (const enemy of cell) {
            if (seen.has(enemy)) continue;
            
            // Точная проверка расстояния
            const dx = enemy.position.x - x;
            const dz = enemy.position.z - z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance <= radius) {
              result.push(enemy);
              seen.add(enemy);
            }
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Получить ближайшего врага в радиусе
   * @param {number} x - X координата центра
   * @param {number} z - Z координата центра
   * @param {number} radius - Радиус поиска
   * @returns {EnemyAgent|null} - Ближайший враг или null
   */
  findNearest(x, z, radius) {
    let nearest = null;
    let nearestDistance = Infinity;
    
    const enemies = this.queryRadius(x, z, radius);
    for (const enemy of enemies) {
      if (!enemy.isActive || enemy.isDead()) continue;
      
      const dx = enemy.position.x - x;
      const dz = enemy.position.z - z;
      const distance = dx * dx + dz * dz; // Используем квадрат расстояния для скорости
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = enemy;
      }
    }
    
    return nearest;
  }

  /**
   * Очистить сетку
   */
  clear() {
    this.grid.clear();
  }

  /**
   * Получить количество врагов в сетке
   */
  getCount() {
    let count = 0;
    for (const cell of this.grid.values()) {
      count += cell.size;
    }
    return count;
  }

  /**
   * Отладка: получить статистику сетки
   */
  getStats() {
    const cellSizes = Array.from(this.grid.values()).map(c => c.size);
    return {
      totalEnemies: this.getCount(),
      occupiedCells: this.grid.size,
      avgEnemiesPerCell: cellSizes.length > 0 
        ? (cellSizes.reduce((a, b) => a + b, 0) / cellSizes.length).toFixed(2)
        : 0,
      maxInCell: Math.max(0, ...cellSizes)
    };
  }
}
