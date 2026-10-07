# Content

The contact links, the headline, the experience list, the projects list, the
skills list, and the education list come from JSON files in `src/data/`.
`scripts/render.mjs` writes these lists into `src/index.html` when you run
`pnpm build`. Do not edit the lists in
`src/index.html`, because the next build replaces them.

## Data flow

```
src/data/socials.json ────┐
src/data/experience.json ─┤
src/data/projects.json ───┤
src/data/skills.json ─────┼─▶ scripts/render.mjs ─▶ src/index.html ─▶ tailwindcss ─▶ src/styles.css
src/data/education.json ──┤
VERCEL_GIT_COMMIT_SHA ────┘
```

1. `render.mjs` finds each marker pair in `src/index.html`, for example
   `<!-- skills -->` … `<!-- /skills -->`. The markers are `description`,
   `headline`, `socials`, `experience`, `projects`, `skills`, `education`,
   and `last updated`.
2. It replaces the text between each pair with new elements.
3. Tailwind then reads `src/index.html` and writes `src/styles.css`.

The render step must run before Tailwind. Tailwind generates CSS only for the
classes that it finds, and some classes are only in the JSON data.

The build stops with an error in these conditions:

- A marker pair is missing from `src/index.html`.
- A `platform` in `socials.json` has no logo in `src/assets/`.

The output of `render.mjs` does not change when the data does not change. Thus,
the committed `src/index.html` always agrees with the JSON files after a build.
If the output is the same as the current file, `render.mjs` does not write it.

## Last updated

The footer shows the date and the short hash of the deployed commit, for
example `Last updated 3 days ago · 24063f2`.

`render.mjs` fills the `last updated` block only when `VERCEL_GIT_COMMIT_SHA`
is set. Vercel sets this variable in each build. A local build and the
pre-commit hook leave the block empty. This is necessary because a pre-commit
hook cannot know the hash of its own commit: Git calculates the hash after the
hook. Thus, the committed `src/index.html` always has an empty block.

The date is the commit date from `git log`. If the build has no Git history,
the date is the build time.

`render.mjs` writes an absolute date in a `<time datetime>` element. A static
script at the end of `src/index.html` changes each `<time>` into relative text
with `Intl.RelativeTimeFormat`. The absolute date stays in the `title`
attribute. A text that the build writes, such as "3 days ago", is wrong on the
next day, so the browser must calculate it. Without JavaScript, the reader sees
the absolute date.

To see the footer locally, run:

```sh
VERCEL_GIT_COMMIT_SHA=$(git rev-parse HEAD) pnpm build
```

The pre-commit hook builds again without the variable, so the block is empty
in the commit.

## Pre-commit hook

`.githooks/pre-commit` runs `pnpm build` before each commit. Then it adds
`src/index.html` to the commit. Thus, a commit that changes a JSON file also
contains the new lists in `src/index.html`. If the build fails, Git stops the
commit.

`pnpm install` runs the `prepare` script, which sets `core.hooksPath` to
`.githooks`. Git does not copy hooks with a clone, so each clone needs this
step.

The hook adds all of `src/index.html`, which includes changes that you did not
stage. `src/styles.css` is in `.gitignore`, so the hook does not add it.

## Watch mode

`pnpm watch` runs two watchers in parallel:

- `watch:html` runs `render.mjs` again when a file in `src/` or `scripts/`
  changes.
- `watch:css` runs Tailwind again when `src/index.html` changes.

`watch:html` watches directories, not single files. Many editors save a file
as a new file with the same name. Node stops watching a single file after the
first save of this type, but a watch on a directory continues.

`src/index.html` is in `src/`, so each render starts one more render. This
second render makes the same HTML and does not write it, so the loop stops.

## Print and PDF

The page has no separate PDF file. The "Save as PDF" button opens the print
dialog of the browser, and the reader saves the page from there. Thus, the
PDF always agrees with the page.

The print styles are the `print:` classes in `src/index.html` and
`render.mjs`, and the `@media print` block in `src/tailwind.css`:

- The page is A4, with a 15 mm margin.
- The button and the footer do not print.
- The content uses the full page width.
- Each employer stays on one page, so a company name is never alone at the
  bottom of a page.

