# Royal Britannia: Nassau Prototype v0.4

Mobile-first tilemap RPG prototype for the Nassau / Buccaneers game.

## What changed in v0.4

- Movement is now four-direction only: up, down, left, right.
- Movement is now tile-based: one input moves the player one full tile.
- Diagonal movement has been removed.
- Walking into map entrances/exits now triggers map changes automatically.
- The Nassau cave entrance no longer needs tapping to enter.
- Player status now includes HP and GP.
- Chests now open a loot screen instead of only showing dialogue.
- Loot can be taken individually or with Take All.
- Player inventory added with five pocket slots.
- One inventory slot is marked as the on-hand item.
- Character state has been moved into `js/character.js`.

## Upload structure

Upload these files directly into the root of the GitHub Pages repo:

```text
index.html
manifest.webmanifest
css/
js/
assets/
README.md
```

Do not upload the folder as a folder inside the repo. `index.html` must sit at the top level.

## Controls

Mobile:

- D-pad moves one tile at a time.
- Tap people, chests, signs, and objects to interact.
- Walk into entrance/exit highlight zones to change map.
- Bag opens the inventory.
- Full Screen requests fullscreen and tries to lock landscape.

Desktop:

- Arrow keys or WASD move one tile at a time.
- E, Enter, or Space interacts with whatever is in front of the player.
- I or B opens the inventory.

## Asset notes

Current individual PNG assets are good enough for this prototype.

For better animation later, generate these as transparent PNGs:

- Water animation: 3 or 4 frames per water tile.
- Grass/tall grass animation: 2 or 3 subtle sway frames.
- Player animation: 3 or 4 frames per direction, all frames same size.
- Item/equipment overlays: separate transparent PNGs, e.g. spoon-in-hand, sword-in-hand.

## Current goal

This version is still a foundation prototype. The important test is:

- Does tile movement feel right?
- Does the mobile D-pad feel usable?
- Does walk-in map transition feel better?
- Does the GP/inventory/chest flow make sense?
