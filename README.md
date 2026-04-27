# Royal Britannia: Nassau Prototype v0.3

This is a mobile-first tilemap prototype for the Royal Britannia Nassau RPG idea.

## What this version proves

- Mobile-first fixed full-screen app shell
- Right-side mobile control panel
- Bottom-right D-pad
- Tap-to-interact with objects and NPCs
- Desktop keyboard support retained
- Tilemap-based Nassau island
- Collision against water and solid objects
- NPC dialogue
- Sign/chest/object interaction
- Portal from Nassau to a second cave map
- Portal from the cave back to Nassau
- Uses individual transparent PNG assets instead of cropped sheet coordinates

## Upload structure

Upload the contents of this folder directly to your GitHub repository root:

```text
index.html
manifest.webmanifest
css/
js/
assets/
```

Do not upload it as:

```text
nassau-prototype-v03/index.html
```

The `index.html` file needs to be at the top level of the repo.

## Controls

### Mobile

- Use the right-side D-pad to move.
- Tap NPCs, signs, chests, the hut, boat, barrel, crate, or cave entrance to interact.
- The Action button also interacts with whatever is directly in front of the player.
- Full Screen tries to enter fullscreen and lock landscape. Some mobile browsers only allow this after a user tap, and some do not support orientation lock.

### Desktop

- Move: arrow keys or WASD
- Run: Shift
- Interact: E, Enter, or Space

## Asset note

These individual transparent PNG assets are better for this stage than the two big white-background sheets because each file can be replaced directly.

For final production, we may later pack these into a single atlas/sprite sheet for performance, but do not do that yet. First we need to lock the game scale, tile size, mobile layout, and visual style.
