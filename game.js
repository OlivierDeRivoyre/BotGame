const gameDuration = 30.0;
const CanvasWidth = 800;
const CanvasHeight = 450;
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

function square(x){
    return x * x;
}
function loadImg(name) {
    const img = new Image();
    img.src = "img/" + name + ".png";
    return img;
}
const tileSet1 = loadImg("0x72_DungeonTilesetII_v1.7x2");
const tileSet2 = loadImg("Shikashi");

class Sprite {
    constructor(tile, tx, ty, tWidth, tHeight) {
        this.tile = tile;
        this.tx = tx;
        this.ty = ty;
        this.tWidth = tWidth;
        this.tHeight = tHeight;
    }
    paint32(x, y) {
        ctx.drawImage(this.tile,
            this.tx, this.ty,
            this.tWidth, this.tHeight,
            x, y,
            32, 32
        )
    }
}
const healerSprite = new Sprite(tileSet1, 256, 340, 32, 48);

const tickDuration = 1000.0 / 30;
function tick() {
    myBot.update();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    myBot.paint();
    setTimeout(tick, tickDuration);
}


class Bot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.currentAction = null;
        this.interpreter = null;
    }
    update() {
        if (this.currentAction != null) {
            const ended = this.currentAction.update(this);
            if(ended){
                this.currentAction = null;
            }
        } else if (this.interpreter != null) {
            this.runCode();
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
        healerSprite.paint32(this.x, this.y)
    }
    setCode(code){
        const self = this;
        function initInterpreter(interpreter, globalObject) {
            const wrapper = function moveTo(x, y) {
                myBot.currentAction = new MoveToAnim(self, x, y);                
            };
            interpreter.setProperty(globalObject, 'moveTo',
                interpreter.createNativeFunction(wrapper));
        }
        myBot.interpreter = new Interpreter(code, initInterpreter);
    }
}
class MoveToAnim {
    constructor(item, destX, destY){
        this.item = item;
        this.destX = destX;
        this.destY = destY;
        this.speed = 5;        
    }
    update() {
        const d = Math.sqrt(square(this.destX - this.item.x) + square(this.destY - this.item.y));
        if (d < this.speed) {
            this.item.x =this.destX;
            this.item.y =this.destY;
            return true;
        }
        this.item.x += (this.destX -  this.item.x) * this.speed / d;
        this.item.y += (this.destY -  this.item.y) * this.speed / d;
        return false;
    }
}
let myBot = new Bot(300, 300);
function runCode() {
    const code = document.getElementById('code').value;
    myBot.setCode(code);
}
tick();