# CLAUDE.md — map-cam-spot-scan

## Sau mỗi task hoàn thành

1. **Bump version** trong `apps/frontend/package.json` (tăng patch: 2.x.y → 2.x.y+1)
2. **Build** để kiểm tra: `npm run build --workspace=apps/frontend`
3. **Commit** lên branch hiện tại (`claude/brave-cerf-DIuGV`)
4. **Merge vào `main`** và push để deploy:
   ```
   git checkout main
   git merge claude/brave-cerf-DIuGV --no-ff -m "chore: merge feature into main"
   git push -u origin main
   git checkout claude/brave-cerf-DIuGV
   ```

## Branch setup

- Feature branch: `claude/brave-cerf-DIuGV`
- Deploy branch: `main`

## Stack

- React 18 + Vite 5 SPA, HashRouter
- Zustand v4, MapLibre GL, Overpass API
- IndexedDB `cam-scan-db` v3
- Block system: B01–B13 + B07-S (config: `src/config/blocks.js`)
