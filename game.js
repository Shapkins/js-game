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
  constructor( pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector (0, 0) ) {
    if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
      throw new Error ('Место, размер или скорость движущегося объекта должны быть типа Vector');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  get type() {
		return 'actor';
	}
	get left() {
		return this.pos.x;
	}
	get right() {
		return this.left + this.size.x;
	}
	get top() {
		return this.pos.y;
	}
	get bottom() {
		return this.top + this.size.y;
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
    return ((this.left < movingActor.right) && (this.right > movingActor.left) && (this.top < movingActor.bottom) && (this.bottom > movingActor.top));
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
      this.width = Math.max(...grid.map(function(element) {
        return element.length;
      }));
    }
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    return ((this.status !== null) && (this.finishDelay < 0));
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

  obstacleAt(pos = {}, size = {}) {
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error ('Неверно задана позиция перемещения');
    }
    let obstacle = new Actor(pos, size);;
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
    return (!(this.actors.some(currentActor => currentActor.type === actorType)));
  }

  playerTouched(obstacleType = '', movingActor) {
    if (this.status === null) {
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
}


class LevelParser {
  constructor(map = {}) {
    this.map = map;
  }

  actorFromSymbol(symbol = '') {
    return this.map[symbol];
  }

  obstacleFromSymbol(symbol = '') {
    if (symbol === 'x') {
      return 'wall';
    }
    if (symbol === '!') {
      return 'lava';
    }
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
    for(let i = 0; i < lines.length; i++) {
      for (let j = 0; j < lines[i].length; j++) {
        let actorConstructor = this.actorFromSymbol(lines[i][j]);
        if (typeof actorConstructor === 'function') {
          let createdActor = new actorConstructor(new Vector(j, i));
          if (createdActor instanceof Actor) {
            newLines.push(createdActor);
          }
        }
      }  
    }
    return newLines;
  }

  parse(lines = []) {
    return new Level (this.createGrid(lines), this.createActors(lines));
  }
}

class Fireball extends Actor {
  constructor(pos, speed) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time = 1, level = {}) {
    if (level.obstacleAt(this.getNextPosition(time), this.size)) {
      this.handleObstacle();
    } else {
      this.pos = this.getNextPosition(time);
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 3));
    this.startPos = pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
    this.startingPos = pos.plus(new Vector(0.2, 0.1));
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.startingPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }

}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }

  get type() {
    return 'player';
  }

}

const schemas = [
  [
    ' v                ',
    '                  ',
    '                  ',
    '            v     ',
    '    v             ',
    ' o                ',
    ' x          o     ',
    ' x         xxxxx  ',
    ' x@               ',
    ' xxxxx            ',
    '     x!!!!!!!!!!!!',
    '     xxxxxxxxxxxxx',
    '                  ',
  ],
];
const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin
}
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => alert("Вы выиграли приз!"));