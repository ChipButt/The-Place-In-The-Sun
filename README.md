# Royal Britannia: Nassau Prototype v0.8

Mobile-first tile RPG prototype.

## v0.8 changes

- Corrected water tile to basictiles.png: 3 down / 6 across.
- Restricted Nassau ground to mostly sand, with only a small grass patch inside.
- Grass now only uses the approved grass tiles: 2 down / 5 across, plus 9 down / 1 and 2 across.
- Rebuilt the cave mouth from basictiles.png tiles: rocky surround from 2 down / 8 across and entrance from 7 down / 3 across.
- Moved the cave portal onto the cave entrance tile.
- Changed crate/barrel placeholder to the pot tile at 4 down / 4 across.
- Tightened chest/barrel/crate collision to one tile.
- Increased interact reach so objects can be used from adjacent tiles.
- Empty chests now change to the open chest sprite.
- Loot buttons now use pointer events and larger touch areas for faster mobile tapping.

## Upload structure

Upload the contents of this ZIP directly to the GitHub repo root:

```text
index.html
manifest.webmanifest
css/
js/
assets/
README.md
```

Do not upload the parent folder as an extra nested folder.


## v0.9 changes

- Loot panel item boxes are smaller and no longer leave a final "Empty" square after everything is taken.
- Cave map rebuilt as a darker cave maze with brown floor and stone wall tiles.
- Cave entrance graphic now places the entrance tile at the bottom-middle of the 3×3 cave mouth.
- Entering the cave now leads to a forced torch-giver interaction after the player steps forward.
- Torch is added to an open hand if available, otherwise it goes into pockets.
- Cave visibility now depends on having the torch equipped in a hand.
- Added a Rusty Key chest and a red-herring chest containing Rouge Mackerel and Super Shiny Key.
- The Concerned Citizen now rejects the Super Shiny Key with the requested dialogue.
- Shoreline collision now allows the player to walk right up to the water edge.
