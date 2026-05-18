# Local BGM Playlist

Put your music files in this folder, then add them to `playlist.json`.

Example:

```json
{
  "tracks": [
    {
      "title": "Night Glass",
      "artist": "Local",
      "src": "./assets/music/night-glass.mp3"
    }
  ]
}
```

Use relative paths that start with `./assets/music/`. Files stored elsewhere on your computer will not work after the site is deployed to GitHub Pages.
