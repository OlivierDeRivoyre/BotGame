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
const shikashiTileSet = loadImg("Shikashi");
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
    paintScale(x, y, width, heigth) {
        ctx.drawImage(this.tile,
            this.tx, this.ty,
            this.tWidth, this.tHeight,
            x, y,
            width, heigth
        )
    }
}
const healerSprite = new Sprite(dungeonTileSet, 256, 340, 32, 48);

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
        this.bag = [];
        this.bagSize = 2;
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
        if (this.cartoonBubble) {
            this.cartoonBubble.duration--;
            if (this.cartoonBubble.duration <= 0) {
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
        if (this.currentAction && this.currentAction.paint) {
            this.currentAction.paint();
        }
        for(let i = 0; i < this.bag.length; i++){
            this.bag[i].paintSmallWithCount(this.x + 16 * i, this.y + 20, 1);
        }
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
                    self.sayAndWait(msg, 'black', duration);
                }));
            interpreter.setProperty(globalObject, 'craft', interpreter.createNativeFunction(
                function craft() {
                    self.craft();
                }));
            interpreter.setProperty(globalObject, 'take', interpreter.createNativeFunction(
                function take() {
                    self.take();
                }));

        }
        myBot.interpreter = new Interpreter(code, initInterpreter);
    }
    sayAndWait(msg, color, duration) {
        this.currentAction = new WaitAnim(duration);
        this.say(msg, color, duration);
    }
    say(msg, color, duration) {
        this.cartoonBubble = { msg, color, duration: duration * 30 };
    }
    paintCartoonBubble() {
        if (!this.cartoonBubble) {
            return;
        }
        ctx.fillStyle = this.cartoonBubble.color;
        ctx.font = "12px Verdana";
        ctx.fillText(this.cartoonBubble.msg, this.x, this.y - 10);
    }
    getCell() {
        return { i: Math.floor(this.x / 48), j: Math.floor(this.y / 48) };
    }
    craft() {
        const cell = this.getCell();
        const building = map.getBuilding(cell);
        if (building == null) {
            this.sayAndWait("No craft building here", "red", 5);
            return;
        }
        if (!building.recipe.hasItems(this)) {
            this.sayAndWait("Missing ingredients to craft", "red", 5);
            return;
        }
        building.recipe.consumeIngredients(this);
        this.currentAction = new CraftAnim(this, building.recipe);

    }
    countItems(item) {
        return this.bag.filter(b => item.name === item.name).length;
    }
    removeItems(item, count) {
        let removed = 0;
        for (let i = this.bag.length - 1; i >= 0; i--) {
            if (this.bag[i].name == item.name && removed < count) {
                removed++;
                this.bag.splice(i, 1);
            }
        }
        return removed;
    }
    take() {
        const item = map.takeItem(this.getCell());
        if (item == null) {
            this.sayAndWait("No item to take", "red", 5);
            return;
        }
        this.bag.push(item);
        while (this.bag.length > this.bagSize) {
            map.addItemOnGround(this.getCell(), this.bag[0]);
            this.bag.slice(0, 1);
        }
        this.currentAction = new WaitAnim(0.1);
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
class CraftAnim {
    constructor(bot, recipe) {
        this.bot = bot;
        this.recipe = recipe;
        this.tick = 0;
        this.maxTick = recipe.durationSec * 30;

    }
    update() {
        this.tick++;
        if (this.tick == this.maxTick) {
            this.recipe.produceOutput(this.bot);
            return true;
        }
        return false;
    }
    paint() {
        if (this.tick < this.maxTick) {
            const left = this.bot.x;
            const top = this.bot.y + 32;
            ctx.beginPath();
            ctx.lineWidth = "1";
            ctx.fillStyle = "cyan";
            ctx.rect(left, top, 32 * this.tick / this.maxTick, 6);
            ctx.fill();

            ctx.beginPath();
            ctx.lineWidth = "1";
            ctx.strokeStyle = "green";
            ctx.rect(left, top, 32, 6);
            ctx.stroke();
        }
    }
}

let myBot = new Bot(300, 300);


class Item {
    constructor(name, sprite) {
        this.name = name;
        this.sprite = sprite;
    }
    paintSmallWithCount(x, y, count) {
        const size = 16;
        ctx.fillStyle = "#0004";
        ctx.fillRect(x, y, size, size);
        this.sprite.paintScale(x, y, size, size);
        if (count > 1) {
            ctx.font = "11px Georgia";
            // ctx.fillStyle = "yellow";
            // ctx.fillText(bucket.count, x+7, y+15);
            ctx.fillStyle = "white";
            ctx.fillText(count, x + 8, y + 14);
        }
    }
}
class Items {
    constructor() {
        function getShikashiTile(i, j) {
            return new Sprite(shikashiTileSet, i * 32, j * 32, 32, 32);
        }
        this.water = new Item("Water", getShikashiTile(10, 0));
        this.apple = new Item("Apple", getShikashiTile(0, 14));
    }
}
const items = new Items();
class ItemStackTile {
    constructor(cell) {
        this.cell = cell;
        this.buckets = [];
    }
    add(item) {
        for (let b of this.buckets) {
            if (b.item.name === item.name) {
                b.count++;
                return;
            }
        }
        this.buckets.push({ item, count: 1 });
    }
    countItems(item) {
        for (let b of this.buckets) {
            if (b.item.name === item.name) {
                return b.count;
            }
        }
        return 0;
    }
    removeItems(item, count) {
        for (let i = 0; i < this.buckets.length; i++) {
            if (this.buckets[i].item.name == item.name) {
                this.buckets[i].count -= count;
                if (this.buckets[i].count <= 0) {
                    this.buckets.splice(i, 1);
                }
            }
        }
    }
    takeItem() {
        if (this.buckets.length == 0) {
            return null;
        }
        const item = this.buckets[0].item;
        this.buckets[0].count--;
        if (this.buckets[0].count <= 0) {
            this.buckets.splice(0, 1);
        }
        return item;
    }
    paint() {
        for (let i = 0; i < this.buckets.length; i++) {
            const bucket = this.buckets[i];
            const x = Map.BorderX + this.cell.i * 48 + i * 17;
            const y = Map.BorderY + this.cell.j * 48 + 40;
            bucket.item.paintSmallWithCount(x, y, bucket.count);         
        }
    }
}

function getPipoTile(i, j) {
    return new Sprite(pipoBuildingTileSet, i * 48, j * 48);
}
const greenGroundSprite = getPipoTile(0, 0);

const mineSprite = getPipoTile(7, 3);
const smallHouseSprite = getPipoTile(0, 6);
const farmSprite = getPipoTile(0, 7);

class Recipe {
    constructor(output, durationSec, inputs) {
        this.output = output
        this.durationSec = durationSec;
        this.inputs = inputs;
    }
    countItems(item, bot) {
        const onBot = bot.countItems(item);
        const onMap = map.countItems(bot.getCell(), item);
        return onBot + onMap;
    }
    hasItems(bot) {
        for (let ingredient of this.inputs) {
            if (this.countItems(ingredient.item, bot) < ingredient.count) {
                return false;
            }
        }
        return true;
    }
    consumeIngredients(bot) {
        for (let ingredient of this.inputs) {
            const removed = bot.removeItems(ingredient.item, ingredient.count);
            const remaining = ingredient.count - removed;
            if (remaining > 0) {
                map.removeItems(bot.getCell(), ingredient.item, remaining);
            }
        }
    }
    produceOutput(bot) {
        map.addItemOnGround(bot.getCell(), this.output);
    }
}
class BuildingTile {
    constructor(i, j, sprite, recipe) {
        this.cell = { i, j };
        this.sprite = sprite;
        this.recipe = recipe;
    }
    paint() {
        this.sprite.paintNoScale(Map.BorderX + this.cell.i * 48, Map.BorderY + this.cell.j * 48);
    }
}

class TileFactory {
    createBuildingTiles() {
        return [
            new BuildingTile(1, 4, smallHouseSprite),
            new BuildingTile(0, 0, mineSprite),
            this.createAppleTree(),
            new BuildingTile(1, 8, farmSprite),
            this.createWaterWell(),
        ];
    }
    createWaterWell() {
        const sprite = getPipoTile(6, 1);
        const recipe = new Recipe(items.water, 1.5, []);
        const tile = new BuildingTile(0, 3, sprite, recipe);
        return tile;
    }
    createAppleTree() {
        const sprite = getPipoTile(2, 1);
        const recipe = new Recipe(items.apple, 1.5, [{ item: items.water, count: 1 }]);
        const tile = new BuildingTile(2, 0, sprite, recipe);
        return tile;
    }
}

class Map {
    static BorderX = 16;
    static BorderY = 10;
    static MaxX = 16;
    static MaxY = 9;
    constructor() {
        this.buildingTiles = new TileFactory().createBuildingTiles();
        this.itemStacks = [];
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
        for (let tile of this.buildingTiles) {
            tile.paint();
        }
        for (let tile of this.itemStacks) {
            tile.paint();
        }
    }
    getItemStackAt(cell) {
        for (let itemStack of this.itemStacks) {
            if (itemStack.cell.i === cell.i && itemStack.cell.j === cell.j) {
                return itemStack;
            }
        }
        return null;
    }
    addItemOnGround(cell, item) {
        let itemStack = this.getItemStackAt(cell);
        if (itemStack == null) {
            itemStack = new ItemStackTile(cell);
            this.itemStacks.push(itemStack);
        }
        itemStack.add(item);
    }
    countItems(cell, item) {
        let itemStack = this.getItemStackAt(cell);
        if (itemStack == null) {
            return 0;
        }
        return itemStack.countItems(item);
    }
    removeItems(cell, item, count) {
        let itemStack = this.getItemStackAt(cell);
        itemStack.removeItems(item, count);
    }
    takeItem(cell) {
        let itemStack = this.getItemStackAt(cell);
        if (itemStack == null) {
            return null;
        }
        return itemStack.takeItem();
    }
    getBuilding(cell) {
        for (let building of this.buildingTiles) {
            if (building.cell.i === cell.i && building.cell.j === cell.j) {
                return building;
            }
        }
        return null;
    }
}
let map = new Map();

map.addItemOnGround({ i: 0, j: 3 }, items.water);
map.addItemOnGround({ i: 0, j: 3 }, items.apple);
map.addItemOnGround({ i: 0, j: 3 }, items.water);
map.addItemOnGround({ i: 2, j: 0 }, items.water);
map.addItemOnGround({ i: 6, j: 6 }, items.water);

function runCode() {
    const code = document.getElementById('code').value;
    myBot.setCode(code);
}
tick();