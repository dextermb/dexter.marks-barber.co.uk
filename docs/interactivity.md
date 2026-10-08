# Interactivity

The page uses [htmx](https://htmx.org) for small interactions. The page has no
server, so it does not use the htmx requests. It uses the `hx-on` attributes
and the `htmx` helper functions only.

## Bundle

`htmx.org` is a dependency in `package.json`. `pnpm build` copies
`node_modules/htmx.org/dist/htmx.min.js` into `src/`, and `src/index.html`
loads it with a `defer` script in the `<head>`. Thus, the page loads htmx from
the same site as the page, not from a CDN.

`src/htmx.min.js` is in `.gitignore`, the same as `src/styles.css`. Vercel
runs `pnpm build`, so each deployment copies the file again. `pnpm watch` does
not copy it. Run `pnpm build` one time before `pnpm watch` on a new clone.

To change the htmx version, change `htmx.org` in `package.json`, then run
`pnpm install` and `pnpm build`.

## Expand

On first load, the page shows only the introduction, the contact links, and
two buttons. The "Expand" button (`#expand-button`) shows the other sections.
A second click hides them again.

An element takes part when it has a `data-expanded` attribute:

| Attribute             | Value               | Notes                                    |
| --------------------- | ------------------- | ---------------------------------------- |
| `data-expanded`       | `"true"`/`"false"`  | The current state. Start with `"false"`. |
| `data-expanded-class` | a class, e.g. `flex` | Optional. The default is `block`.       |

Each click on `#expand-button` does these steps on each element:

1. It changes `data-expanded` from `"false"` to `"true"`, or the opposite.
2. It toggles the `hidden` class.
3. It toggles the class in `data-expanded-class`, or `block`.

The click toggles the two classes. It does not set them from
`data-expanded`. Thus, an element must start with `hidden` and without its
display class, for example:

```html
<section class="hidden space-y-3" data-expanded="false">…</section>
<button class="hidden items-center" data-expanded="false" data-expanded-class="flex">…</button>
```

The button keeps its own state in `aria-expanded`, not in `data-expanded`. An
element with `data-expanded` starts hidden, but the button must always show.
Each click flips `aria-expanded`, and the `group-aria-expanded:` classes on
the icons and the labels then show `collapse.svg` and "Collapse" in place of
`expand.svg` and "Expand". A screen reader also reads `aria-expanded`, so it
tells the reader the current state.

Use `data-expanded-class` when the element needs a display other than
`block`, for example the "Save as PDF" button, which is a flex row.

Tailwind must find the display class in `src/index.html`. A class name that is
only in a `data-expanded-class` value is in the HTML, so Tailwind finds it.

## Print

Each section that "Expand" controls also has `print:block`. Thus, the PDF
contains all of the sections, also when a reader prints from the browser menu
before "Expand". See [Print and PDF](content.md#print-and-pdf).
