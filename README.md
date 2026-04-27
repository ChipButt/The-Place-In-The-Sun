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
