# Royal Britannia: Nassau Prototype v0.7

This version uses the uploaded sprite sheets directly:

```text
assets/images/sheets/basictiles.png
assets/images/sheets/characters.png
assets/images/sheets/things.png
assets/images/sheets/dead.png
assets/images/sheets/fontlarge.png
assets/images/sheets/fontsmall1.gif
assets/images/sheets/fontsmall2.gif
```

The game code now slices sprites from those sheets using crop rectangles in `js/assets.js`.

## Upload to GitHub

Upload the contents of this ZIP to the root of your GitHub Pages repository.

The repo should look like:

```text
index.html
manifest.webmanifest
css/
js/
assets/
README.md
```

Do not upload the whole ZIP folder as a nested folder.

## Controls

Desktop:

```text
Arrow keys / WASD = move one tile
E / Enter / Space = action
I = inventory overlay
```

Mobile:

```text
D-pad = move one tile
Centre ACT button = action
Tap nearby things to interact where supported
```

## Notes

- Movement is four-direction only.
- Each movement advances one tile.
- The two middle-top character sets from `characters.png` are the playable options.
- Other characters from `characters.png` are reserved for NPCs and monsters.
- The Concerned Citizen fetch quest is still included.
- The Rusty Key is in the cave chest.
- Returning the Rusty Key rewards GP and sends the Concerned Citizen home.
- The cave entrance and cave exit both use walk-on portal tiles.
