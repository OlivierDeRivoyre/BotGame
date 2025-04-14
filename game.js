const gameDuration = 30.0;
const CanvasWidth = 800;
const CanvasHeight = 450;
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

function square(x) {
    return x * x;
}
function loadImg(name) {
    const img = new Image();
    img.src = "img/" + name + ".png";
    return img;
}
const dungeonTileSet = loadImg("0x72_DungeonTilesetII_v1.7x2");
const itemsTileSet = loadImg("Shikashi");
const pipoBuildingTileSet = loadImg("pipo-map001");
const pipoGroundTileSet = loadImg("pipo-map001_at");

class Sprite {
    constructor(tile, tx, ty, tWidth, tHeight) {
        this.tile = tile;
        this.tx = tx;
        this.ty = ty;
        this.tWidth = tWidth || 48;
        this.tHeight = tHeight || 48;
    }
    paint32(x, y) {
        ctx.drawImage(this.tile,
            this.tx, this.ty,
            this.tWidth, this.tHeight,
            x, y,
            32, 32
        )
    }
    paintNoScale(x, y) {
        ctx.drawImage(this.tile,
            this.tx, this.ty,
            this.tWidth, this.tHeight,
            x, y,
            this.tWidth, this.tHeight
        )
    }
}
const healerSprite = new Sprite(dungeonTileSet, 256, 340, 32, 48);
const greenGroundSprite = new Sprite(pipoBuildingTileSet, 0, 0);
const bigTreeSprite = new Sprite(pipoBuildingTileSet, 2 * 48, 48);
const mineSprite = new Sprite(pipoBuildingTileSet, 7 * 48, 3 * 48);
const smallHouseSprite = new Sprite(pipoBuildingTileSet, 0, 6 * 48);
const farmSprite = new Sprite(pipoBuildingTileSet, 0, 7 * 48);
class PipoGoundTiles {
    constructor(index, name) {
        this.index = index;
        this.name = name;
        this.tile = pipoGroundTileSet;
        this.map_i = index % 2;
        this.map_j = Math.floor(index / 2);
        this.topX = this.map_i * 48 * 8;
        this.topY = this.map_j * 48 * 6;
        this.relative = [
            [{ i: 4, j: 3 }, { i: 6, j: 2 }, { i: 5, j: 3 }],
            [{ i: 7, j: 1 }, { i: 6, j: 1 }, { i: 5, j: 1 }],
            [{ i: 4, j: 4 }, { i: 6, j: 0 }, { i: 5, j: 4 }],
        ]
    }
    paint(i, j, x, y) {
        const subCell = this.relative[j][i];
        const sourceX = this.topX + subCell.i * 48;
        const sourceY = this.topY + subCell.j * 48;
        ctx.drawImage(this.tile,
            sourceX, sourceY, 48, 48,
            x, y, 48, 48
        )
    }
}
const waterTiles = new PipoGoundTiles(5, "water");

const tickDuration = 1000.0 / 30;
function tick() {
    myBot.update();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    map.paint();
    myBot.paint();
    setTimeout(tick, tickDuration);
}


