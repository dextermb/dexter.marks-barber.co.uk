# Content

The contact links, the experience list, the skills list, and the education list
come from JSON files in `src/data/`. `scripts/render.mjs` writes these lists
into `src/index.html` when you run `pnpm build`. Do not edit the lists in
`src/index.html`, because the next build replaces them.

## Data flow

```
src/data/socials.json ────┐
src/data/experience.json ─┤
src/data/skills.json ─────┼─▶ scripts/render.mjs ─▶ src/index.html ─▶ tailwindcss ─▶ src/styles.css
src/data/education.json ──┤
VERCEL_GIT_COMMIT_SHA ────┘
```

1. `render.mjs` finds each marker pair in `src/index.html`, for example
   `<!-- skills -->` … `<!-- /skills -->`. The markers are `socials`,
   `experience`, `skills`, `education`, and `last updated`.
2. It replaces the text between each pair with new `<li>` elements.
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

## `src/data/socials.json`

An array of links, in page order.

| Field      | Type   | Notes                                         |
| ---------- | ------ | --------------------------------------------- |
| `platform` | string | Selects the logo `src/assets/<platform>.svg`. |
| `url`      | string | The link target.                              |

The page shows each link as its logo. The `platform` value is also the `alt`
text of the logo.

## `src/data/experience.json`

An array of employers, newest first.

| Field           | Type             | Notes                                 |
| --------------- | ---------------- | ------------------------------------- |
| `company`       | string           |                                       |
| `roles`         | array            | Newest role first.                    |
| `roles[].title` | string           |                                       |
| `roles[].start` | `"YYYY-MM"`      | The page does not show this.          |
| `roles[].end`   | `"YYYY-MM"`/null | `null` shows as `Present`.            |
| `roles[].wins`  | array, string    | In page order. Optional. May be `[]`. |

The page shows one date for each employer: the `end` of the first role, for
example `May 2024`.

### Wins

A win is one result of a role, for example "Cut the deploy time from 40 min to
6 min". Write a result, not a duty. Use a number where you can. Each win is on
the role where it happened, not on the employer. Thus, a promotion shows what
changed between the two roles.

The page shows the wins as a bullet list under the role title. If a role has
no wins, the page shows only the title. Thus, you can add wins one role at a
time. A win can contain inline HTML (see [Inline HTML](#inline-html)).

## `src/data/skills.json`

An array of categories, in page order.

| Field            | Type   | Notes                                 |
| ---------------- | ------ | ------------------------------------- |
| `category`       | string | The heading above the group.          |
| `skills`         | array  | In page order.                        |
| `skills[].name`  | string | Inline HTML is permitted (see below). |
| `skills[].level` | 1 to 5 | The page shows this as `4/5`.         |

## `src/data/education.json`

An array of places, newest first.

| Field       | Type          | Notes                             |
| ----------- | ------------- | --------------------------------- |
| `place`     | string        | The school, college, or similar.  |
| `education` | array, string | Each qualification, newest first. |

## Inline HTML

`render.mjs` does not escape strings. It puts each string into the page as
HTML. Some names use this to show markup, for example
`Git<span class="font-medium">Lab</span> CI/CD`. Thus, write `&amp;` for a
literal `&` and `&lt;` for a literal `<`.
