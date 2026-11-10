# Project rules — NEON LABYRINTH

## Current product
- Single-player browser RPG in vanilla JavaScript, Canvas, CSS and SVG.
- No runtime packages, accounts, paid APIs, or external game services are required.
- Preserve the existing playable game and its local-save behavior.
- Exploration reveals fog only during algorithm movement. Manual WASD/arrow movement is limited to explored floor and costs no HP.
- First algorithm entry into a tile costs HP once; repeat traversal is free. Exhaustion never kills or heals a player below 10 HP.
- Preserve enemy intent announcements, relic effects and the common combat model used by Minimax.

## Product direction
- Proposed next campaign: Last Route / Последний маршрут. Train hub, districts, rescue expeditions and anchored routes.
- This campaign is a design proposal. Do not implement it solely because this file mentions it; implement the user's current authorized task.
- Maintain three distinct AI topics: path search, backtracking CSP placement, adversarial Minimax with Alpha-Beta.

## Development
- Read README.md and the relevant implementation before changing behavior.
- Make focused, reversible changes. Do not rewrite the engine or add a framework without a concrete task need.
- Never expose credentials, personal files or local saves in source or deployment assets.
- Add meaningful regression tests for changed game rules. Update documentation when rules change.
- Run: node --test tests.mjs gameplay-tests.mjs mechanics-tests.mjs
- Run syntax checks for edited JavaScript. Use browser verification for UI changes when available.
- Preserve existing saves or explicitly version and migrate them. Developer actions must remain marked and reversible through the checkpoint.

## Publishing
- GitHub remote: https://github.com/adilk08/aif_final.git
- GitHub stores source and runs tests. Pushing to GitHub does not deploy the public game.
- The Sites publication is managed separately in public-site/.openai/hosting.json; consult PUBLIC_SITE.md and the Sites skill.
- Never create another Site for this game when its existing project_id is available.
- Only runtime HTML/CSS/JS, favicon and assets belong in the hosted static directory.
