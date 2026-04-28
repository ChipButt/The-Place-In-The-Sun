# Roll Britannia: Nassau Prototype v0.15

Mobile-first tile RPG prototype.

## Current controls

- Move: D-pad or arrow keys/WASD
- Interact: centre ACT button, Enter, Space, or E
- Enter buildings/caves: walk onto the entrance tile

## New in v0.15

- Added Nancy's Tavern exterior image on Nassau.
- Nancy is now inside her tavern, not outside.
- Added a new tavern interior map.
- Nancy uses the F_04 character file.
- Nancy stands behind a bar, with interaction range extended so the player can talk to her across the blocker tile.
- Added Nancy trade screen.
- Nancy can buy eggs, wheat/barley bundles, or all available sellable goods.
- Trade screen shows the GP value before selling.
- Eggs, wheat and barley now stack in the pocket inventory.
- Egg stack limit: 5.
- Wheat stack limit: 10.
- Barley stack limit: 10.

## Upload instructions

Upload the contents of this ZIP directly into the GitHub repo root so index.html is at the top level.


## v0.38 tile wiring update
- Replaced short grass with the user-supplied short grass tile.
- Replaced tall grass with the 3 user-supplied animation frames.
- Replaced shoreline edge sand with the 8 user-supplied shoreline edge tiles.
- Replaced flower patches with user-supplied flower tiles (subtle + larger variation).

- v0.39 updated shoreline edge tile art with the newer user-supplied set to improve coastline transitions.


## v0.41 upload-safe compression
- Compressed oversized terrain/building assets so the zip can be uploaded through GitHub's web interface.
- No game logic intentionally changed from v0.40.


## v0.42 exact floor tile correction
- Sand now uses only the supplied Sand tile, with supplied Sand w shells as the rare variation.
- Grass now uses only the supplied Short Grass, Flowers, and 3-frame Tall Grass animation tiles.
- Tall grass animation loops through Tall Grass 1, 2, and 3 like the water animation.
- GrassA and GrassB map to animated tall grass so existing grass-variant map patches use the animated tile.


## v0.43 Derek + shoreline animation
- Added Derek Normalbeard as a selectable playable character.
- Added 3-frame animated shoreline tiles using the supplied Beach_Shoreline_tile_assets 1/2/3 sheets.


## v0.44 shoreline / grid / Derek / torch fixes
- Shoreline animation rebuilt from the supplied 3 shoreline sheets using compact 4x4 shoreline sprite sheets.
- Water animation now uses the centre water tile cropped from each supplied shoreline sheet.
- Standard sand now uses the centre sand tile from the shoreline sheet.
- Grass tiles are centre-cropped/scaled slightly larger to reduce visible tile seams.
- Derek Normalbeard north-facing frames were enlarged slightly and the stray black bottom line was removed.
- Added a Grid button, and keyboard G, to toggle tile-coordinate overlay for screenshots and blocking references.
- Cave intro now keeps the torch light centred on the old pirate until the torch is handed over.
- When the torch is handed over, the left-hand item is moved out of the left hand where possible and the torch goes into the left hand.
- Chickens now avoid laying eggs on any visible object footprint, including buildings, caves, props, huts, houses, and taverns.
