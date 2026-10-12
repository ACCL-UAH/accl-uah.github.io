# ACCL Website

Website for the **Autonomous Cognition and Control Laboratory**, University of Alabama in Huntsville.
Live at **https://accl-uah.github.io/** (GitHub Pages).

You never need to edit HTML. Every piece of content lives in a JSON file in `data/`, and every photo, figure, or video file lives in `images/`.

---

## Which file to edit

| To change… | Edit this file |
|---|---|
| Lab text, PI info, research areas, open positions, media links, top banner | `data/site.json` |
| Funded projects | `data/projects.json` |
| Publications, plus each paper's abstract, results, figures, video | `data/publications.json` |
| Lab facilities and equipment | `data/facilities.json` |
| Courses, outreach, professional service | `data/teaching.json` |
| Group members | `data/people.json` |
| News timeline | `data/news.json` |

## How to edit on GitHub (no software needed)

1. Open the repo, click the `data` folder, then click the file (e.g. `projects.json`).
2. Click the **pencil icon** (top right of the file).
3. Make your change. Copy an existing entry and edit it to add a new one.
4. Click **Commit changes**. The site updates in about a minute.

**To upload images or a video file:** open the `images` folder → **Add file → Upload files** → drag them in → **Commit changes**. Then refer to them as `images/yourfile.png`.

### JSON rules that break the site if missed
- Text goes in **double quotes** `"like this"`.
- Entries in a list are separated by **commas**, and the **last entry has no comma** after it.
- Inside text, write a double quote as `\"` and start a new paragraph with `\n\n`.
- If the page goes blank after an edit, paste the file into https://jsonlint.com to find the mistake.

---

## Add a paper's abstract, results, figures, and video

Every publication has a detail page at `detail.html?paper=<id>`. Clicking a title in the Publications list opens it. Find the paper in `data/publications.json` and add any of these optional fields:

```json
{"id":"2023-learningbased-faulty-state-estimation-sohcoupled","type":"journal","year":2023,
 "authors":"G. Vennam, A. Sahoo",
 "title":"Learning-based faulty state estimation ...",
 "venue":"IEEE Transactions on Transportation Electrification",
 "link":"https://doi.org/10.1109/TTE.2023.3278305",

 "abstract": "First paragraph of the abstract.\n\nSecond paragraph.",
 "highlights": ["Contribution one", "Contribution two"],
 "results": "Short description of the main results.",
 "figures": [
   {"src": "images/tte2023-fig1.png", "caption": "Fig. 1. Estimated vs. measured core temperature."},
   {"src": "images/tte2023-fig2.png", "caption": "Fig. 2. Fault detection under internal short."}
 ],
 "video": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
 "pdf": "images/tte2023.pdf",
 "code": "https://github.com/ACCL-UAH/your-code-repo",
 "slides": "",
 "dataset": ""
}
```

- **video** accepts a YouTube, Vimeo, or Google Drive link, or a file you uploaded (`images/demo.mp4`, keep under ~50 MB). For several videos use a list: `"video": [{"url":"...","caption":"Simulation"},{"url":"...","caption":"Hardware test"}]`.
- Papers with an abstract, figures, or video get **Abstract / Results / ▶ Video** badges in the list automatically.
- A BibTeX citation and the "Funded by" project box are generated for you.

**New paper:** copy any entry, give it a new unique `id` (lowercase, dashes, e.g. `"2026-safe-rl-inspection"`), and fill in the fields. `type` is one of `book`, `chapter`, `journal`, `conference`, `abstract`. Optional `status`: `"Accepted"`, `"Under review"`, `"Submitted"`.

---

## Projects (`data/projects.json`)

Each project gets a card on the home page and its own page at `detail.html?project=<id>`.

```json
{
  "id": "cps-vulnerability",
  "status": "current",                 // or "completed"
  "area": "control",                   // control | ai | energy | education | sensing
  "title": "...",
  "sponsor": "National Science Foundation (NSF)",
  "award": "Award #2337999",
  "awardLinks": ["https://www.nsf.gov/awardsearch/showAward?AWD_ID=2337999"],
  "amount": "$300,000",                // optional
  "period": "2024 – 2027",
  "role": "PI",                        // optional
  "collaborators": ["Name, Institution"],
  "team": ["Md. Sazzad Hossen", "Timothy Morgan"],   // optional
  "summary": "One-paragraph overview.",
  "description": "Optional longer text.\n\nMore paragraphs.",
  "objectives": ["...", "..."],
  "highlights": ["..."],
  "results": "Optional results text.",
  "figures": [{"src": "images/...png", "caption": "..."}],
  "images": [{"src": "images/...jpg", "caption": "..."}],   // first image becomes the card photo
  "video": "https://www.youtube.com/watch?v=...",
  "publications": ["2025-realpinn-physicsinformed-neural-network-realtime"],  // paper ids
  "links": [{"label": "News story", "url": "https://..."}]
}
```
(The `//` notes are explanations only. Don't type them into the real file.)

To link a paper to a project, put the paper's `id` (from `publications.json`) in the project's `publications` list. It then appears on both pages.

## Facilities (`data/facilities.json`)

Each lab has `name`, `room`, `size`, `summary`, `images`, optional `video`, and an `equipment` list. Each equipment item has `name`, a `specs` list, an optional `"image": "images/arbin.jpg"`, and an optional `"status": "Under development"`. Lab pages are at `detail.html?facility=<id>`.

## Teaching (`data/teaching.json`)

`courses` entries: `code`, `title`, `institution`, `level`, `terms` (e.g. `["Fall 2025", "Spring 2026"]`), `description`, `project`, `link` (syllabus or course page). Courses are grouped into tabs by `institution` automatically. `outreach` and `service` are simple lists shown beside the courses.

## People photos

Upload a square photo (about 400×400) to `images/`, then set `"photo": "images/sahoo.jpg"` on that person in `people.json` (or on `pi` in `site.json`).

---

## Preview locally (optional)
Browsers block loading JSON from a file opened directly, so run a small server in this folder:
```
python3 -m http.server 8000
```
then open http://localhost:8000.