To see the PDF without the dialog, run:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --no-pdf-header-footer --print-to-pdf=/tmp/cv.pdf "file://$PWD/src/index.html"
```

## `src/data/socials.json`

An array of links, in page order.

| Field      | Type   | Notes                                         |
| ---------- | ------ | --------------------------------------------- |
| `platform` | string | Selects the logo `src/assets/<platform>.svg`. |
| `name`     | string | The `alt` text of the logo, e.g. `GitHub`.    |
| `url`      | string | The link target. `mailto:` is permitted.      |

The page shows each link as its logo. The email link also shows its address on
screen, so a reader can copy it without a click.

A web link opens in a new tab. A `mailto:` link does not, because a new tab
for an email link stays empty in some browsers.

A printed page cannot use a logo as a link. Thus, in print, each web logo
also shows its URL without the `https://` or `mailto:` prefix, for example
`github.com/dextermb`.

## `src/data/experience.json`

An array of employers, newest first.

| Field           | Type             | Notes                                 |
| --------------- | ---------------- | ------------------------------------- |
| `company`       | string           |                                       |
| `roles`         | array            | Newest role first.                    |
| `roles[].title` | string           |                                       |
| `roles[].start` | `"YYYY-MM"`      |                                       |
| `roles[].end`   | `"YYYY-MM"`/null | `null` shows as `Present`.            |
| `roles[].wins`  | array, string    | In page order. Optional. May be `[]`. |

The page shows a date range for each role, for example `May 2024 – Mar 2026`.
It shows no date for the employer. Thus, a reader sees each promotion at an
employer as a new range.

### Wins

A win is one result of a role, for example "Cut the deploy time from 40 min to
6 min". Write a result, not a duty. Use a number where you can. Each win is on
the role where it happened, not on the employer. Thus, a promotion shows what
changed between the two roles.

The page shows the wins as a bullet list under the role title. If a role has
no wins, the page shows only the title. Thus, you can add wins one role at a
time. A win can contain inline HTML (see [Inline HTML](#inline-html)).

### Headline and description

The current role is the first role with `"end": null`, in file order. The page
shows it under your name, for example `Software Engineering Manager at Veson
Nautical`. The `description` and `og:description` meta tags start with the
same text, then add the tagline from `render.mjs`.

A marker comment cannot go inside an attribute. Thus, the `description` block
holds both `<meta>` elements, not only their text. `render.mjs` removes inline
HTML from the meta text, because a tag in an attribute shows as text.

If no role has `"end": null`, the page shows no headline, and the description
is only the tagline.

## `src/data/projects.json`

An array of projects, in page order.

| Field         | Type          | Notes                                       |
| ------------- | ------------- | ------------------------------------------- |
| `name`        | string        | The link text.                              |
| `url`         | string        | Optional. The live site or the public repo. |
| `private`     | boolean       | Optional. Shows `· Private source`.         |
| `year`        | number/string | On the right. A range, e.g. `2019 – 2021`.  |
| `description` | string        | One line. Inline HTML is permitted.         |
| `stack`       | array, string | Optional. Shows as a comma list.            |
| `parts`       | array         | Optional. Bullets under the description.    |
| `parts[].url` | string        | The link. Its text is the URL, shortened.   |
| `parts[].description` | string | Follows the link, after a dash.        |

Use `parts` to keep related repositories in one entry, for example each
service of `099.io`, so the section stays short. A part shows its URL as its
link text, so the URL also shows in print.

A private project links to its live site, if it has one, and never to its
repository. The label tells the reader why there is no repository link.

In print, the URL shows after the name, without the `https://` or `www.`
prefix. If this text is the same as the name, for example `needl.ee`, it does
not show.

## `src/data/skills.json`

An array of categories, in page order.

| Field             | Type          | Notes                                 |
| ----------------- | ------------- | ------------------------------------- |
| `category`        | string        | The heading above the groups.         |
| `groups`          | array         | In page order.                        |
| `groups[].level`  | string        | Optional, e.g. `Expert`.              |
| `groups[].skills` | array, string | In page order. Inline HTML permitted. |

The page shows each group as one row: the skills as a comma list on the left,
and the level on the right. A group with no `level` shows only the skills. Use
this for a category where a level does not apply, such as `Management`.

The page shows a level as a word, not a number. A number such as `5/5` invites
a challenge in an interview, and a low number points the reader at a weakness.

## `src/data/education.json`

An array of places, newest first.

| Field       | Type          | Notes                             |
| ----------- | ------------- | --------------------------------- |
| `place`     | string        | The school, college, or similar.  |
| `education` | array, string | Each qualification, newest first. |

## Inline HTML

`render.mjs` does not escape strings. It puts each string into the page as
HTML. Thus, a string can contain markup such as
`<span class="font-medium">…</span>`. Also, write `&amp;` for a
literal `&` and `&lt;` for a literal `<`.
