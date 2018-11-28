'use strict';

class Vector {
  constructor ( x = 0, y = 0 ) {
    this.x = x; 
    this.y = y;
  }

  plus( additionalVector = {} ) {
    if (!(additionalVector instanceof Vector)) {
      throw new Error ('Можно прибавлять к вектору только вектор типа Vector');
    } 
    return new Vector(this.x + additionalVector.x, this.y + additionalVector.y);
  }

  times( factor = 0) {
    return new Vector( factor * this.x, factor * this.y);
  }
}

class Actor {
  constructor( location = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector (0, 0) ) {
    if (!(location instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
      throw new Error ('Место, размер или скорость движущегося объекта должны быть типа Vector');
    }
    this.pos = location;
    this.size = size;
    this.speed = speed;
    Object.defineProperty(this, 'left', {
      value: this.pos.x,
      writable: false,
      configurable: true
    });
    Object.defineProperty(this, 'top', {
      value: this.pos.y,
      writable: false,
      configurable: true
    });
    Object.defineProperty(this, 'bottom', {
      value: this.pos.y + this.size.y,
      writable: false,
      configurable: true
    });
    Object.defineProperty(this, 'right', {
      value: this.pos.x + this.size.x,
      writable: false,
      configurable: true
    });
    Object.defineProperty(this, 'type', {
      value: 'actor',
      writable: false,
      configurable: true
    });
  }

  act() {

  }

  isIntersect( movingActor = {}) {
    if (!(movingActor instanceof Actor) || movingActor === {} ) {
      throw new Error ('Движущийся объект должен быть типа Actor');
    }
    if (movingActor === this) {
      return false;
    }
    if (((this.left > movingActor.left) && (this.left < movingActor.right)) || ((this.right < movingActor.right) && (this.right > movingActor.left)) || ((this.top > movingActor.top) && (this.top < movingActor.bottom)) || ((this.bottom < movingActor.bottom) && (this.bottom > movingActor.top))) {
      return true;
    }
    if ((this.right === movingActor.right) && (this.left === movingActor.left) && (this.top === movingActor.top) && (this.bottom === movingActor.bottom)) {
      return true;
    }
    if ((this.right > movingActor.right) && (this.left < movingActor.left) && (this.top < movingActor.top) && (this.bottom > movingActor.bottom)) {
      return true;
    }
    return false;
  }
}

class Level {
  constructor( grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.player = this.actors[0];
    this.height = this.grid.length;
    if (grid.length === 0) {
      this.width = 0;
    } else {
      this.width = Math.max.apply(0, grid.map(function(element) {
        return element.length;
      }));
    }
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    if ((this.status !== null) && (this.finishDelay < 0)) {
      return true;
    }
    return false;
  }

  actorAt(movingActor = {}) {
    if (!(movingActor instanceof Actor) || movingActor === {} ) {
      throw new Error ('Не найден движущийся объект');
    }
    for(let currentActor of this.actors) {
      if (currentActor.isIntersect(movingActor)) {
        return currentActor;
      }
    }
  }

  obstacleAt(location = {}, size = {}) {
    if (!(location instanceof Vector) || !(size instanceof Vector)) {
      throw new Error ('Неверно задана позиция перемещения');
    }
    let obstacle = new Actor(location, size);;
    if (obstacle.bottom >= this.height) {
      return 'lava';
    }
    if ((obstacle.top < 0) || (obstacle.left < 0) || (obstacle.right >= this.width)) {
      return 'wall';
    }
    for(let i = Math.floor(obstacle.top); i < Math.ceil(obstacle.bottom); i++) {
      for(let j = Math.floor(obstacle.left); j < Math.ceil(obstacle.right); j++) {
        if (this.grid[i][j] === 'lava') {
          return 'lava';
        }
        if (this.grid[i][j] === 'wall') {
          return 'wall';
        }
      }
    }
  }

  removeActor(wasteActor = {}) {
    this.actors.splice(this.actors.findIndex(function(element) {
      if (element === wasteActor) {
        return element;
      }
    }), 1);
  }

  noMoreActors(actorType = '') {
    if (this.actors.length === 0) {
      return true;
    }
    for(let currentActor of this.actors) {
      if (currentActor.type === actorType) {
        return true;
      }
    }
    return false;
  }

  playerTouched(obstacleType = '', movingActor) {
    if ((obstacleType === 'lava') || (obstacleType === 'fireball')) {
      this.status = 'lost';
    }
    if (obstacleType === 'coin') {
      this.removeActor(movingActor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}


class LevelParser {
  constructor(map = {}) {
    this.map = map;
  }

  actorFromSymbol(symbol = '') {
    if (symbol === '@') {
      return new Player();
    }
    if (symbol === 'o') {
      return new Coin();
    }
    if (symbol === 'v') {
      return new FireRain();
    }
    if (symbol === '|') {
      return new VerticalFireball();
    }
    if (symbol === '=') {
      return new HorizontalFireball();
    } 
    return undefined;
  }

  obstacleFromSymbol(symbol = '') {
    if (symbol === 'x') {
      return 'wall';
    }
    if (symbol === '!') {
      return 'lava';
    }
    return undefined;
  }

  createGrid(lines = []) {
    let newLines = [];
    for(let line of lines) {
      if (line === []) {
        newLines.push(undefined);
      } else {
        let newLine = [];
        for (let i = 0; i < line.length; i++) {
          newLine[i] = this.obstacleFromSymbol(line[i]);
        }
        newLines.push(newLine);
      }
    }
    return newLines;
  }

  createActors(lines = []) {
    let newLines = [];
    for(let line of lines) {
      if (line === []) {
        newLines.push(undefined);
      } else {
        let newLine = [];
        for (let i = 0; i < line.length; i++) {
          newLine[i] = this.actorFromSymbol(line[i]);
        }
        newLines.push(newLine);
      }
    }
    return newLines;
  }

  parse(lines = []) {
    return new Level (this.createGrid(lines), this.createActors(lines));
  }
}

class Fireball extends Actor {
  constructor(location = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(location);
    this.speed = speed;
    Object.defineProperty(this, 'type', {
      value: 'fireball',
      writable: true
    });
    this.size = new Vector(1, 1);
  }

  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time = 1, level = {}) {
    if (level.obstacleAt(this.getNextPosition(time))) {
      this.handleObstacle();
    } else {
      this.pos = this.getNextPosition(time);
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(location) {
    super(location);
    this.size = new Vector(1, 1);
    this.speed = new Vector(2, 0);
  }
}

class VerticalFireball extends Fireball {
  constructor(location) {
    super(location);
    this.size = new Vector(1, 1);
    this.speed = new Vector(0, 2);
  }
}

class FireRain extends Fireball {
  constructor(location) {
    super(location);
    this.startPos = location;
    this.size = new Vector(1, 1);
    this.speed = new Vector(0, 3);
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

class Coin extends Actor {
  constructor(location) {
    super(location);
    Object.defineProperty(this, 'pos', {
      get: function() {
        return new Vector(location.x + 0.2, location.y + 0.1);
      }
    });
    this.size = new Vector(0.6, 0.6);
    Object.defineProperty(this, 'type', {
      value: 'coin'
    });
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return new Vector(this.pos.plus(this.getSpringVector()));
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }

}

class Player extends Actor {
  constructor(location) {
    super(location);
    Object.defineProperty(this, 'pos', {
      get: function() {
        return new Vector(location.x, location.y - 0.5);
      }
    });
    this.size = new Vector(0.8, 1.5);
    Object.defineProperty(this, 'type', {
      value: 'player'
    });
  }
}