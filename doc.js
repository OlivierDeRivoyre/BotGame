
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
addPage('How to play', [
`<p>
You control the bot by giving him a JavaScript program to execute. 
The goal is to drop stuff in the Headquarters in the center of the map.
</p>

<p>Here is an example script that you can run on the bot:</p>
`,
`<code><pre>
while(true){
  moveTo("Well");
  craft();
  take();
  moveTo("Tree");
  craft();
  take();
  moveTo("Headquarters");
  drop();
  wait(5);
  say("Let's do it again");    
}
</pre></code>`,
`
<p>
Fulfill an objective give you a new bot. 
You can set a program to the Headquarters, newly created bots will run it.
</p>

<p>
You can use the standard ES5 JavaScript functions as 
<code>var</code>, 
<code>if</code>,
<code>while</code>,
<code>function</code>,
<code>for</code>.
You also have access to the bot 
functions that give order to the bot as 
<code>moveTo("Well")</code>.
</p>
`
]);

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

addPage('moveTo()', [
`<p>
Order the bot to move to the well known place. 
Case is insensitive for the place name.
</p>`,
`<code><pre>
moveTo("Well");
moveTo("Tree");
moveTo("Headquarters");
moveTo("CotonField");
moveTo("Loom");
moveTo("Mine");
moveTo("Anvil");
moveTo("Dune");
moveTo("Fire");
moveTo("Mortar");
moveTo("Cauldron");
moveTo("ClothFactory");
</pre></code>`,
`<p>
<code>moveTo(x, y)</code> may also be used.
The top left cell is (0,0) while bottom right is (15,8).
</p>
`,
`<code><pre>
for(var x = 0; x < 16; x++){
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
moveTo("Well");
craft();
take();
moveTo("Tree");
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
take(); take("Water");
moveTo("tree");
drop(); drop();
</pre></code>`,
`<p>
<code>take()</code> can take an argument to specify wich item take.
The argument is case insensitive.
Without argument, the bot take the most advanced item by default.
</p>`,
`<code><pre>
take();
take("Water");
take("Apple");
take("Sand");
take("Flask");
take("IronOre");
take("Powder")
take("Ink");
take("Coton");
take("Spool");
take("BlueSpool");
take("Cloth");
</pre></code>`
]);

addPage('drop()', [
`<p>
Drop on the ground an item from the bag.
By default, the bot drops the oldest item from its bag.
<code>drop()</code> can take an argument to specify wich item drop.
</p>
`,
`<code><pre>
moveTo("Well");
craft(); 
take(); 
moveTo("Tree");
craft(); 
take(); 
moveTo("Headquarters");
drop(); 
</pre></code>`,
`<code><pre>
drop();
drop("Water");
drop("Apple");
drop("Sand");
drop("Flask");
drop("IronOre");
drop("Powder");
drop("Ink");
drop("Coton");
drop("Spool");
drop("BlueSpool");
drop("Cloth");
</pre></code>`
]);


addPage('say()', [
`<p>
Have a text that appears on the top of the bot.
</p>
`,
`<code><pre>
say("Hello");
say("My ID is " + getId());
say("My name is " + getName());
</pre></code>`
]);

addPage('wait()', [
`<p>
Let the bot idle for the number of second given in argument.
</p>
`,
`<code><pre>
say("I'm going to do nothing for 5 seconds");
wait(5);
say("I'm done waiting");
</pre></code>`
]);

addPage('getId()', [
`<p>
Each bot has an Id. The first one has id 1, the second has 2 as id, etc.
</p>
<p>
<code>getBotsCount()</code> give the total number of bots.
</p>
`,
`<code><pre>
var botCount = getBotsCount();
say("bots count:" + botCount);
var id = getId();
var newName = "Bot" + id;
switch(getId()){
  case 1: newName = "Alan"; break
  case 2: newName = "Bob"; break
  case 3: newName = "Carl"; break
}
setName(newName);
</pre></code>`
]);

