import { execFile } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const src = new URL("../src/", import.meta.url);
const read = async (name) =>
  JSON.parse(await readFile(new URL(name, src), "utf8"));

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDate = (date) => {
  if (!date) return "Present";
  const [year, month] = date.split("-");
  return `${months[month - 1]} ${year}`;
};

const formatDay = (iso) => {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${Number(day)} ${months[month - 1]} ${year}`;
};

const run = promisify(execFile);

const commitDate = (sha) =>
  run("git", ["log", "-1", "--format=%cI", sha])
    .then(({ stdout }) => stdout.trim())
    .catch(() => new Date().toISOString());

const indent = (lines, depth) => lines.map((line) => " ".repeat(depth) + line);

const linkText = (url) => url.replace(/^(mailto:|https?:\/\/)/, "");

const renderSocials = async (socials) => {
  for (const { platform } of socials)
    await access(new URL(`assets/${platform}.svg`, src)).catch(() => {
      throw new Error(`src/assets has no ${platform}.svg`);
    });

  return socials.flatMap(({ platform, url }) => [
    "<li>",
    url.startsWith("mailto:")
      ? `  <a class="flex items-center gap-1" href="${url}">`
      : `  <a class="flex items-center gap-1" href="${url}" rel="noreferrer noopener" target="_blank">`,
    `    <img class="size-4" src="assets/${platform}.svg" alt="${platform}" />`,
    `    <span class="hidden print:inline">${linkText(url)}</span>`,
    "  </a>",
    "</li>",
  ]);
};

const renderWins = (wins) =>
  wins.length === 0
    ? []
    : [
        '      <ul class="list-disc pl-4 text-stone-400">',
        ...wins.map((win) => `        <li>${win}</li>`),
        "      </ul>",
      ];

const renderExperience = (employers) =>
  employers.flatMap(({ company, roles }) => [
    '<li class="print:break-inside-avoid">',
    `  <p class="text-stone-700">${company}</p>`,
    '  <ul class="pl-2 text-stone-500">',
    ...roles.flatMap(({ title, start, end, wins = [] }) => [
      "    <li>",
      '      <div class="flex justify-between gap-4">',
      `        <p>${title}</p>`,
      `        <p class="shrink-0 text-stone-300">${formatDate(start)} – ${formatDate(end)}</p>`,
      "      </div>",
      ...renderWins(wins),
      "    </li>",
    ]),
    "  </ul>",
    "</li>",
  ]);

const renderSkills = (categories) =>
  categories.flatMap(({ category, skills }, index) => [
    index === 0 ? "<li data-heading>" : '<li class="pt-2" data-heading>',
    `  <p class="text-stone-300">${category}</p>`,
    "</li>",
    ...skills.flatMap(({ name, level }) => [
      "<li>",
      '  <div class="grid grid-cols-2 gap-4">',
      `    <p class="text-stone-700">${name}</p>`,
      `    <p class="text-stone-300 text-right">${level}/5</p>`,
      "  </div>",
      "</li>",
    ]),
  ]);

const renderEducation = (places) =>
  places.flatMap(({ place, education }) => [
    "<li>",
    `  <p class="text-stone-700">${place}</p>`,
    '  <ul class="pl-2 text-stone-500">',
    ...education.flatMap((title) => [
      "    <li>",
      `      <p>${title}</p>`,
      "    </li>",
    ]),
    "  </ul>",
    "</li>",
  ]);

const renderLastUpdated = async (sha) => {
  if (!sha) return [];
  const date = await commitDate(sha);
  return [
    "<p>",
    "  Last updated",
    `  <time datetime="${date}">${formatDay(date)}</time>`,
    `  · <code class="font-geist-mono">${sha.slice(0, 7)}</code>`,
    "</p>",
  ];
};

const fill = (html, marker, lines) => {
  const pattern = new RegExp(
    `^( *)<!-- ${marker} -->\\n[\\s\\S]*?^ *<!-- /${marker} -->$`,
    "m",
  );
  if (!pattern.test(html))
    throw new Error(`index.html has no <!-- ${marker} --> block`);
  return html.replace(pattern, (_, pad) =>
    [
      `${pad}<!-- ${marker} -->`,
      ...indent(lines, pad.length),
      `${pad}<!-- /${marker} -->`,
    ].join("\n"),
  );
};

const page = new URL("index.html", src);
const current = await readFile(page, "utf8");

let html = fill(
  current,
  "socials",
  await renderSocials(await read("data/socials.json")),
);

html = fill(
  html,
  "experience",
  renderExperience(await read("data/experience.json")),
);

html = fill(html, "skills", renderSkills(await read("data/skills.json")));
html = fill(
  html,
  "education",
  renderEducation(await read("data/education.json")),
);
html = fill(
  html,
  "last updated",
  await renderLastUpdated(process.env.VERCEL_GIT_COMMIT_SHA),
);

if (html !== current) await writeFile(page, html);
