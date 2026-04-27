# Royal Britannia: Nassau Prototype v0.5

Mobile-first top-down RPG prototype for Nassau, the buccaneer island.

## What changed in v0.5

- The mobile D-pad now has the **ACT** button in the centre.
- The separate mobile Action button has been removed.
- Full Screen buttons have been removed from the UI.
- The game now attempts fullscreen / landscape lock after the first mobile touch, because mobile browsers will not allow true fullscreen before a user gesture.
- Mobile inventory is now visible in the right panel instead of hidden behind a scrollable Bag overlay.
- Inventory now has:
  - 2 on-hand slots: Left and Right
  - 4 pocket slots
- Chest loot is shown as square slots.
- Items taken from chests now go into pockets.
- Pocket items can be tapped to ready them into a hand.
- Hand items can be tapped to move them back into pockets.
- The Nassau cave entrance has been moved down onto a walkable tile.

## Upload instructions

Upload these files to the root of your GitHub Pages repository:

```text
index.html
manifest.webmanifest
css/
js/
assets/
README.md
```

Do not upload the containing ZIP folder itself as a nested folder. The `index.html` file must be at the top level.

## Controls

### Mobile

- D-pad arrows: move one tile
- Centre ACT button: interact
- Walk onto cave/exit tiles to change maps
- Tap chest items to take them
- Tap pocket item to ready it into a hand
- Tap hand item to stow it back into pockets

### Desktop

- WASD / arrow keys: move one tile
- E / Enter / Space: interact
- I / B: open desktop inventory overlay

## Notes

The game is still a prototype. The next sensible stage is improving the map layout, animated terrain, and item images.
