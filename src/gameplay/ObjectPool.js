/**
 * ObjectPool
 * Универсальный пул объектов для повторного использования сущностей.
 * Уменьшает нагрузку на GC и улучшает производительность.
 * 
 * Performance: Избегает создания/уничтожения объектов во время игры
 */
export class ObjectPool {
  /**
   * @param {Function} createFn - Функция создания нового объекта
   * @param {Function} resetFn - Функция сброса объекта (опционально)
   * @param {number} initialSize - Начальный размер пула
   * @param {number} maxSize - Максимальный размер пула (0 = безлимита)
   */
  constructor(createFn, resetFn = null, initialSize = 20, maxSize = 0) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    this.available = [];
    this.active = new Set();
    
    // Предварительно создаём объекты
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
    
    console.log(`[ObjectPool] Created with initial size: ${initialSize}, max: ${maxSize || '∞'}`);
  }

  /**
   * Получить объект из пула
   * @param {*} initData - Данные для инициализации объекта
   * @returns {*} - Активный объект
   */
  get(initData = null) {
    let obj;
    
    if (this.available.length > 0) {
      obj = this.available.pop();
    } else {
      // Создаём новый, если есть место или нет лимита
      if (this.maxSize === 0 || this.active.size < this.maxSize) {
        obj = this.createFn();
        console.log(`[ObjectPool] Expanded pool, active: ${this.active.size + 1}`);
      } else {
        console.warn('[ObjectPool] Pool exhausted and at max capacity!');
        return null;
      }
    }
    
    if (obj) {
      this.active.add(obj);
      
      // Инициализируем объект
      if (initData && obj.init) {
        obj.init(initData);
      }
    }
    
    return obj;
  }

  /**
   * Вернуть объект в пул
   * @param {*} obj - Объект для возврата
   */
  release(obj) {
    if (!obj || !this.active.has(obj)) {
      return;
    }
    
    this.active.delete(obj);
    
    // Сбрасываем объект
    if (this.resetFn) {
      this.resetFn(obj);
    } else if (obj.reset) {
      obj.reset();
    }
    
    // Возвращаем в пул, если не достигнут лимит
    if (this.maxSize === 0 || this.available.length < this.maxSize) {
      this.available.push(obj);
    }
  }

  /**
   * Вернуть все активные объекты в пул
   */
  releaseAll() {
    for (const obj of this.active) {
      if (this.resetFn) {
        this.resetFn(obj);
      } else if (obj.reset) {
        obj.reset();
      }
      this.available.push(obj);
    }
    this.active.clear();
  }

  /**
   * Очистить пул полностью
   */
  clear() {
    this.releaseAll();
    this.available = [];
  }

  /**
   * Получить статистику пула
   */
  getStats() {
    return {
      available: this.available.length,
      active: this.active.size,
      total: this.available.length + this.active.size,
      utilization: this.active.size / (this.available.length + this.active.size) || 0
    };
  }

  /**
   * Предварительно заполнить пул (warmup)
   * @param {number} count - Количество объектов для создания
   */
  warmup(count) {
    const currentTotal = this.available.length + this.active.size;
    if (this.maxSize > 0 && currentTotal >= this.maxSize) {
      return;
    }
    
    const toCreate = Math.min(
      count,
      this.maxSize > 0 ? this.maxSize - currentTotal : count
    );
    
    for (let i = 0; i < toCreate; i++) {
      this.available.push(this.createFn());
    }
    
    console.log(`[ObjectPool] Warmed up ${toCreate} objects`);
  }
}

/**
 * EntityPool
 * Специализированный пул для PlayCanvas сущностей.
 * Автоматически управляет добавлением/удалением из сцены.
 */
export class EntityPool extends ObjectPool {
  /**
   * @param {pc.Application} app - PlayCanvas приложение
   * @param {Function} createEntityFn - Функция создания сущности
   * @param {Function} resetEntityFn - Функция сброса сущности
   * @param {pc.Entity} parent - Родительская сущность (опционально)
   * @param {number} initialSize - Начальный размер пула
   * @param {number} maxSize - Максимальный размер пула
   */
  constructor(app, createEntityFn, resetEntityFn = null, parent = null, initialSize = 20, maxSize = 100) {
    super(
      () => {
        const entity = createEntityFn();
        if (entity && parent) {
          parent.addChild(entity);
          entity.enabled = false; // Скрываем по умолчанию
        }
        return entity;
      },
      (entity) => {
        if (resetEntityFn) {
          resetEntityFn(entity);
        }
        if (entity) {
          entity.enabled = false; // Скрываем при возврате
        }
      },
      initialSize,
      maxSize
    );
    
    this.app = app;
    this.parent = parent;
  }

  /**
   * Получить и активировать сущность
   * @param {object} initData - Данные инициализации
   * @param {pc.Vec3} position - Позиция для сущности
   * @returns {pc.Entity}
   */
  get(initData = null, position = null) {
    const entity = super.get(initData);
    
    if (entity && position) {
      entity.setLocalPosition(position.x, position.y, position.z);
      entity.enabled = true;
    }
    
    return entity;
  }

  /**
   * Вернуть сущность в пул
   * @param {pc.Entity} entity
   */
  release(entity) {
    if (entity) {
      entity.enabled = false;
      super.release(entity);
    }
  }
}