addPage('Bot display', [
`<p>
Bot name can be changed.
</p>
`,
`<code><pre>
setName("AppleBot");
say("I'm now " + getName());
</pre></code>`,
`<p>
Bot skin can also be chosen.
</p>
`,
`<code><pre>
for(var i = 0; i < 36; i++){
    setSkin(i);
    say("Skin " + i);
}
</pre></code>`
]);

addPage('Bot bag', [
`<p>
Bot <code>take()</code> items into its bag.
A bot can carry <code>getBagSize()</code> items in its bag. 
While the size is 2 for a fresh bot, this <code>getBagSize()</code> level up with walk level.
</p>
<p>
<code>bagHasSpace()</code> returns true if the bag has some empty space(s) for new item.
</p>
`,
`<code><pre>
function craftUntilBagIsFull() {
    while(bagHasSpace()){
        craft();
        take();
    }
}
moveTo("well");
craftUntilBagIsFull();
</pre></code>`,
`<p>
<code>getBagItemsCount()</code> returns the number of items in the bag. 
It accepts an argument to filter by item type: <code>getBagItemsCount("apple")</code>
</p>`,
`<p>
<code>bagHasItem()</code> returns true if there is at least one item in the bag. 
It accepts an argument to filter by item type: <code>bagHasItem("apple")</code>
</p>`,
`<code><pre>
function dropAll(itemName) {
    while(bagHasItem(itemName)){
        drop(itemName);
    }
}
if(getBagItemsCount("Water") > 0){
  moveTo("Tree");
  dropAll("Water");
}
</pre></code>`,
]);

addPage('Bot level', [
`<p>
Bot level on crafting on walking allow to craft and walk faster.
Bot earn crafting xp by crafting, and walking xp by walking.
</p>
<p>
Once reaching a walk level of 4, 8 and 10, the bag size increase.
</p>
`,
`<code><pre>
var craftLevel = getCraftLevel();
say("My craft level is: " + craftLevel);
var bonus = (10 + craftLevel) / 10;
say("Craft speed bonus: x" + bonus.toFixed(2));
var walkLevel = getWalkLevel();
say("My walk level is: " + walkLevel);
bonus = (10 + walkLevel) / 10;
say("Walk speed bonus: x" + bonus.toFixed(2));
</pre></code>`,
]);


addPage('Try actions', [
`<p>
<code>tryTake()</code> is an advanced take that accept failure.
<code>tryTake()</code> returns false if the bot fails to take an item. 
</p>
`,
`<code><pre>
function waitForItem(itemName) {
    while(!tryTake(itemName)){
    wait(0.1);
    }
}
waitForItem("Apple");
</pre></code>`,
`<p>
<code>tryCraft()</code> returns false if the bot failed to craft.
It return true in case of success.
</p>
`,
`<code><pre>
moveTo("Tree");
if(!tryCraft()){
  moveTo("Well");
  craft();
  take();
  moveTo("Tree");
  craft();
}
</pre></code>`,
`<p>
<code>craftOrGetAMissingIngredient()</code> returns null in case of success. 
If the craft failed because an ingredient was missing, <code>craftOrGetAMissingIngredient()</code> returns the name
of a missing ingredient.
</p>
`,
`<code><pre>
moveTo("Tree");
var missing = craftOrGetAMissingIngredient();
if(missing != null){
  say("Missing to craft: " + missing)
}
</pre></code>`,
]);

