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

  return socials.flatMap(({ platform, name, url }) => {
    const email = url.startsWith("mailto:");
    return [
      "<li>",
      email
        ? `  <a class="flex items-center gap-1" href="${url}">`
        : `  <a class="flex items-center gap-1" href="${url}" rel="noreferrer noopener" target="_blank">`,
      `    <img class="size-4" src="assets/${platform}.svg" alt="${name}" />`,
      email
        ? `    <span>${linkText(url)}</span>`
        : `    <span class="hidden print:inline">${linkText(url)}</span>`,
      "  </a>",
      "</li>",
    ];
  });
};

const renderWins = (wins) =>
  wins.length === 0
    ? []
    : [
        '      <ul class="mt-1 list-disc space-y-0.5 pl-4 text-stone-500">',
        ...wins.map((win) => `        <li>${win}</li>`),
        "      </ul>",
      ];

const renderExperience = (employers) =>
  employers.flatMap(({ company, roles }) => [
    '<li class="print:break-inside-avoid">',
    `  <p class="mb-1 font-medium text-stone-700">${company}</p>`,
    '  <ul class="space-y-3 pl-2 text-stone-700">',
    ...roles.flatMap(({ title, start, end, wins = [] }) => [
      "    <li>",
      '      <div class="flex justify-between gap-4">',
      `        <p>${title}</p>`,
      `        <p class="shrink-0 text-stone-500">${formatDate(start)} – ${formatDate(end)}</p>`,
      "      </div>",
      ...renderWins(wins),
      "    </li>",
    ]),
    "  </ul>",
    "</li>",
  ]);

const renderSkills = (categories) =>
  categories.flatMap(({ category, groups }, index) => [
    index === 0 ? "<li data-heading>" : '<li class="pt-2" data-heading>',
    `  <p class="text-stone-500">${category}</p>`,
    "</li>",
    ...groups.flatMap(({ level, skills }) => [
      "<li>",
      '  <div class="grid grid-cols-[1fr_auto] gap-4">',
      `    <p class="text-stone-700">${skills.join(", ")}</p>`,
      ...(level
        ? [`    <p class="text-stone-500 text-right">${level}</p>`]
        : []),
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

const tagline = "Self-taught software engineer since the early 2010s.";

const plain = (html) => html.replace(/<[^>]*>/g, "").replaceAll('"', "&quot;");

const currentRole = (employers) =>
  employers
    .flatMap(({ company, roles }) =>
      roles.map(({ title, end }) => ({ company, title, end })),
    )
    .find(({ end }) => end === null);

const renderHeadline = (role) =>
  role
    ? [`<p class="text-stone-500">${role.title} at ${role.company}</p>`]
    : [];

const renderDescription = (role) => {
  const description = plain(
    role ? `${role.title} at ${role.company}. ${tagline}` : tagline,
  );
  return [
    `<meta name="description" content="${description}" />`,
    `<meta property="og:description" content="${description}" />`,
  ];
};

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

const experience = await read("data/experience.json");
const role = currentRole(experience);

let html = fill(current, "description", renderDescription(role));
html = fill(html, "headline", renderHeadline(role));
html = fill(
  html,
  "socials",
  await renderSocials(await read("data/socials.json")),
);

html = fill(html, "experience", renderExperience(experience));

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
