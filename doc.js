
const combo = document.getElementById("docCombo");
const divContent= document.getElementById("docContent");
const docs = [];

function showDoc(id){
    const doc = docs[id];
    divContent.innerHTML = doc.html;
}

function addPage(title, htmls){
    const html = htmls.map(h => formatCode(h)).join("");
    docs.push({title, html});
    const id = docs.length - 1;
    const option = document.createElement('option');
    option.value = id;
    option.innerHTML = title;
    combo.appendChild(option);
    if(docs.length == 1){
        showDoc(0);
    }
   // showDoc(id);
}
function formatCode(html){
    if(!html.startsWith('<code>')){
        return html;
    }
    const keyworks = ["var", "function", "switch", "for", "while", "if", "true", "false", "return", "break", "case"];
    for(let k of keyworks){
        html = html.replaceAll(k, `<span style='color:blue'>${k}</span>`)
    }
    const regexStr = /(".*")/gi;
    html = html.replaceAll(regexStr, "<span style='color:darkred'>$1</span>");
    const regexNumber = /(\d+)/gi;
    html = html.replaceAll(regexNumber, "<span style='color:Crimson'>$1</span>");
    //const regexFunc = /([a-zA-Z]+)\(/gi;
    //html = html.replaceAll(regexFunc, "<span style='color:black'>$1(</span>");
    
    return html;
}

addPage('Sample of code', [
`<code><pre>
var newName = "Bot" + getId();
switch(getId()){
  case 1: newName = "Alan"; break
  case 2: newName = "Bob"; break
  case 3: newName = "Carl"; break
}
setName(newName);
moveTo((getId() - 1) % 16, 8);
say("Hello, I'm " + getName());
wait(getId());
function bringAppleTo(to){
    moveTo("well");
    craft();
    take();
    moveTo("tree");
    craft();
    take();
    moveTo(to);
    drop();
}
while(true){ 
    bringAppleTo("Headquarters")
}
</pre></code>`
]);

addPage('How to play', [
`<p>
You control the bot by giving him a Javascript program to execute. 
The goal is to bring stuff in the headquarters in the center of the maps.
</p>
<p>
In addition of the standard ES5 JavaScript functions, you have access to the bot function that give order to the bot. 
For example <code>moveTo("well")</code>.
</p>`
]);

addPage('moveTo()', [
`<p>
Order the bot to move to the well known place. 
Case is insensitive for the place name.
</p>`,
`<code><pre>
moveTo("well");
moveTo("tree");
moveTo("headquarters");
moveTo("cotonField");
moveTo("loom");
moveTo("mine");
moveTo("anvil");
moveTo("dune");
moveTo("fire");
moveTo("mortar");
moveTo("cauldron");
moveTo("clothFactory");
</pre></code>`,
`<p>
<code>moveTo(x, y)</code> may also be used.
The top left cell is (0,0) while bottom right is (15,8).
</p>
`,
`<code><pre>
for(var x = 0; x < 15; x++){
  moveTo(x, 0);
  moveTo(x, 8);
}
</pre></code>`,
]);

addPage('craft()', [
`<p>
Once a bot is on a place, he can <code>craft</code> the place's recipe
to create new item.
</p>
<p>
Some recipes have item as ingredient prerequesite.
The bot or the place should have the items for the craft to proceed.
</p>
<p>
Item crafted are droped on the ground. 
The bot may <code>take()</code> it to bring it to another place.
</p>
`,
`<code><pre>
moveTo("well");
craft();
take();
moveTo("tree");
drop();
</pre></code>`
]);

addPage('take()', [
`<p>
Take the item that is on the ground.
</p>
<p>
A bot can take multiple items to its bag. 
A fresh bot has a bag size of 2 items.
</p>
<p>
If the bag is full, to take a new item, the bot 
will automatically drop the oldest item from its bag.
</p>
`,
`<code><pre>
moveTo("well");
craft(); craft();
take(); take("water");
moveTo("tree");
drop(); drop();
</pre></code>`,
`<p>
<code>take()<code> can take an argument to specify wich item take.
The argument is case insensitive.
Without argument, the bot take the most advanced item by default.
</p>`,
`<code><pre>
take();
take("water");
take("apple");
take("sand");
take("flask");
take("ironOre");
take("ink");
take("coton");
take("spool");
take("blueSpool");
take("cloth");
</pre></code>`
]);

addPage('drop()', [
`<p>
Drop on the ground an item from the bag.
By default, the bot drops the oldest item from its bag.
<code>drop()<code> can take an argument to specify wich item drop.
</p>
`,
`<code><pre>
moveTo("well");
craft(); craft();
take(); take();
moveTo("tree");
drop(); drop("water");
</pre></code>`,
`<code><pre>
drop();
drop("water");
drop("apple");
drop("sand");
drop("flask");
drop("ironOre");
drop("ink");
drop("coton");
drop("spool");
drop("blueSpool");
drop("cloth");
</pre></code>`
]);

addPage('Credits', [
`
<p>
Thanks to Shikashipx and 0x72 and Pipoya for theirs CCA/MIT work on the assets:
</p>
<p>
<a href="https://0x72.itch.io/dungeontileset-ii">dungeontileset-ii</a><br/>
<a href="https://shikashipx.itch.io/shikashis-fantasy-icons-pack">shikashis-fantasy-icons-pack</a><br/>
<a href="https://pipoya.itch.io/pipoya-free-rpg-world-tileset-32x32-40x40-48x48">pipoya-free-rpg-world</a>
</p>
<p>
Libs:
</p>
<p>
<a href="https://github.com/NeilFraser/JS-Interpreter">JS-Interpreter</a>: A sandboxed JavaScript interpreter in JavaScript. Execute arbitrary ES5 JavaScript code.
</p>

<p>
Code source and bugs report can found on:
</p>
<p>
<a href="https://github.com/OlivierDeRivoyre/HealGame">github</a>
</p>
`
]);