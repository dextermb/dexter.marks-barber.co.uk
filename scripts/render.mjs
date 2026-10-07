import { access, readFile, writeFile } from "node:fs/promises";

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

const indent = (lines, depth) => lines.map((line) => " ".repeat(depth) + line);

const renderSocials = async (socials) => {
  for (const { platform } of socials)
    await access(new URL(`assets/${platform}.svg`, src)).catch(() => {
      throw new Error(`src/assets has no ${platform}.svg`);
    });

  return socials.flatMap(({ platform, url }) => [
    "<li>",
    `  <a href="${url}" rel="noreferrer noopener" target="_blank">`,
    `    <img class="size-4" src="assets/${platform}.svg" alt="${platform}" />`,
    "  </a>",
    "</li>",
  ]);
};

const renderExperience = (employers) =>
  employers.flatMap(({ company, roles }) => [
    "<li>",
    '  <div class="flex items-center justify-between gap-4">',
    `    <p class="text-stone-700">${company}</p>`,
    `    <p class="text-stone-300">${formatDate(roles[0].end)}</p>`,
    "  </div>",
    '  <ul class="pl-2 text-stone-500">',
    ...roles.flatMap(({ title }) => [
      "    <li>",
      `      <p>${title}</p>`,
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

if (html !== current) await writeFile(page, html);
