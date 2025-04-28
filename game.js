const gameDuration = 30.0;
const CanvasWidth = 800;
const CanvasHeight = 450;
const canvas = document.getElementById("myCanvas");
canvas.onmousedown = onmousedown;
const ctx = canvas.getContext("2d");
console.clear();

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
function isInsideCoord(event, coord) {
    return event.offsetX >= coord.x && event.offsetX < coord.x + coord.width
        && event.offsetY >= coord.y && event.offsetY < coord.y + coord.height;
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
class DoubleSprite {
    constructor(tile, tx, ty, tWidth, tHeight) {
        this.tile = tile;
        this.tx = tx;
        this.ty = ty;
        this.tWidth = tWidth || 48;
        this.tHeight = tHeight || 48;
    }
    paint32(x, y, index, reverse) {
        index |= 0;
        if (reverse) {
            this.paint32Reverse(x, y, index);
            return;
        }
        ctx.drawImage(this.tile,
            this.tx + index * this.tWidth, this.ty,
            this.tWidth, this.tHeight,
            x, y,
            32, 32
        );
    }
    paint32Reverse(x, y, index) {
        ctx.save();
        ctx.translate(x + this.tWidth, y);
        ctx.scale(-1, 1);
        ctx.drawImage(this.tile,
            this.tx + index * this.tWidth, this.ty,
            this.tWidth, this.tHeight,
            0, 0, 32, 32
        );
        ctx.restore();
    }
}

class PipoGoundTiles {
    constructor(index, name) {
        this.index = index;
        this.name = name;
        this.tile = pipoGroundTileSet;
        this.map_i = index % 2;
        this.map_j = Math.floor(index / 2);
        this.topX = this.map_i * 48 * 8;
        this.topY = this.map_j * 48 * 6;
        this.outsideRelative = [
            [{ i: 4, j: 3 }, { i: 6, j: 2 }, { i: 5, j: 3 }],
            [{ i: 7, j: 1 }, { i: 6, j: 1 }, { i: 5, j: 1 }],
            [{ i: 4, j: 4 }, { i: 6, j: 0 }, { i: 5, j: 4 }],
        ];

    }
    paint(i, j, x, y) {
        const subCell = this.outsideRelative[j][i];
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
let tickNumber = 0;
function tick() {
    if (dialog == null) {
        tickNumber++;
        for (let bot of bots) {
            bot.update();
        }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    map.paint();
    for (let bot of bots) {
        bot.paint();
    }
    tooltip.paint();
    if (dialog != null) {
        dialog.paint();
    }
    setTimeout(tick, tickDuration);
}

function getDungeonTileSetHeroSprite(i, j) {
    const x = 256 + i * 64;
    const y = j * 64;
    const topMargin = 16;
    return new DoubleSprite(dungeonTileSet, x, y + topMargin, 32, 64 - topMargin);
}
function getDungeonTileSetVilainSprite(i) {
    const x = 736;
    const y = 18 + i * 48;
    return new DoubleSprite(dungeonTileSet, x, y, 32, 48);
}
function getDungeonTileSetSprite(index) {
    const i = index % (20 + 16)
    if (i < 10) {
        return getDungeonTileSetHeroSprite(0, i);
    }
    if (i < 20) {
        return getDungeonTileSetHeroSprite(1, i - 10);
    }
    return getDungeonTileSetVilainSprite(i - 20);
}

const botSprites = [...Array(36).keys()].map(i => getDungeonTileSetSprite(i));
let globalBotValues = [];
let globalQueues = [];
class Bot {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.name = "Bot " + id;
        this.currentAction = new WaitAnim(2);
        this.tick = 0;
        this.lookLeft = false;
        this.interpreter = null;
        this.cartoonBubble = null;
        this.bag = [];
        this.code = null;
        this.error = null;
        this.sprite = botSprites[this.id % botSprites.length];
        this.bagSize = 2;
        this.craftLevel = 0;
        this.walkLevel = 0;
        this.craftXp = 0;
        this.walkXp = 0;
        this.nextCraftLevelXp = 100;
        this.nextWalkLevelXp = 100;
        this.workInSilence = false;
        this.setNextLevelXp();
    }
    update() {
        this.tick++;
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
        try {
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
            console.log("RunCode() out of time");
        } catch (e) {
            console.error(e);
            this.say("error", "red", 10);
            this.error = e;
            this.interpreter = null;
            displayError(this);
        }
    }
    paint() {
        this.sprite.paint32(this.x, this.y, Math.floor(this.tick / 5) % 2, this.lookLeft);
        this.paintCartoonBubble();
        if (this.currentAction && this.currentAction.paint) {
            this.currentAction.paint();
        }
        for (let i = 0; i < this.bag.length; i++) {
            this.bag[i].paintSmallWithCount(this.x + 16 * i, this.y + 20, 1);
        }
        ctx.font = "11px Georgia";
        ctx.fillStyle = (this === tooltip.selection) ? "yellow" : "#eee";
        ctx.fillText(this.name, this.x + 8, this.y + this.sprite.tHeight - 8);
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
        const moveTxt = `id: ${this.id}`;
        ctx.fillText(moveTxt, cursorX, cursorY);
        cursorY += 18;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        ctx.fillText(`Bag size: ${this.bagSize}`, cursorX, cursorY);
        cursorY += 18;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        const craftProgress = this.craftLevel >= 10 ? ' (max lvl)' : `, xp: ${this.craftXp} / ${this.nextCraftLevelXp}`
        ctx.fillText(`Craft lvl: ${this.craftLevel} / 10${craftProgress}`, cursorX, cursorY);
        cursorY += 18;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        const walkProgress = this.walkLevel >= 10 ? ' (max lvl)' : `, xp: ${this.walkXp} / ${this.nextWalkLevelXp}`
        ctx.fillText(`Walk lvl: ${this.walkLevel} / 10${walkProgress}`, cursorX, cursorY);
        cursorY += 18;
    }
    setCode(code) {
        const self = this;
        this.code = code;
        this.error = null;
        function initInterpreter(interpreter, globalObject) {
            interpreter.setProperty(globalObject, 'moveTo', interpreter.createNativeFunction(
                function moveTo(cell_i, cell_j) {
                    self.moveTo(cell_i, cell_j);
                }));
            interpreter.setProperty(globalObject, 'say', interpreter.createNativeFunction(
                function say(msg) {
                    const duration = 1.5;
                    self.sayAndWait(msg, 'yellow', duration);
                }));
            interpreter.setProperty(globalObject, 'wait', interpreter.createNativeFunction(
                function wait(duration) {
                    if(self.workInSilence){
                        self.currentAction = new WaitAnim(duration || 0.01);
                    } else {
                        self.sayAndWait(`waiting ${duration} sec`, 'gray', duration || 0.01);
                    }
                }));
            interpreter.setProperty(globalObject, 'craft', interpreter.createNativeFunction(
                function craft() {
                    self.craft();
                }));
            interpreter.setProperty(globalObject, 'tryCraft', interpreter.createNativeFunction(
                function tryCraft() {
                    self.tryCraft();
                }));
            interpreter.setProperty(globalObject, 'craftOrGetAMissingIngredient', interpreter.createNativeFunction(
                function craftOrGetAMissingIngredient() {
                    return self.craftOrGetAMissingIngredient();
                }));
            interpreter.setProperty(globalObject, 'take', interpreter.createNativeFunction(
                function take(itemName) {
                    self.take(itemName);
                }));
            interpreter.setProperty(globalObject, 'tryTake', interpreter.createNativeFunction(
                function tryTake(itemName) {
                    return self.tryTake(itemName);
                }));
            interpreter.setProperty(globalObject, 'drop', interpreter.createNativeFunction(
                function drop(itemName) {
                    self.drop(itemName);
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
                        self.currentAction = new WaitAnim(0.1);
                        self.name = name;
                    }
                }));
            interpreter.setProperty(globalObject, 'setSkin', interpreter.createNativeFunction(
                function setSkin(skinIndex) {
                    self.setSkin(skinIndex);
                    self.currentAction = new WaitAnim(0.3);
                }));
            interpreter.setProperty(globalObject, 'setWorkInSilence', interpreter.createNativeFunction(
                function setWorkInSilence(silence) {
                    self.workInSilence = !!silence;
                    self.currentAction = new WaitAnim(0.3);
                }));
            interpreter.setProperty(globalObject, 'getBotsCount', interpreter.createNativeFunction(
                function getBotsCount() {
                    return bots.length;
                }));
            interpreter.setProperty(globalObject, 'getBagSize', interpreter.createNativeFunction(
                function getBagSize() {
                    return self.bagSize;
                }));
            interpreter.setProperty(globalObject, 'getCraftLevel', interpreter.createNativeFunction(
                function getCraftLevel() {
                    return self.craftLevel;
                }));
            interpreter.setProperty(globalObject, 'getWalkLevel', interpreter.createNativeFunction(
                function getWalkLevel() {
                    return self.walkLevel;
                }));
            interpreter.setProperty(globalObject, 'bagHasSpace', interpreter.createNativeFunction(
                function bagHasSpace() {
                    return self.bagSize - self.bag.length > 0;
                }));
            interpreter.setProperty(globalObject, 'getBagItemsCount', interpreter.createNativeFunction(
                function getBagItemsCount(itemName) {
                    return self.bagItemsCount(itemName);
                }));
            interpreter.setProperty(globalObject, 'bagHasItem', interpreter.createNativeFunction(
                function bagHasItem(itemName) {
                    return self.bagItemsCount(itemName) > 0;
                }));
            interpreter.setProperty(globalObject, 'bagIsEmpty', interpreter.createNativeFunction(
                function bagIsEmpty() {
                    return self.bag.length == 0;
                }));
            interpreter.setProperty(globalObject, 'bagHasItems', interpreter.createNativeFunction(
                function bagHasItems(itemName) {
                    return self.bagItemsCount(itemName) > 0;
                }));
            interpreter.setProperty(globalObject, 'getPlaceItemsCount', interpreter.createNativeFunction(
                function getPlaceItemsCount(arg1, arg2, arg3) {
                    return self.placeItemsCount(arg1, arg2, arg3);
                }));
            interpreter.setProperty(globalObject, 'placeHasItem', interpreter.createNativeFunction(
                function placeHasItem(arg1, arg2, arg3) {
                    return self.placeItemsCount(arg1, arg2, arg3) > 0;
                }));
            interpreter.setProperty(globalObject, 'getAMissingIngredient', interpreter.createNativeFunction(
                function getAMissingIngredient(cell_i, cell_j) {
                    self.currentAction = new WaitAnim(0.25);
                    return map.getAMissingIngredient(self, cell_i, cell_j);
                }));
            interpreter.setProperty(globalObject, 'createStoreroom', interpreter.createNativeFunction(
                function createStoreroom(name, i, j, spriteIndex) {
                    map.createStoreroom(name, i, j, spriteIndex);
                    self.currentAction = new WaitAnim(0.1);
                }));
            interpreter.setProperty(globalObject, 'clearAllStorerooms', interpreter.createNativeFunction(
                function clearAllStorerooms() {
                    map.clearAllStorerooms();
                    self.currentAction = new WaitAnim(0.1);
                }));
            interpreter.setProperty(globalObject, 'getTickCount', interpreter.createNativeFunction(
                function getTickCount() {
                    return tickNumber;
                }));
            interpreter.setProperty(globalObject, 'setGlobalValue', interpreter.createNativeFunction(
                function setGlobalValue(key, value) {
                    if (key == null || !key.toLowerCase) {
                        throw new Error('Missing argument on setGlobalValue()')
                    }
                    globalBotValues[key] = value;
                    self.currentAction = new WaitAnim(0.1);
                }));
            interpreter.setProperty(globalObject, 'getGlobalValue', interpreter.createNativeFunction(
                function getGlobalValue(key) {
                    if (key == null || !key.toLowerCase) {
                        throw new Error('Missing argument on getGlobalValue()')
                    }
                    self.currentAction = new WaitAnim(0.1);
                    return globalBotValues[key];
                }));
            interpreter.setProperty(globalObject, 'globalQueuePush', interpreter.createNativeFunction(
                function globalQueuePush(topic, value) {
                    if (topic == null || !topic.toLowerCase) {
                        throw new Error('Missing argument on globalQueuePush()')
                    }
                    if (!globalQueues[topic]) {
                        globalQueues[topic] = [value];
                    } else {
                        globalQueues[topic].push(value);
                    }
                    const duration = globalQueues[topic].length < 100
                        && Object.keys(globalQueues).length < 100
                        ? 0.2 : 3;
                    self.currentAction = new WaitAnim(duration);
                    if (globalQueues[topic].length > 200) {
                        globalQueues[topic].splice(0, 50);
                    }
                }));
            interpreter.setProperty(globalObject, 'globalQueueTryPop', interpreter.createNativeFunction(
                function globalQueueTryPop(topic) {
                    if (topic == null || !topic.toLowerCase) {
                        throw new Error('Missing argument on globalQueueTryPop()')
                    }
                    self.currentAction = new WaitAnim(0.1);
                    if (!globalQueues[topic] || globalQueues[topic].length == 0) {
                        return null;
                    } else {
                        const value = globalQueues[topic][0];
                        globalQueues[topic].splice(0, 1);

                        return value;
                    }
                }));
            interpreter.setProperty(globalObject, 'clearAllGlobalValues', interpreter.createNativeFunction(
                function clearAllGlobalValues() {
                    globalBotValues = [];
                    globalQueues = [];
                    self.currentAction = new WaitAnim(0.1);
                }));
        }
        try {
            self.interpreter = new Interpreter(code, initInterpreter);
        } catch (e) {
            self.error = e;
        }
    }
    moveTo(cell_i, cell_j) {
        if (cell_i === undefined) {
            throw new Error('Missing argument on moveTo()')
        }
        const target = map.getTarget(cell_i, cell_j);
        if (target == null) {
            this.sayAndWait(`Target not found: ${cell_i} ${cell_j}`, "red", 5);
            return;
        }
        const speed = 3 * this.getWalkSpeedBonus();
        this.currentAction = new MoveToAnim(this, target.cell.i, target.cell.j, speed);
        const targetName = target.building != null ? target.building.name : `(${cell_i}, ${cell_j})`;
        if(!this.workInSilence){
            this.say(`Going to ${targetName}`, 'gray', 1);
        }
        const current = this.getCell();
        this.lookLeft = current.i > target.cell.i;
        this.walkXp += Math.max(Math.abs(target.cell.i - current.i), Math.abs(target.cell.j - current.j));
        this.onXpGained();
    }    
    sayAndWait(msg, color, duration) {
        if (msg === undefined) {
            throw new Error('Missing argument on say()')
        }
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
    internalCraftOrGetAMissingIngredient() {
        const cell = this.getCell();
        const building = map.getBuilding(cell);
        if (building == null || building.recipe == null) {
            this.sayAndWait("No craft building here", "red", 5);
            return;
        }
        const missingIngredient = building.recipe.getAMissingIngredient(this, cell)
        if (missingIngredient != null) {
            return missingIngredient;
        }
        building.recipe.consumeIngredients(this);
        this.currentAction = new CraftAnim(this, building.recipe);
        this.craftXp++;
        this.onXpGained();
    }
    craft() {
        const missing = this.internalCraftOrGetAMissingIngredient()
        if (missing != null) {
            this.sayAndWait("Missing ingredients to craft", "red", 5);
        }
    }
    tryCraft() {
        const missing = this.internalCraftOrGetAMissingIngredient();
        if (missing != null) {
            this.currentAction = new WaitAnim(0.1);
        }
    }
    craftOrGetAMissingIngredient() {
        const missing = this.internalCraftOrGetAMissingIngredient();
        if (missing != null) {
            this.currentAction = new WaitAnim(0.1);
        }
        return missing;
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
    take(itemName) {
        const item = map.takeItem(this.getCell(), itemName);
        if (item == null) {
            this.sayAndWait(`No item ${itemName || ''} to take`, "red", 5);
            return;
        }
        this.bag.push(item);
        while (this.bag.length > this.bagSize) {
            map.addItemOnGround(this.getCell(), this.bag[0]);
            this.bag.splice(0, 1);
        }
        this.currentAction = new WaitAnim(0.1);
    }
    tryTake(itemName) {
        const item = map.takeItem(this.getCell(), itemName);
        if (item == null) {
            this.currentAction = new WaitAnim(0.1);
            return false;
        }
        this.bag.push(item);
        while (this.bag.length > this.bagSize) {
            map.addItemOnGround(this.getCell(), this.bag[0]);
            this.bag.splice(0, 1);
        }
        this.currentAction = new WaitAnim(0.1);
        return true;
    }
    drop(itemName) {
        if (this.bag.length == 0) {
            this.sayAndWait("No item in bag to drop", "red", 5);
            return;
        }
        let index = 0;
        if (itemName && itemName.toLowerCase) {
            index = this.bag.findIndex(item => item.name.toLowerCase() == itemName.toLowerCase());
            if (index === -1) {
                this.sayAndWait(`No item ${itemName} in bag to drop`, "red", 5);
                return;
            }
        }
        map.addItemOnGround(this.getCell(), this.bag[index]);
        this.bag.splice(index, 1);
        this.currentAction = new WaitAnim(0.1);
        headquarters.update();
    }
    bagItemsCount(itemName) {
        if (itemName && itemName.toLowerCase) {
            return this.bag.filter(item => item.name.toLowerCase() == itemName.toLowerCase()).length;
        }
        return this.bag.length;
    }
    placeItemsCount(arg1, arg2, arg3) {
        let count = map.placeItemsCount(arg1, arg2, arg3);
        if (count === null) {
            this.sayAndWait(`Place not found: ${arg1} ${arg2 || ''}`);
            return 0;
        }
        this.currentAction = new WaitAnim(0.1);
        return count;
    }
    setSkin(skinIndex) {
        this.sprite = botSprites[skinIndex % botSprites.length];
    }
    onXpGained() {
        if (this.craftXp >= this.nextCraftLevelXp) {
            this.craftXp = 0;
            this.craftLevel = Math.min(this.craftLevel + 1, 10);
            this.setNextLevelXp();
        }
        if (this.walkXp >= this.nextWalkLevelXp) {
            this.walkXp = 0;
            this.walkLevel = Math.min(this.walkLevel + 1, 10);
            if (this.walkLevel >= 10) {
                this.bagSize = 5;
            } else if (this.walkLevel >= 8) {
                this.bagSize = 4;
            } else if (this.walkLevel >= 5) {
                this.bagSize = 3;
            }
            this.setNextLevelXp();
        }
    }
    getCraftSpeedBonus() {
        return (10.0 + this.craftLevel) / 10;
    }
    getWalkSpeedBonus() {
        return (10.0 + this.craftLevel) / 10;
    }
    setNextLevelXp() {
        this.craftXp = 0;
        this.walkXp = 0;
        const walkXp = [100, 100, 100, 120, 140, 160, 180, 200, 250, 300];
        const craftXp = [50, 50, 50, 60, 80, 100, 120, 150, 200, 300];
        this.nextCraftLevelXp = walkXp[Math.min(this.craftLevel, walkXp.length - 1)];
        this.nextWalkLevelXp = craftXp[Math.min(this.walkLevel, craftXp.length - 1)];
    }
    isInside(event) {
        return event.offsetX >= this.x && event.offsetX < this.x + this.sprite.tWidth
            && event.offsetY >= this.y && event.offsetY < this.y + this.sprite.tHeight
    }
}

class MoveToAnim {
    constructor(item, cell_i, cell_j, speed) {
        this.item = item;
        cell_i = Math.max(0, Math.min(Math.floor(cell_i), Map.MaxX - 1));
        cell_j = Math.max(0, Math.min(Math.floor(cell_j), Map.MaxY - 1));
        this.destX = Map.BorderX + cell_i * 48 + 8;
        this.destY = Map.BorderY + cell_j * 48 + 10;
        this.speed = speed;
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
        this.maxTick = Math.max(1, Math.floor(recipe.durationSec * 30 / bot.getCraftSpeedBonus()));
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
function createStartingBots() {
    const params = new URLSearchParams(window.location.search);
    const cheating = params.get("cheat");
    if (cheating) {
        let b = [];
        for (let i = 1; i <= 25; i++) {
            b.push(new Bot(i, 48 * i, 48 * 6));
        }
        return b;
    }
    return [new Bot(1, 200, 200)];
}
const bots = createStartingBots();

class Item {
    constructor(rank, name, sprite) {
        this.rank = rank;
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
        this.water = new Item(10, "Water", getShikashiTile(10, 0));
        this.apple = new Item(20, "Apple", getShikashiTile(0, 14));
        this.sand = new Item(30, "Sand", getShikashiTile(11, 20));
        this.flask = new Item(40, "Flask", getShikashiTile(3, 19));
        this.ironOre = new Item(50, "IronOre", getShikashiTile(2, 17));
        this.powder = new Item(60, "Powder", getShikashiTile(2, 20));
        this.ink = new Item(70, "Ink", getShikashiTile(5, 19));
        this.coton = new Item(80, "Coton", getShikashiTile(5, 17));
        this.spool = new Item(90, "Spool", getShikashiTile(1, 22));
        this.blueSpool = new Item(100, "BlueSpool", getShikashiTile(2, 22));
        this.cloth = new Item(110, "Cloth", getShikashiTile(8, 7));
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
        this.buckets.sort((a, b) => a.item.rank - b.item.rank);
    }
    countItems(item) {
        for (let b of this.buckets) {
            if (b.item.name === item.name) {
                return b.count;
            }
        }
        return 0;
    }
    countItemsByName(itemName) {
        let total = 0;
        for (let b of this.buckets) {
            if (itemName && itemName.toLowerCase) {
                if (b.item.name.toLowerCase() === itemName.toLowerCase()) {
                    return b.count;
                }
            } else {
                total += b.count;
            }
        }
        return total;
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
    takeItem(itemName) {
        if (this.buckets.length == 0) {
            return null;
        }
        let index = this.buckets.length - 1;
        if (itemName && itemName.toLowerCase) {
            index = this.buckets.findIndex(b => b.item.name.toLowerCase() == itemName.toLowerCase());
            if (index === -1) {
                return null;
            }
        }
        const item = this.buckets[index].item;
        this.buckets[index].count--;
        if (this.buckets[index].count <= 0) {
            this.buckets.splice(index, 1);
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
    countItems(item, bot, cell) {
        const onBot = bot.countItems(item);
        const onMap = map.countItems(cell, item);
        return onBot + onMap;
    }
    getAMissingIngredient(bot, cell) {
        for (let ingredient of this.inputs) {
            if (this.countItems(ingredient.item, bot, cell) < ingredient.count) {
                return ingredient.item.name;
            }
        }
        return null;
    }
    hasItems(bot) {
        const cell = bot.getCell();
        return this.getAMissingIngredient(bot, cell) == null;
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
        if (!this.sprite) {
            return;
        }
        const coord = map.getCoord(this.cell);
        this.sprite.paintNoScale(coord.x, coord.y);
    }
    paintTooltip(tooltip) {
        let cursorY = tooltip.y + 22;
        let cursorX = tooltip.x + 8;

        ctx.fillStyle = this.recipe ? "orange" : "white";
        ctx.font = "bold 18px Verdana";
        ctx.fillText(this.name, cursorX, cursorY);
        cursorY += 18;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        const moveTxt = `moveTo(${this.cell.i}, ${this.cell.j})`;
        ctx.fillText(moveTxt, cursorX, cursorY);
        cursorY += 16;
        if (!this.recipe) {
            return;
        }
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
        const tile = new BuildingTile("Well", { i: 0, j: 3 }, sprite, recipe);
        return tile;
    }
    createAppleTree() {
        const sprite = getPipoTile(2, 1);
        const recipe = new Recipe(items.apple, 1.5, [{ item: items.water, count: 1 }]);
        const tile = new BuildingTile("Tree", { i: 2, j: 0 }, sprite, recipe);
        return tile;
    }
    createDune() {
        const sprite = getPipoTile(2, 0);
        const recipe = new Recipe(items.sand, 0.3, []);
        const tile = new BuildingTile("Dune", { i: 15, j: 0 }, sprite, recipe);
        return tile;
    }
    createCotonField() {
        const sprite = getPipoTile(1, 0);
        const recipe = new Recipe(items.coton, 1.5, [{ item: items.water, count: 1 }]);
        const tile = new BuildingTile("CotonField", { i: 0, j: 8 }, sprite, recipe);
        return tile;
    }
    createClothFactory() {
        const sprite = getPipoTile(0, 6);
        const recipe = new Recipe(items.cloth, 3, [
            { item: items.blueSpool, count: 4 },
            { item: items.spool, count: 1 }]);
        const tile = new BuildingTile("ClothFactory", { i: 9, j: 5 }, sprite, recipe);
        return tile;
    }
    createFire() {
        const sprite = getShikashiTile(2, 4);
        const recipe = new Recipe(items.flask, 2, [{ item: items.sand, count: 1 }]);
        const tile = new BuildingTile("Fire", { i: 14, j: 4 }, sprite, recipe);
        return tile;
    }
    createMine() {
        const sprite = getPipoTile(7, 3);
        const recipe = new Recipe(items.ironOre, 1.7, []);
        const tile = new BuildingTile("Mine", { i: 8, j: 0 }, sprite, recipe);
        return tile;
    }
    createAnvil() {
        const sprite = getShikashiTile(4, 4);
        const recipe = new Recipe(items.powder, 1, [{ item: items.ironOre, count: 1 }]);
        const tile = new BuildingTile("Anvil", { i: 9, j: 2 }, sprite, recipe);
        return tile;
    }
    createLoom() {
        const sprite = getShikashiTile(11, 16);
        const recipe = new Recipe(items.spool, 1, [{ item: items.coton, count: 2 }]);
        const tile = new BuildingTile("Loom", { i: 3, j: 7 }, sprite, recipe);
        return tile;
    }
    createMortar() {
        const sprite = getShikashiTile(12, 11);
        const recipe = new Recipe(items.ink, 1, [
            { item: items.powder, count: 1 },
            { item: items.water, count: 1 },
            { item: items.flask, count: 1 }]);
        const tile = new BuildingTile("Mortar", { i: 11, j: 3 }, sprite, recipe);
        return tile;
    }
    createCauldron() {
        const sprite = getShikashiTile(9, 19);
        const recipe = new Recipe(items.blueSpool, 1, [
            { item: items.spool, count: 1 },
            { item: items.ink, count: 1 }]);
        const tile = new BuildingTile("Cauldron", { i: 6, j: 8 }, sprite, recipe);
        return tile;
    }
    static storeroomSprites = [
        getShikashiTile(13, 16),
        getShikashiTile(11, 11),
        getShikashiTile(14, 16),
    ];
}
class Mission {
    constructor(item, onSuccessFunc) {
        this.item = item;
        this.onSuccessFunc = onSuccessFunc;
        this.lvl = 1;
        this.count = 0;
        this.progressPercent = 0;
        this.max = this.getNewMax();
    }
    addProgress(item) {
        if (this.item.name != item.name) {
            return;
        }
        this.count++;
        this.refreshProgress();
    }
    refreshProgress() {
        if (this.count < this.max) {
            this.progressPercent = Math.floor(this.count * 100 / this.max);
        }
        else {
            this.lvl++;
            this.progressPercent = 0;
            this.count = 0;
            this.max = this.getNewMax();
            this.onSuccessFunc();
        }
    }
    getAppleCurve(lvl) {
        let count = this.lvl * this.lvl;
        let mult = 1;
        if (lvl < 5) {
            mult = 2;
        } else if (lvl < 10) {
            mult = 3;
        } else if (lvl < 15) {
            mult = 5;
        } else if (lvl < 20) {
            mult = 10;
        } else {
            mult = 20;
        }
        return Math.floor(count * mult);
    }
    getClothCurve(lvl) {
        const range = [1, 2, 3, 4, 5, 6, 7, 8, 9,
            10, 11, 12, 13, 14, 15, 16, 17, 18, 20,
            22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
            50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
        let i = lvl - 1;
        if (i < range.length) {
            return range[i];
        }
        return 100 + 10 * (1 + i - range.length);
    }
    getNewMax() {
        if (this.item.name == items.apple.name) {
            return this.getAppleCurve(this.lvl);
        }
        return this.getClothCurve(this.lvl);
    }
}
class HeadquartersBigSprite {
    constructor(cellX, cellY, cellWidth, cellHeight) {
        this.sprite = new Sprite(pipoBuildingTileSet, cellX * 48, cellY * 48, cellWidth * 48, cellHeight * 48)
        this.offSetX = 48 * (cellWidth - 1) / 2;
        this.offSetY = 48 * (cellHeight - 1);
    }
    paintNoScale(x, y) {
        this.sprite.paintNoScale(x - this.offSetX, y - this.offSetY);
    }
    paint32(x, y) {
        this.sprite.paint32(x, y);
    }
}
class Headquarters {
    constructor() {
        this.name = "Headquarters";
        this.cell = { i: 5, j: 4 }
        this.sprites = [
            getShikashiTile(3, 4),
            getPipoTile(0, 7),
            getPipoTile(0, 9),
            getPipoTile(0, 10),
            getPipoTile(1, 10),
            getPipoTile(1, 9),
            getPipoTile(2, 10),
            getPipoTile(2, 9),
            getPipoTile(0, 8),
            new HeadquartersBigSprite(6, 8, 1, 2),
            new HeadquartersBigSprite(5, 8, 1, 2),
            new HeadquartersBigSprite(5, 6, 2, 2),
            new HeadquartersBigSprite(3, 11, 3, 3),
        ];
        this.sprite = this.sprites[0];
        this.missions = [
            new Mission(items.apple, () => this.missionEnded()),
            new Mission(items.cloth, () => this.missionEnded()),
        ];
        this.code = "";
        this.error = null;
        this.level = 1;
        this.maxLevel = 25;
    }
    paint() {
        const topX = Map.BorderX + this.cell.i * 48;
        const topY = Map.BorderY + this.cell.j * 48;
        this.sprite.paintNoScale(topX, topY);
        if (this.missions.find(m => m.progressPercent != 0)) {
            const left = topX;
            const top = topY + 48;
            for (let i = 0; i < this.missions.length; i++) {
                ctx.beginPath();
                ctx.lineWidth = "1";
                ctx.fillStyle = "cyan";
                ctx.rect(left, top + i * 3, 48 * this.missions[i].progressPercent / 100, 3);
                ctx.fill();
            }
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
        ctx.fillText(`Level ${this.level} / ${this.maxLevel}`, cursorX, cursorY);
        cursorY += 18;

        ctx.fillStyle = "white";
        ctx.font = "12px Verdana";
        const moveTxt = `moveTo(${this.cell.i}, ${this.cell.j}); drop();`;
        ctx.fillText(moveTxt, cursorX, cursorY);
        cursorY += 18;

        cursorY += 4;
        ctx.fillStyle = "yellow";
        ctx.font = "12px Verdana";
        const craftTxt = `Objectives:`;
        ctx.fillText(craftTxt, cursorX, cursorY);
        cursorY += 12;

        let x = cursorX;
        for (let i = 0; i < this.missions.length; i++) {
            const mission = this.missions[i];
            if (i != 0) {
                ctx.fillStyle = "yellow";
                ctx.font = "12px Verdana";
                ctx.fillText("or", x, cursorY + 30);
                x += 36;
            }
            mission.item.paintForTooltip(x, cursorY, 1);
            ctx.fillStyle = "white";
            ctx.font = "12px Verdana";
            const lvlLabel = `lvl ${mission.lvl}   ${Math.floor(mission.progressPercent)}%`;
            ctx.fillText(lvlLabel, x, cursorY + 50);

            x += 36;
            ctx.fillStyle = "white";
            ctx.font = "12px Verdana";
            const pTxt = `${mission.count} / ${mission.max}`;
            ctx.fillText(pTxt, x, cursorY + 20);
            x += 60;
        }
    }
    update() {
        let item;
        while ((item = map.takeItem(this.cell)) != null) {
            for (let m of this.missions) {
                m.addProgress(item);
            }
        }
    }
    missionEnded() {
        this.addNewBot();
        this.level = this.missions[0].lvl + this.missions[1].lvl - 1;
        console.log(`${new Date()} Level ${this.level}: ${this.missions[0].lvl} + ${this.missions[1].lvl}`)      
        if (this.level >= this.maxLevel) {
            if (!this.ended) {
                showEndGameScreen();
            }
            this.ended = true;            
        }
        const index = Math.floor((this.level - 1) / 2);
        if (index < this.sprites.length){
            this.sprite = this.sprites[index];
        }
    }
    addNewBot() {
        const coord = map.getCoord(this.cell);
        const bot = new Bot(bots.length + 1,
            coord.x - 48 + Math.floor(Math.random() * 48 * 3),
            coord.y + 32 + Math.floor(Math.random() * 24));
        bot.setCode(this.code);
        bots.push(bot);
    }
    setCode(code) {
        this.code = code;
        let fakeBot = new Bot(-1, 0, 0);
        fakeBot.setCode(this.code);
        this.error = fakeBot.error;
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
        this.storerooms = [];
    }
    paint() {
        this.paintBackground();
        for (let tile of this.storerooms) {
            tile.paint();
        }
        for (let tile of this.buildingTiles) {
            tile.paint();
        }
        for (let s of this.itemStacks) {
            s.paint();
        }
        headquarters.paint();
    }
    paintWaterCell(tile_i, tile_j, cell_i, cell_j) {
        waterTiles.paint(tile_i, tile_j, Map.BorderX + 48 * cell_i, Map.BorderY + 48 * cell_j);
    }
    paintTileCell(tiles, tile_i, tile_j, cell_i, cell_j, inside) {
        if (inside) {
            tiles.paint(tile_i, tile_j, Map.BorderX + 48 * cell_i, Map.BorderY + 48 * cell_j);
        } else {
            tiles.paintBorder(tile_i, tile_j, Map.BorderX + 48 * cell_i, Map.BorderY + 48 * cell_j);
        }
    }
    paintDesert() {
        ctx.drawImage(pipoGroundTileSet,
            624, 320,
            104, 104,
            14.5 * 48, 0,
            104, 104
        )
    }
    paintBackground() {
        for (let i = -1; i < Map.MaxX + 1; i++) {
            for (let j = -1; j < Map.MaxY + 1; j++) {
                greenGroundSprite.paintNoScale(Map.BorderX + i * 48, Map.BorderY + j * 48)
            }
        }
        this.paintDesert();
        this.paintWaterCell(0, 0, -1, -1);
        this.paintWaterCell(2, 0, Map.MaxX, -1);
        this.paintWaterCell(0, 2, -1, Map.MaxY);
        this.paintWaterCell(2, 2, Map.MaxX, Map.MaxY);
        for (let j = 0; j < Map.MaxY; j++) {
            this.paintWaterCell(0, 1, -1, j)
            this.paintWaterCell(2, 1, Map.MaxX, j)
        }
        for (let i = 0; i < Map.MaxX; i++) {
            this.paintWaterCell(1, 0, i, -1);
            this.paintWaterCell(1, 2, i, Map.MaxY)
        }
    }
    getCoord(cell) {
        const x = Map.BorderX + cell.i * 48;
        const y = Map.BorderY + cell.j * 48;
        return { x, y, width: 48, height: 48 };
    }
    isInside(event, cell) {
        const coord = this.getCoord(cell);
        return isInsideCoord(event, coord);
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
        if (itemStack == null) {
            console.error(`itemStack shouln't be null. item:${item.name}, cell: (${cell.i}, ${cell.j})`)
            return;
        }
        itemStack.removeItems(item, count);
    }
    takeItem(cell, itemName) {
        let itemStack = this.getItemStackAt(cell);
        if (itemStack == null) {
            return null;
        }
        return itemStack.takeItem(itemName);
    }
    getBuilding(cell) {
        for (let building of this.buildingTiles) {
            if (building.cell.i === cell.i && building.cell.j === cell.j) {
                return building;
            }
        }
        return null;
    }
    getCellTarget(cell) {
        for (let building of this.buildingTiles) {
            if (building.cell.i == cell.i && building.cell.j == cell.j) {
                return { building, cell: cell };
            }
        }
        return { building: null, cell: cell };
    }
    getTarget(a, b) {
        if (a === undefined) {
            throw new Error('Missing argument on map.getTarget(a, b)')
        }
        if (b === undefined && a.toLowerCase) {
            for (let building of this.buildingTiles) {
                if (building.name.toLowerCase() == a.toLowerCase()) {
                    return { building, cell: building.cell };
                }
            }
            if (headquarters.name.toLowerCase() == a.toLowerCase()) {
                return { building: headquarters, cell: headquarters.cell };
            }
            for (let building of this.storerooms) {
                if (building.name.toLowerCase() == a.toLowerCase()) {
                    return { building, cell: building.cell };
                }
            }
            return null;
        } else if (a.toFixed && b.toFixed) {
            const i = Math.max(0, Math.min(Math.floor(a), Map.MaxX - 1));
            const j = Math.max(0, Math.min(Math.floor(b), Map.MaxY - 1));
            return this.getCellTarget({ i, j });
        }
        return null;
    }
    getAMissingIngredient(bot, a, b) {
        const target = (a === undefined) ? this.getCellTarget(bot.getCell()) : this.getTarget(a, b);
        if (target == null) {
            throw new Error(`getAMissingIngredient(${a | ''} ${b | ''}): no place found`);
        }
        if (target.building == null) {
            throw new Error(`getAMissingIngredient(${a | ''} ${b | ''}): no craft station here`);
        }
        if (target.building.recipe == null) {
            throw new Error(`getAMissingIngredient(${a | ''} ${b | ''}): no craft recipe here`);
        }
        const recipe = target.building.recipe;
        return recipe.getAMissingIngredient(bot, target.cell);
    }
    placeItemsCount(arg1, arg2, arg3) {
        let place = null;
        let itemName;
        if (arg1.toFixed && arg2.toFixed) {
            place = this.getTarget(arg1, arg2);
            itemName = arg3;
        } else {
            place = this.getTarget(arg1);
            itemName = arg2;
        }
        if (place == null) {
            return null;// place not found
        }
        let itemStack = this.getItemStackAt(place.cell);
        if (itemStack == null) {
            return 0;
        }
        return itemStack.countItemsByName(itemName);
    }
    createStoreroom(name, i, j, spriteIndex) {
        if (name.trim() == "" || !i.toFixed || !j.toFixed) {
            return;
        }
        const cell_i = Math.max(0, Math.min(Math.floor(i), Map.MaxX - 1));
        const cell_j = Math.max(0, Math.min(Math.floor(j), Map.MaxY - 1));
        let sprite = TileFactory.storeroomSprites[0];
        if (spriteIndex && Number.isInteger(spriteIndex)) {
            if (spriteIndex >= 0) {
                sprite = TileFactory.storeroomSprites[spriteIndex % TileFactory.storeroomSprites.length];
            } else {
                sprite = null;
            }
        }
        let room = new BuildingTile(name, { i: cell_i, j: cell_j }, sprite);
        for (let i = this.storerooms.length - 1; i >= 0; i--) {
            const old = this.storerooms[i];
            if (old.name.toLowerCase() == room.name.toLowerCase() ||
                (old.cell.i == room.cell.i && old.cell.j == old.cell.j)) {
                this.storerooms.splice(i, 1);
            }
        }
        if (this.storerooms.length < 100) {
            this.storerooms.push(room);
        }
    }
    clearAllStorerooms() {
        this.storerooms = [];
    }
    click(event) {
        for (let building of this.buildingTiles) {
            if (this.isInside(event, building.cell)) {
                tooltip.setSelection(building);
                return;
            }
        }
        for (let building of this.storerooms) {
            if (this.isInside(event, building.cell)) {
                tooltip.setSelection(building);
                return;
            }
        }
        tooltip.setSelection(null);
    }
}
let map = new Map();

class MultiSelection {
    constructor(botAndHeadquarters) {
        this.buttons = [];
        let x = CanvasWidth;
        const y = CanvasHeight - 40
        for (let entity of botAndHeadquarters) {
            x -= 42;
            const button = { entity, x, y, sprite: entity.sprite, width: 40, height: 38 };
            this.buttons.push(button);
            this.selectedButton = button;
        }
        this.coord = { x: x - 4, y, width: CanvasWidth - x, height: 38 };
    }
    paint() {
        ctx.beginPath();
        ctx.lineWidth = "1";
        ctx.fillStyle = "#3338";
        ctx.rect(this.coord.x, this.coord.y, this.coord.width, this.coord.height);
        ctx.fill();
        for (let button of this.buttons) {
            button.sprite.paint32(button.x, button.y);
        }
    }
    click(event) {
        if (!isInsideCoord(event, this.coord)) {
            return false;
        }
        for (let button of this.buttons) {
            if (isInsideCoord(event, button)) {
                tooltip.setMultiSelection([button.entity]);
                return true;
            }
        }
        return true;
    }
}

class Tooltip {
    constructor() {
        this.selection = null;
        this.multiSelection = null;
        this.x = CanvasWidth - 250;
        this.y = CanvasHeight - 150;
        this.width = 250;
        this.height = 150;
    }
    setSelection(selection) {
        this.selection = selection;
        this.multiSelection = null;
    }
    setMultiSelection(botAndHeadquarters) {
        if (botAndHeadquarters.length == 0) {
            this.selection = null;
            this.multiSelection = null;
        } else if (botAndHeadquarters.length == 1) {
            this.selection = botAndHeadquarters[0];
            setSelectedBot(this.selection);
            this.multiSelection = null;
        } else {
            this.selection = null;
            this.multiSelection = new MultiSelection(botAndHeadquarters);
            setSelectedBot(botAndHeadquarters[0]);
        }
    }
    paint() {
        if (this.multiSelection) {
            this.multiSelection.paint();
            return;
        }
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
    click(event) {
        if (this.multiSelection) {
            return this.multiSelection.click(event);
        }
        return false;
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
    displayError(selectedBot);
    if (!selectedBot.error) {
        save();
    }
}

function setSelectedBot(botOrHeadquarters) {
    if (selectedBot != botOrHeadquarters) {
        selectedBot.code = document.getElementById('code').value;
        selectedBot = botOrHeadquarters;
        document.getElementById('code').value = botOrHeadquarters.code;
        displayError(botOrHeadquarters);
        let applyLabel = `Only on ${botOrHeadquarters.id} - ${botOrHeadquarters.name}`;
        if (botOrHeadquarters === headquarters) {
            applyLabel = `For Headquarters, aka new bots`;
        }
        document.getElementById('applyOnlyTo').innerText = applyLabel;
    }
}
function displayError(bot) {
    if (bot !== selectedBot) {
        return;
    }
    const error = bot.error;
    if (!error) {
        document.getElementById('error').innerText = "";
        return;
    }
    document.getElementById('error').innerText = error.message;
}
function onmousedown(event) {
    if (dialog != null) {
        dialog.click(event);
        return;
    }
    if (tooltip.click(event)) {
        return;
    }
    const botAndHeadquarters = [];
    if (map.isInside(event, headquarters.cell)) {
        botAndHeadquarters.push(headquarters);
    }
    for (let bot of bots) {
        if (bot.isInside(event)) {
            botAndHeadquarters.push(bot);
        }
    }
    tooltip.setMultiSelection(botAndHeadquarters);
    if (botAndHeadquarters.length == 0) {
        map.click(event);
    }
}

function save() {
    localStorage.setItem("headquartersCode", headquarters.code);
}
function restore() {
    const code = localStorage.getItem("headquartersCode");
    if (!code || !code.trim()) {
        return;
    }
    headquarters.code = code;
    document.getElementById("applyAll").checked = true;
    tooltip.setMultiSelection([headquarters]);
}
restore();

class EndGameDialog {
    constructor(ticks) {
        let playedSec = (ticks / 30).toFixed(3);
        let hour = Math.floor(playedSec / 3600);
        let min = Math.floor((playedSec - hour * 3600) / 60);
        let sec = Math.floor(playedSec - hour * 3600 - min * 60);
        let milli = Math.floor((playedSec - Math.floor(playedSec)) * 1000);
        hour = hour.toLocaleString(undefined, { minimumIntegerDigits: 2 });
        min = min.toLocaleString(undefined, { minimumIntegerDigits: 2 });
        sec = sec.toLocaleString(undefined, { minimumIntegerDigits: 2 });
        milli = milli.toLocaleString(undefined, { minimumIntegerDigits: 3 });
        this.timePlayed = `${hour}:${min}:${sec}.${milli}`
        this.window = { x: 100, y: 100, width: CanvasWidth - 200, height: CanvasHeight - 200 };
        this.button = { x: 390, y: 280, width: 280, height: 48, label: "Keep playing" };
    }
    update() { }
    paint() {
        ctx.fillStyle = "#fffd";
        ctx.fillRect(this.window.x, this.window.y, this.window.width, this.window.height);

        ctx.fillStyle = "green";
        ctx.font = "36px Verdana";
        ctx.fillText("Victory!", this.window.x + 200, this.window.y + 50);
        ctx.fillStyle = "black";
        ctx.font = "22px Verdana";
        ctx.fillText(`You ended the game in ${this.timePlayed} (CPU ticks)`, this.window.x + 25, this.window.y + 120);
        this.paintButton();
    }
    paintButton() {
        ctx.fillStyle = "gray";
        ctx.fillRect(this.button.x, this.button.y, this.button.width, this.button.height);

        ctx.fillStyle = "black";
        ctx.font = "32px Verdana";
        if (this.button.textX == null) {
            const textWidth = ctx.measureText(this.button.label).width;
            this.button.textX = this.button.x + this.button.width / 2 - textWidth / 2;
        }
        ctx.fillText(this.button.label, this.button.textX, this.button.y + 33);
    }
    click(event) {
        if (isInsideCoord(event, this.button)) {
            dialog = null;
        }
    }
}
let dialog = null;
function showEndGameScreen() {
    dialog = new EndGameDialog(tickNumber);
}
//dialog = new EndGameDialog(1000000);
//headquarters.missions[1].lvl = 100;
//map.addItemOnGround({ i: 0, j: 3 }, items.cloth);
//map.addItemOnGround({ i: 0, j: 3 }, items.water);
//map.addItemOnGround({ i: 0, j: 3 }, items.apple);
//map.addItemOnGround({ i: 0, j: 3 }, items.ironOre);



tick();