class Bot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.currentAction = null;
        this.interpreter = null;
        this.cartoonBubble = null;
    }
    update() {
        if (this.currentAction != null) {
            const ended = this.currentAction.update(this);
            if (ended) {
                this.currentAction = null;
            }
        } else if (this.interpreter != null) {
            this.runCode();
        }
        if(this.cartoonBubble){
            this.cartoonBubble.duration--;
            if(this.cartoonBubble.duration <=0)
            {
                this.cartoonBubble = null;
            }
        }
    }
    runCode() {
        for (let i = 0; i < 200; i++) {
            if (this.interpreter == null || myBot.currentAction != null) {
                return;
            }
            if (!this.interpreter.step()) {
                this.interpreter = null;
                console.log("done");
                return;
            }
        }
        console.log("timeout");
    }
    paint() {
        healerSprite.paint32(this.x, this.y);
        this.paintCartoonBubble();
    }
    setCode(code) {
        const self = this;
        function initInterpreter(interpreter, globalObject) {            
            interpreter.setProperty(globalObject, 'moveTo', interpreter.createNativeFunction(
                function moveTo(cell_i, cell_j) {
                    self.currentAction = new MoveToAnim(self, cell_i, cell_j);
                    self.say(`Going to (${cell_i}, ${cell_j})`, 'yellow', 1)
            }));
            interpreter.setProperty(globalObject, 'say', interpreter.createNativeFunction(
                function say(msg) {
                    const duration = 1.5;
                    self.currentAction = new WaitAnim(duration)
                    self.say(msg, 'black', duration);
            }));
        }
        myBot.interpreter = new Interpreter(code, initInterpreter);
    }
    say(msg, color, duration){
        this.cartoonBubble = {msg, color, duration: duration * 30};
    }
    paintCartoonBubble()    {
        if(!this.cartoonBubble){
            return;
        }
        ctx.fillStyle = this.cartoonBubble.color;
        ctx.font = "12px Verdana";
        ctx.fillText(this.cartoonBubble.msg, this.x, this.y - 10);
    }
}
class MoveToAnim {
    constructor(item, cell_i, cell_j) {
        this.item = item;
        cell_i = Math.max(0, Math.min(Math.floor(cell_i), Map.MaxX - 1));
        cell_j = Math.max(0, Math.min(Math.floor(cell_j), Map.MaxY - 1));      
        this.destX = Map.BorderX + cell_i * 48 + 8;
        this.destY = Map.BorderY + cell_j * 48 + 10;
        this.speed = 3;
    }
    update() {
        const d = Math.sqrt(square(this.destX - this.item.x) + square(this.destY - this.item.y));
        if (d < this.speed) {
            this.item.x = this.destX;
            this.item.y = this.destY;
            return true;
        }
        this.item.x += (this.destX - this.item.x) * this.speed / d;
        this.item.y += (this.destY - this.item.y) * this.speed / d;
        return false;
    }
}
class WaitAnim {
    constructor(duration) {
        this.duration = duration * 30;
    }
    update() {
        this.duration--;
        return this.duration <= 0;
    }
}

let myBot = new Bot(300, 300);


class Map {
    static BorderX = 16;
    static BorderY = 10;
    static MaxX = 16;
    static MaxY = 9;
    constructor() {
        this.house = { i: 1, j: 4 };
        this.mine = { i: 0, j: 0 };
        this.wood = { i: 2, j: 0 };
        this.farmSprite = { i: 1, j: 8};
    }
    paint() {
        waterTiles.paint(0, 0, Map.BorderX - 48, Map.BorderY - 48);
        waterTiles.paint(2, 0, Map.BorderX + 48 * Map.MaxX, Map.BorderY - 48);
        waterTiles.paint(0, 2, Map.BorderX - 48, Map.BorderY + Map.MaxY * 48);
        waterTiles.paint(2, 2, Map.BorderX + 48 * Map.MaxX, Map.BorderY + Map.MaxY * 48);
        for (let j = 0; j < Map.MaxY; j++) {
            waterTiles.paint(0, 1, Map.BorderX - 48, Map.BorderY + j * 48)
            waterTiles.paint(2, 1, Map.BorderX + 48 * Map.MaxX, Map.BorderY + j * 48)
        }
        for (let i = 0; i < Map.MaxX; i++) {
            waterTiles.paint(1, 0, Map.BorderX + i * 48, Map.BorderY - 48);
            for (let j = 0; j < Map.MaxY; j++) {
                greenGroundSprite.paintNoScale(Map.BorderX + i * 48, Map.BorderY + j * 48)
            }
            waterTiles.paint(1, 2, Map.BorderX + i * 48, Map.BorderY + Map.MaxY * 48)
        }
        this.paintAt(this.wood, bigTreeSprite);
        this.paintAt(this.house, smallHouseSprite);
        this.paintAt(this.mine, mineSprite);
        this.paintAt(this.farmSprite, farmSprite);
    }
    paintAt(cell, sprite) {
        sprite.paintNoScale(Map.BorderX + cell.i * 48, Map.BorderY + cell.j * 48)
    }
}
let map = new Map();

function runCode() {
    const code = document.getElementById('code').value;
    myBot.setCode(code);
}
tick();