addPage("Place's items", [
`<p>
<code>placeHasItem()</code> and <code>getPlaceItemsCount()</code> give information about items on the ground.
</p>
<p>
Both methods accepts an <code>itemName</code> as last argument:
</p>
`,
`<code><pre>
var waterCount = getPlaceItemsCount("Tree", "Water");
say("Water crafted on the tree: " + waterCount);
if(placeHasItem("Tree")) {
    say("There is items on the tree");
}
if(placeHasItem("Tree", "Apple")) {
    say("There is apple on the tree");
}
if(placeHasItem(0, 3)) {
    say("There is items at coordonate (0,3)");
}
if(placeHasItem(0, 3, "Apple")) {
    say("There is apple at coordonate (0,3)");
}  
</pre></code>`,
`<p>
<code>getAMissingIngredient()</code> let you know what is missing for a bot to craft at a particula place. 
The method returns <code>null</code> when the bot can craft at target place.
Otherwhise, the method returns the name of one of the missing items. 
</p>`,
`<code><pre>
moveTo("Tree");
var missing = getAMissingIngredient();
say("Need: " + missing);
moveTo("Well");
missing = getAMissingIngredient("Tree");
say("Tree need: " + missing);
craft();
take("Water")
missing = getAMissingIngredient("Tree");
if(missing == null){
  say("I can craft an apple if I go the the tree");
}
</pre></code>`,
]);

addPage("Storeroom", [
`<p>
You may create storeroom on the map as place label. 
Once created it may be used by all bots.
</p>
`,
`<code><pre>
if(getId() == 1){
   clearAllStorerooms();
   createStoreroom("myStore", 3, 4);
}
moveTo("myStore");
</pre></code>`,
`<p>
You may change the display of the storeroom, and even make invisible ones.
</p>
`,
`<code><pre>
if(getId() == 1){
   clearAllStorerooms();
   createStoreroom("DefaultIcon", 1, 4);
   createStoreroom("sameThanDefaultIcon", 2, 4, 0);
   createStoreroom("Chest", 3, 4, 1);
   createStoreroom("OldChest", 4, 4, 2);
   createStoreroom("Invisible", 5, 4, -1);
   
}
moveTo("Invisible");
</pre></code>`
]);
addPage("All functions", [
`<code><pre>
moveTo("Well");
say("Hello");
wait(2);
craft();
tryCraft();
var missing = craftOrGetAMissingIngredient();
take("Water");
tryTake("Water");
drop("Water");
getId();
getName();
setName("Alice");
setSkin(23);
setWorkInSilence(true);
getBotsCount();
getBagSize();
getCraftLevel();
getWalkLevel();
getMissionLevel("Apple");
getMissingItemsCountForMission("Cloth");
getTotalItemsCountForMission("Apple");
bagHasSpace();
getBagItemsCount("Water");
bagHasItem();
bagIsEmpty();
getPlaceItemsCount("Tree", "Water");
placeHasItem("Tree", "Water");
var missing = getAMissingIngredient("Tree");
clearAllStorerooms();
createStoreroom("MyStore", 3, 3);
getTickCount();
setGlobalValue("key", "value");
var value = getGlobalValue("key");
globalQueuePush("topic", "value");
var value = globalQueueTryPop("topic");
clearAllGlobalValues();
</pre></code>`
]);
    









addPage('Credits', [
`
<p>
Thanks to Shikashipx and 0x72 and Pipoya for theirs CCA/MIT work on the assets:
</p>
<p>
<a href="https://0x72.itch.io/dungeontileset-ii">dungeontileset-ii</a>: cool characters sprites.<br/>
<a href="https://shikashipx.itch.io/shikashis-fantasy-icons-pack">shikashis-fantasy-icons-pack</a>: for the items.<br/>
<a href="https://pipoya.itch.io/pipoya-free-rpg-world-tileset-32x32-40x40-48x48">pipoya-free-rpg-world</a>: for the map.
</p>
<p>
Lib to run the bot scripts:
</p>
<p>
<a href="https://github.com/NeilFraser/JS-Interpreter">JS-Interpreter</a>: 
A sandboxed JavaScript interpreter in JavaScript. Execute arbitrary ES5 JavaScript code.
</p>
<p>
Code source can found on:
</p>
<p>
<a href="https://github.com/OlivierDeRivoyre/HealGame">github</a>
</p>
<p>
Special thanks to Jerome Poupon for beta testing this game.
</p>
`
]);
    