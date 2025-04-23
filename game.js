const gameDuration = 30.0;
const CanvasWidth = 800;
const CanvasHeight = 450;
const canvas = document.getElementById("myCanvas");
canvas.onmousedown = onmousedown;
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

function getShikashiTile(i, j) {
    return new Sprite(shikashiTileSet, i * 32, j * 32, 32, 32);
}
function getPipoTile(i, j) {
    return new Sprite(pipoBuildingTileSet, i * 48, j * 48);
}
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
    paintScale(x, y, width, height) {
        ctx.drawImage(this.tile,
            this.tx, this.ty,
            this.tWidth, this.tHeight,
            x, y,
            width, height
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
    for (let bot of bots) {
        bot.update();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    map.paint();
    for (let bot of bots) {
        bot.paint();
    }
    tooltip.paint();
    setTimeout(tick, tickDuration);
}

class Bot {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.name = "Bot " + id;
        this.currentAction = null;
        this.interpreter = null;
        this.cartoonBubble = null;
        this.bag = [];
        this.bagSize = 2;
        this.code = null;
        this.sprite = healerSprite;
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
            if (this.interpreter == null || this.currentAction != null) {
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
        this.sprite.paint32(this.x, this.y);
        this.paintCartoonBubble();
        if (this.currentAction && this.currentAction.paint) {
            this.currentAction.paint();
        }
        for (let i = 0; i < this.bag.length; i++) {
            this.bag[i].paintSmallWithCount(this.x + 16 * i, this.y + 20, 1);
        }
        ctx.font = "10px Georgia";
        ctx.fillStyle = "#eee";
        ctx.fillText(this.name, this.x + 8, this.y + this.sprite.tHeight - 8);
    }
    setCode(code) {
        const self = this;
        this.code = code;
        function initInterpreter(interpreter, globalObject) {
            interpreter.setProperty(globalObject, 'moveTo', interpreter.createNativeFunction(
                function moveTo(cell_i, cell_j) {
                    self.moveTo(cell_i, cell_j);
                }));
            interpreter.setProperty(globalObject, 'say', interpreter.createNativeFunction(
                function say(msg) {
                    const duration = 1.5;
                    self.sayAndWait(msg, 'black', duration);
                }));
            interpreter.setProperty(globalObject, 'wait', interpreter.createNativeFunction(
                function wait(duration) {
                    self.sayAndWait(`waiting ${duration} sec`, 'black', duration);
                }));
            interpreter.setProperty(globalObject, 'craft', interpreter.createNativeFunction(
                function craft() {
                    self.craft();
                }));
            interpreter.setProperty(globalObject, 'take', interpreter.createNativeFunction(
                function take() {
                    self.take();
                }));
            interpreter.setProperty(globalObject, 'drop', interpreter.createNativeFunction(
                function drop() {
                    self.drop();
                }));
            interpreter.setProperty(globalObject, 'getId', interpreter.createNativeFunction(
                function getId() {
                    return self.id;
                }));
            interpreter.setProperty(globalObject, 'getName', interpreter.createNativeFunction(
                function getName() {
                    return self.name;
                }));
            interpreter.setProperty(globalObject, 'setName', interpreter.createNativeFunction(
                function setName(name) {
                    if (name) {
                        self.name = name;
                    }
                }));
        }
        self.interpreter = new Interpreter(code, initInterpreter);
    }
    moveTo(cell_i, cell_j) {
        const target = map.getTarget(cell_i, cell_j);
        if (target == null) {
            this.sayAndWait(`Target not found: ${cell_i} ${cell_j}`, "red", 5);
            return;
        }
        this.currentAction = new MoveToAnim(this, target.cell.i, target.cell.j);
        const targetName = target.building != null ? target.building.name : `(${cell_i}, ${cell_j})`;
        this.say(`Going to ${targetName}`, 'yellow', 1)
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
        if (building == null || building.recipe == null) {
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
        return this.bag.filter(b => b.name === item.name).length;
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
            this.bag.splice(0, 1);
        }
        this.currentAction = new WaitAnim(0.1);
    }
    drop() {
        if (this.bag.length == 0) {
            this.sayAndWait("No item in bag to drop", "red", 5);
            return;
        }
        map.addItemOnGround(this.getCell(), this.bag[0]);
        this.bag.splice(0, 1);
        this.currentAction = new WaitAnim(0.1);
        headquarters.update();
    }
    isInside(event) {
        return event.offsetX >= this.x && event.offsetX < this.x + this.sprite.tWidth
            && event.offsetY >= this.y && event.offsetY < this.y + this.sprite.tHeight
    }
}
const bots = [new Bot(1, 300, 300)];

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
    paintForTooltip(x, y, count) {
        const size = 32;
        ctx.fillStyle = "#fff4";
        ctx.fillRect(x, y, size, size);
        this.sprite.paintScale(x, y, size, size);
        if (count > 1) {
            ctx.font = "20px Georgia";
            // ctx.fillStyle = "yellow";
            // ctx.fillText(bucket.count, x+7, y+15);
            ctx.fillStyle = "yellow";
            ctx.fillText(count, x + 14, y + 28);
        }
    }
}
class Items {
    constructor() {
        this.water = new Item("Water", getShikashiTile(10, 0));
        this.apple = new Item("Apple", getShikashiTile(0, 14));
        this.sand = new Item("Sand", getShikashiTile(11, 20));
        this.flask = new Item("Flask", getShikashiTile(3, 19));
        this.ironOre = new Item("IronOre", getShikashiTile(2, 17));
        this.powder = new Item("Powder", getShikashiTile(2, 20));
        this.ink = new Item("Ink", getShikashiTile(5, 19));
        this.coton = new Item("Coton", getShikashiTile(5, 17));
        this.spool = new Item("Spool", getShikashiTile(1, 22));
        this.blueSpool = new Item("BlueSpool", getShikashiTile(2, 22));
        this.cloth = new Item("Cloth", getShikashiTile(8, 7));
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


const greenGroundSprite = getPipoTile(0, 0);

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
    constructor(name, cell, sprite, recipe) {
        this.name = name;
        this.cell = cell;
        this.sprite = sprite;
        this.recipe = recipe;
    }
    paint() {
        this.sprite.paintNoScale(Map.BorderX + this.cell.i * 48, Map.BorderY + this.cell.j * 48);
    }
    paintTooltip(tooltip) {
        let cursorY = tooltip.y + 22;
        let cursorX = tooltip.x + 8;

        ctx.fillStyle = "orange";
        ctx.font = "bold 18px Verdana";
        ctx.fillText(this.name, cursorX, cursorY);
        cursorY += 18;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        const moveTxt = `moveTo(${this.cell.i}, ${this.cell.i})`;
        ctx.fillText(moveTxt, cursorX, cursorY);
        cursorY += 16;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        const craftTxt = `craft() ${this.recipe.output.name}  in ${this.recipe.durationSec} sec`;
        ctx.fillText(craftTxt, cursorX, cursorY);
        cursorY += 16;

        let x = cursorX;
        for (let i = 0; i < this.recipe.inputs.length; i++) {
            x = cursorX + i * 33;
            this.recipe.inputs[i].item.paintForTooltip(x, cursorY, this.recipe.inputs[i].count);
            x += 40
        }
        ctx.fillStyle = "white";
        ctx.font = "20px consolas";
        ctx.fillText("=>", x, cursorY + 22);
        this.recipe.output.paintForTooltip(x + 30, cursorY);
    }
}

class TileFactory {
    createBuildingTiles() {
        return [
            this.createAppleTree(),
            this.createWaterWell(),
            this.createDune(),
            this.createCotonField(),
            this.createClothFactory(),
            this.createFire(),
            this.createMine(),
            this.createAnvil(),
            this.createLoom(),
            this.createMortar(),
            this.createCauldron(),
        ];
    }
    createWaterWell() {
        const sprite = getPipoTile(6, 1);
        const recipe = new Recipe(items.water, 1.5, []);
        const tile = new BuildingTile("well", { i: 0, j: 3 }, sprite, recipe);
        return tile;
    }
    createAppleTree() {
        const sprite = getPipoTile(2, 1);
        const recipe = new Recipe(items.apple, 1.5, [{ item: items.water, count: 1 }]);
        const tile = new BuildingTile("tree", { i: 2, j: 0 }, sprite, recipe);
        return tile;
    }
    createDune() {
        const sprite = getPipoTile(2, 0);
        const recipe = new Recipe(items.sand, 0.3, []);
        const tile = new BuildingTile("dune", { i: 15, j: 0 }, sprite, recipe);
        return tile;
    }
    createCotonField() {
        const sprite = getPipoTile(1, 0);
        const recipe = new Recipe(items.coton, 1.5, [{ item: items.water, count: 1 }]);
        const tile = new BuildingTile("cotonField", { i: 0, j: 8 }, sprite, recipe);
        return tile;
    }
    createClothFactory() {
        const sprite = getPipoTile(0, 6);
        const recipe = new Recipe(items.cloth, 3, [
            { item: items.blueSpool, count: 4 },
            { item: items.spool, count: 1 }]);
        const tile = new BuildingTile("clothFactory", { i: 9, j: 5 }, sprite, recipe);
        return tile;
    }
    createFire() {
        const sprite = getShikashiTile(2, 4);
        const recipe = new Recipe(items.flask, 2, [{ item: items.sand, count: 1 }]);
        const tile = new BuildingTile("fire", { i: 14, j: 4 }, sprite, recipe);
        return tile;
    }
    createMine() {
        const sprite = getPipoTile(7, 3);
        const recipe = new Recipe(items.ironOre, 1.7, []);
        const tile = new BuildingTile("mine", { i: 8, j: 0 }, sprite, recipe);
        return tile;
    }
    createAnvil() {
        const sprite = getShikashiTile(4, 4);
        const recipe = new Recipe(items.powder, 1, [{ item: items.ironOre, count: 1 }]);
        const tile = new BuildingTile("anvil", { i: 9, j: 2 }, sprite, recipe);
        return tile;
    }
    createLoom() {
        const sprite = getShikashiTile(11, 16);
        const recipe = new Recipe(items.spool, 1, [{ item: items.coton, count: 2 }]);
        const tile = new BuildingTile("loom", { i: 3, j: 7 }, sprite, recipe);
        return tile;
    }
    createMortar() {
        const sprite = getShikashiTile(12, 11);
        const recipe = new Recipe(items.ink, 1, [
            { item: items.powder, count: 1 },
            { item: items.water, count: 1 },
            { item: items.flask, count: 1 }]);
        const tile = new BuildingTile("mortar", { i: 11, j: 3 }, sprite, recipe);
        return tile;
    }
    createCauldron() {
        const sprite = getShikashiTile(9, 19);
        const recipe = new Recipe(items.blueSpool, 1, [
            { item: items.spool, count: 1 },
            { item: items.ink, count: 1 }]);
        const tile = new BuildingTile("cauldron", { i: 6, j: 8 }, sprite, recipe);
        return tile;
    }
}
class Mission {
    constructor(id, ingredients, onSuccessFunc) {
        this.id = id;
        this.ingredients = ingredients;
        this.onSuccessFunc = onSuccessFunc;
        this.progress = ingredients.map(function (ing) {
            return { item: ing.item, count: 0, max: ing.count };
        });
        this.progressPercent = 0;
    }
    addProgress(item) {

        const p = this.progress.find(pr => pr.item.name == item.name);
        if (!p || p.count >= p.max) {
            return;
        }
        p.count++;
        this.refreshProgress();
    }
    refreshProgress() {
        let finished = true;
        let items = 0;
        let total = 0;
        for (let p of this.progress) {
            if (p.count < p.max) {
                finished = false;
            }
            items += p.count;
            total += p.max;
        }
        this.progressPercent = items * 100 / total;
        if (finished) {
            this.progressPercent = 0;
            for (let p of this.progress) {
                p.count = 0;
            }
            this.onSuccessFunc();
        }
    }
}
class Headquarters {
    constructor() {
        this.name = "Headquarters";
        this.cell = { i: 7, j: 4 }
        this.sprite = getPipoTile(1, 10);
        this.mission = new Mission(1, [{ item: items.apple, count: 2 }], () => this.missionEnded());
        this.code = "";
    }
    paint() {
        const topX = Map.BorderX + this.cell.i * 48;
        const topY = Map.BorderY + this.cell.j * 48;
        this.sprite.paintNoScale(topX, topY);
        if (this.mission.progressPercent != 0) {
            const left = topX;
            const top = topY + 48;
            ctx.beginPath();
            ctx.lineWidth = "1";
            ctx.fillStyle = "cyan";
            ctx.rect(left, top, 48 * this.mission.progressPercent / 100, 6);
            ctx.fill();

            ctx.beginPath();
            ctx.lineWidth = "1";
            ctx.strokeStyle = "green";
            ctx.rect(left, top, 48, 6);
            ctx.stroke();
        }
    }
    paintTooltip(tooltip) {
        let cursorY = tooltip.y + 22;
        let cursorX = tooltip.x + 8;

        ctx.fillStyle = "green";
        ctx.font = "bold 18px Verdana";
        ctx.fillText(this.name, cursorX, cursorY);
        cursorY += 18;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        const moveTxt = `Level ${this.mission.id} ${this.mission.progressPercent}% - moveTo(${this.cell.i}, ${this.cell.i}); drop();`;
        ctx.fillText(moveTxt, cursorX, cursorY);
        cursorY += 16;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        const craftTxt = `Objective:`;
        ctx.fillText(craftTxt, cursorX, cursorY);
        cursorY += 16;

        for (let i = 0; i < this.mission.progress.length; i++) {
            const p = this.mission.progress[i];
            p.item.paintForTooltip(cursorX, cursorY, 1);
            ctx.fillStyle = "white";
            ctx.font = "12px Verdana";
            const pTxt = `${p.count} / ${p.max}`;
            ctx.fillText(pTxt, cursorX + 36, cursorY + 20);
            cursorY += 32;
        }
    }
    update() {
        let item;
        while ((item = map.takeItem(this.cell)) != null) {
            this.mission.addProgress(item);
        }
    }
    missionEnded() {
        this.addNewBot();
        this.mission = new Mission(
            this.mission.id + 1,
            this.createMissionIngredients(this.mission.id + 1),
            () => this.missionEnded());
    }
    createMissionIngredients(lvl) {
        const appleRequired = 2 * lvl * lvl;
        const clothLevel = lvl - 3;
        if (clothLevel <= 0) {
            return [{ item: items.apple, count: appleRequired }];
        }

        let clothRequired = clothLevel * clothLevel;
        return [
            { item: items.apple, count: appleRequired },
            { item: items.cloth, count: clothRequired }];
    }
    addNewBot() {
        const coord = map.getCoord(this.cell);
        const bot = new Bot(bots.length + 1,
            coord.x + Math.floor(Math.random() * 48),
            coord.y + Math.floor(Math.random() * 48));
        bot.setCode(this.code);
        bots.push(bot);
    }
    setCode(code) {
        this.code = code;
    }
}
const headquarters = new Headquarters();

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
        headquarters.paint();
    }
    getCoord(cell) {
        const x = Map.BorderX + cell.i * 48;
        const y = Map.BorderY + cell.j * 48;
        return { x, y, width: 48, height: 48 };
    }
    isInside(event, cell) {
        const coord = this.getCoord(cell);
        return event.offsetX >= coord.x && event.offsetX < coord.x + coord.width
            && event.offsetY >= coord.y && event.offsetY < coord.y + coord.height
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
        if(itemStack == null){
            return;
        }
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
    getTarget(a, b) {
        if (b === undefined && a.toLowerCase) {
            for (let building of this.buildingTiles) {
                if (building.name.toLowerCase() == a.toLowerCase()) {
                    return { building, cell: building.cell };
                }
            }
            if (headquarters.name.toLowerCase() == a.toLowerCase()) {
                return { building: headquarters, cell: headquarters.cell };
            }
            return null;
        } else {
            const cell_i = Math.max(0, Math.min(Math.floor(a), Map.MaxX - 1));
            const cell_j = Math.max(0, Math.min(Math.floor(b), Map.MaxY - 1));
            for (let building of this.buildingTiles) {
                if (building.cell.i == cell_i && building.cell.j == cell_j) {
                    return { building, cell: building.cell };
                }
            }
            return { building: null, cell: { i: cell_i, j: cell_j } };
        }
    }
    click(event) {
        for (let building of this.buildingTiles) {
            if (this.isInside(event, building.cell)) {
                tooltip.selection = building;
                return;
            }
        }
        tooltip.selection = null;
    }
}
let map = new Map();
//map.addItemOnGround({ i: 0, j: 5 }, items.water);

class Tooltip {
    constructor() {
        this.selection = null;
        this.x = CanvasWidth - 250;
        this.y = CanvasHeight - 150;
        this.width = 250;
        this.height = 150;
    }
    paint() {
        if (!this.selection) {
            return;
        }
        ctx.beginPath();
        ctx.lineWidth = "1";
        ctx.fillStyle = "#303030";
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fill();
        this.selection.paintTooltip(this);
    }
}
const tooltip = new Tooltip();

let selectedBot = bots[0];
function runCode(applyAll) {
    const code = document.getElementById('code').value;
    if (applyAll) {
        for (let bot of bots) {
            bot.setCode(code);
        }
        headquarters.setCode(code);
    } else {
        selectedBot.setCode(code);
    }
}
tick();
function onmousedown(event) {
    for (let bot of bots) {
        if (bot.isInside(event)) {
            if (selectedBot != bot) {
                selectedBot.code = document.getElementById('code').value;
                selectedBot = bot;
                document.getElementById('code').value = bot.code;
                document.getElementById('applyOnlyTo').innerText = `Only on ${bot.id} - ${bot.name}`;
                return;
            }
        }
    }
    if (map.isInside(event, headquarters.cell)) {
        tooltip.selection = headquarters;
        if (selectedBot != headquarters) {
            selectedBot.code = document.getElementById('code').value;
            selectedBot = headquarters;            
            document.getElementById('code').value = selectedBot.code;
            document.getElementById('applyOnlyTo').innerText = `For Headquarters, aka new bots`;
            return;
        }
    }
    map.click(event);
}