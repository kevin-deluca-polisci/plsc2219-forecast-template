# 2026 Forecast Site Template

This template turns your `forecast.csv` into a public forecast website: a topline, a Senate map, a House map, a seat distribution, and a table of the closest races. Setup is done on github.com: upload your CSV files and edit one settings file.

The page shows whatever your files support:

| Your files | What the site shows |
|---|---|
| `forecast.csv` with `race_id`, `pred_dem_share` (preliminary forecast) | Projected seats, margins, ratings from fixed margin cutoffs, and a seat range from **default uncertainty** |
| plus `p_dem_win`, `lo_80`, `hi_80` (final forecast) | Your win probabilities and 80% ranges, ratings from probabilities, and a seat range that combines your probabilities with a default national swing |
| plus `seat_sims.csv` | Your own seat ranges, chance of a majority, and histograms |

These are the same files you submit, in the same format. Run `check_forecast()` on them first.

## Anonymity

Your site is public. Use a forecaster nickname, and leave off anything that identifies you, such as your name, photo, email or hometown.

Your GitHub username appears in the site address (`username.github.io/...`). If your username is your real name and you want to stay anonymous, create a new free GitHub account with a neutral username and use that one for this site. Also turn on **Settings → Emails → Keep my email addresses private** to keep your email out of the repository history.

## Setup (about 10 minutes)

1. **Sign in to GitHub** (or create a free account at github.com).
2. **Copy the template.** On the template's GitHub page, click the green **Use this template** button, then **Create a new repository**. Give it a name, for example `forecast-2026`. Choose **Public**. Click **Create repository**.
3. **Turn on GitHub Pages.** In your new repository, go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose the branch **main** and the folder **/ (root)**, and click **Save**. After a minute or two, the Pages screen shows your site's address: `https://yourusername.github.io/forecast-2026/`.
4. **Open your site.** Your site address is the one on the Settings → Pages screen, for example `https://yourname.github.io/forecast-2026/`. Bookmark it: it's the URL you give in HW7 and in the gallery form. The site will say "No forecast yet." To see what it will look like with data, add `?demo=prelim`, `?demo=probs` or `?demo=final` to the end of the address. These previews use the class model's numbers.

## Adding Your Forecast

1. In your repository, click **Add file → Upload files**.
2. Drag in your `forecast.csv`. Later, when you have it, also upload `seat_sims.csv`. The file names must be exactly these, in the top level of the repository.
3. Click **Commit changes**.
4. Wait a minute or two, then reload your site. If the page looks the same, do a hard refresh (Ctrl+Shift+R, or Cmd+Shift+R on a Mac).

To update your forecast later, upload the new file the same way. It replaces the old one.

If your file has a problem (a missing race, percentages instead of proportions, a misspelled `race_id`), a yellow box at the top of your site lists it. Fix the file and upload it again.

## Site Name and Model Description

Every site describes its own model, in the student's own words. Until you write yours, your site shows a "Describe your model here" box.

1. Open `config.js` in your repository and click the pencil icon to edit it.
2. Fill in `forecaster_name` (a nickname) and, if you like, a one-line `tagline`.
3. Under `method`, write two or three short paragraphs in plain language: what your forecast is built from, how you set the national environment, and how you handled uncertainty. Each paragraph goes between its own pair of quotation marks, with a comma after the closing quotation mark. The file includes a description of the class model as an example of length and tone; describe your own model.
4. Click **Commit changes**.

The `links` section is already filled in.

If the page goes blank after you edit `config.js`, you probably deleted a quotation mark or a comma. Open the file's history (the clock icon), compare against the earlier version, and fix the line you changed.

## The Gallery (Optional)

The gallery compares listed forecasts with the class model: each forecaster's seat projections, chances of a majority, and the races where forecasters disagree most. It reads the numbers from your site, so it shows your latest upload, under your nickname, until the deadline. At 11:59 pm Eastern on Sunday, November 1 the gallery freezes and keeps what your site showed at that moment. Being listed is optional. If you want to be included, email Prof. DeLuca your site address and the nickname you want displayed. You can ask to be removed at any time.

## Files to Leave As Is

- `data/` holds the course race file, which the site matches to your `race_id`s.
- `assets/` holds the code that draws the page. Customizing it is optional; keep a working copy first.
- `examples/` holds the class model's numbers for the `?demo=` previews.

## How the Page Reads Your Numbers

- **Democratic side.** As in the race file, "D side" means the Democratic candidate or the independent running in the Democratic slot (for example, Dan Osborn in Nebraska). Seat counts on the page are D-side seats, the same way your `seat_sims.csv` counts them.
- **Margin** is the predicted Democratic share minus the Republican share, in points: `pred_dem_share` of 0.53 is D +6.
- **Ratings, preliminary forecast:** toss-up under 3 points, lean 3 to 8, likely 8 to 15, safe 15 or more.
- **Ratings, final forecast:** by the favorite's win probability: toss-up under 60%, lean 60 to 80%, likely 80 to 95%, safe 95% or more.
- **Hatched squares** are races fixed by the race file. They always use `fixed_prediction`.
- **Default uncertainty.** Until you upload your own `seat_sims.csv`, the seat ranges and the chance of a majority use the class model's error sizes: a national error shared by every race (about 1.7 points in the House, 1.3 in the Senate) and a race-specific error (about 4.0 and 5.9 points). If you have uploaded `p_dem_win`, the page keeps your probabilities and uses the default only to make races move together. These numbers are marked "default uncertainty" on your site. Your model's own uncertainty is HW7.
- **Senate control** takes 51 seats, since the vice president breaks 50-50 ties for the Republicans. The page adds the 34 Democratic seats not up in 2026. Your `senate_dem_seats` should already include them, as the assignment requires; if your file counts only the 35 seats up this year, the page adds the 34 for you and shows a blue note, but fix the file before you submit it on Canvas.
