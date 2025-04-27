
A game in your browser where you program your bots to automate the gathering of ressources.

You control the bot by giving him a JavaScript program to execute. The goal is to drop stuff in the Headquarters in the center of the map.

Here is an example script that you can run on the bot:

```js
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
```

Fulfill an objective give you a new bot. 

Web site where you can play:
https://olivierderivoyre.github.io/BotGame/

Libs:
https://github.com/NeilFraser/JS-Interpreter/tree/master

Assets:
https://0x72.itch.io/dungeontileset-ii
https://shikashipx.itch.io/shikashis-fantasy-icons-pack
https://pipoya.itch.io/pipoya-free-rpg-world-tileset-32x32-40x40-48x48

