# Leovaunt StarCraft RPG — Foundry VTT v13 (Unofficial)

Developer preview 0.1.0-alpha.1. Independent system with Raynor-inspired Terran HUD.

## Installation
Copy repository files into Foundry user data at Data/systems/leovaunt-starcraft/ and restart Foundry. Create a world using the Leovaunt StarCraft system and make a Terran actor.

## Current scope
Terran data fields, derived statistics, resources, skill and attribute rolls. Zerg, Protoss, and NPC are placeholder types only. Equipment, advancement, psionics and combat automation are not yet implemented.

## Testing
Please test Terran actor creation, editing, persistence, and chat roll buttons in Foundry v13. This is an untested-in-Foundry alpha, not a finished release.

## Rights
Unofficial fan software, unaffiliated with Blizzard or the game author. Do not redistribute proprietary rulebook text or artwork.

## Foundry's built-in update button

Release automation is in `.github/workflows/release.yml`. When a `vVERSION` Git tag is pushed, GitHub Actions verifies the tag matches `system.json`, builds `leovaunt-starcraft.zip`, uploads it as a release asset, and updates the stable `channel-v13` manifest.

**Manifest URL:** `https://github.com/Yaisoula/leovaunt-starcraft-foundry/releases/download/channel-v13/system.json`

**Important:** GitHub releases from a **private repository are not directly downloadable by Foundry** using this URL. To use Foundry's built-in update check, make release assets publicly accessible (for example by making the repository public after reviewing copyright and license concerns, or by publishing sanitized release artifacts to a separate public distribution repository). Do not paste a GitHub access token into Foundry's manifest field.

Publishing a tag after merge, example: `git tag v0.1.0-alpha.1 && git push origin v0.1.0-alpha.1`. Increment the version in `system.json` and tag each subsequent version. The pipeline does not run just because source code changes.
