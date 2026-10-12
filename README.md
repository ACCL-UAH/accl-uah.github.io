# ACCL Website

Website for the **Autonomous Cognition and Control Laboratory** (University of Alabama in Huntsville), built for GitHub Pages.

The site is a single page whose content is loaded at runtime from JSON files, so you update the site by editing data, not HTML.

## Features
- Animated "networked control" hero with live stats computed from your data
- Research area tabs that automatically pull related publications
- Publications: live search with highlighting, filter by type and year, clickable per-year chart
- People: current members / alumni tabs (initials avatars until you add photos)
- News timeline with category filters, plus a media coverage list
- Open positions, contact card with map, dark mode, mobile menu

## Publish on GitHub Pages
1. Create a repository on GitHub, e.g. `accl` (or `<your-username>.github.io` for a root URL).
2. Upload everything in this folder to the repository root (drag-and-drop on github.com works, or `git push`).
3. Go to **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/accl/`.

## Updating content
| To change… | Edit |
|---|---|
| Lab text, PI info, research areas, positions, media links, top banner | `data/site.json` |
| Group members | `data/people.json` (`group`: `"current"` or `"alumni"`) |
| Publications | `data/publications.json` (`type`: `book`, `chapter`, `journal`, `conference`, `abstract`; optional `status`, `link`) |
| News | `data/news.json` (`date` as `YYYY-MM`; `tag`: Funding, Paper, Talk, People, Service, Media) |

Add a new paper by copying any entry and changing the fields. New items appear automatically, and the stats and charts update themselves. Remove the `announcement` block in `site.json` to hide the top banner.

### Photos
Put images in `images/` (e.g. `images/sahoo.jpg`) and set `"photo": "images/sahoo.jpg"` on that person (or on `pi` in `site.json`). Square images around 400×400 look best.

## Preview locally
Browsers block loading JSON from `file://`, so run a tiny server from this folder:
```
python3 -m http.server 8000
```
then open http://localhost:8000.
