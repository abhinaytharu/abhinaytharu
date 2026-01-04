import { graphql } from "@octokit/graphql";
import { config } from "dotenv";
import fs from "fs/promises";
import path from "path";

config();

const USERNAME = "abhinaytharu";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!TOKEN) {
    console.error("Error: GH_TOKEN or GITHUB_TOKEN is not defined in environment variables.");
    process.exit(1);
}

const ghql = graphql.defaults({
    headers: {
        authorization: `token ${TOKEN}`,
    },
});

const query = `
  query userInfo($login: String!) {
    user(login: $login) {
      name
      login
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
      }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
        totalCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      issues(first: 1) {
        totalCount
      }
      followers {
        totalCount
      }
      repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}, isFork: false) {
        totalCount
        nodes {
          name
          stargazers {
            totalCount
          }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              size
              node {
                color
                name
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchStats() {
    console.log(`Fetching stats for ${USERNAME}...`);
    try {
        const data = await ghql(query, { login: USERNAME });
        return data.user;
    } catch (error) {
        console.error("Error fetching data from GitHub API:", error);
        process.exit(1);
    }
}

function processStats(user) {
    const stats = {
        name: user.name || user.login,
        totalRepos: user.repositories.totalCount,
        totalCommits: user.contributionsCollection.totalCommitContributions + user.contributionsCollection.restrictedContributionsCount,
        totalStars: user.repositories.nodes.reduce((acc, repo) => acc + repo.stargazers.totalCount, 0),
        totalFollowers: user.followers.totalCount,
        totalPRs: user.pullRequests.totalCount,
        totalIssues: user.issues.totalCount,
        languages: {},
    };

    // Process Languages
    let totalSize = 0;
    user.repositories.nodes.forEach((repo) => {
        repo.languages.edges.forEach((edge) => {
            const { size, node } = edge;
            const { name, color } = node;
            if (!stats.languages[name]) {
                stats.languages[name] = { size: 0, color };
            }
            stats.languages[name].size += size;
            totalSize += size;
        });
    });

    // Calculate percentages
    const languagesArray = Object.entries(stats.languages)
        .map(([name, data]) => ({
            name,
            color: data.color,
            percentage: (data.size / totalSize) * 100,
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 6); // Top 6 languages

    stats.topLanguages = languagesArray;
    return stats;
}

function generateStatsSVG(stats) {
    const width = 450;
    const height = 180; // Compact height

    // Clean Aesthetic Styles with Light/Dark Mode Support
    const css = `
    .header { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: #E4E2E2; }
    .stat { font: 400 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #949494; }
    .stat-bold { font: 700 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #E4E2E2; }
    .icon { fill: #58A6FF; }
    .card-bg { fill: #161B22; stroke: #30363D; stroke-width: 1px; rx: 10px; }

    @media (prefers-color-scheme: light) {
      .header { fill: #24292f; }
      .stat { fill: #57606a; }
      .stat-bold { fill: #24292f; }
      .icon { fill: #0969da; }
      .card-bg { fill: #ffffff; stroke: #e1e4e8; }
    }
  `;

    // Icons (Simple Paths)
    const icons = {
        star: `<path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>`,
        commit: `<path d="M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z"/>`,
        repo: `<path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>`,
    };

    return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>${css}</style>
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" class="card-bg"/>
      
      <text x="25" y="35" class="header">${stats.name}'s GitHub Stats</text>

      <g transform="translate(25, 65)">
        <svg class="icon" x="0" y="0" width="16" height="16" viewBox="0 0 16 16">${icons.star}</svg>
        <text x="25" y="12" class="stat">Total Stars:</text>
        <text x="130" y="12" class="stat-bold">${stats.totalStars}</text>
      </g>

      <g transform="translate(25, 95)">
        <svg class="icon" x="0" y="0" width="16" height="16" viewBox="0 0 16 16">${icons.commit}</svg>
        <text x="25" y="12" class="stat">Total Commits:</text>
        <text x="130" y="12" class="stat-bold">${stats.totalCommits}</text>
      </g>

      <g transform="translate(25, 125)">
        <svg class="icon" x="0" y="0" width="16" height="16" viewBox="0 0 16 16">${icons.repo}</svg>
        <text x="25" y="12" class="stat">Repositories:</text>
        <text x="130" y="12" class="stat-bold">${stats.totalRepos}</text>
      </g>
      
      <!-- Right Side: Languages ? (Maybe separate card or compact right side) -->
    </svg>
  `;
}

function generateLanguageSVG(stats) {
    const width = 350;
    const height = 180;

    const css = `
    .header { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: #E4E2E2; }
    .lang-name { font: 400 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: #E4E2E2; }
    .card-bg { fill: #161B22; stroke: #30363D; stroke-width: 1px; rx: 10px; }

    @media (prefers-color-scheme: light) {
      .header { fill: #24292f; }
      .lang-name { fill: #24292f; }
      .card-bg { fill: #ffffff; stroke: #e1e4e8; }
    }
  `;

    let langItems = "";
    let y = 65;
    stats.topLanguages.forEach((lang) => {
        langItems += `
      <g transform="translate(25, ${y})">
        <circle cx="5" cy="6" r="5" fill="${lang.color}" />
        <text x="20" y="10" class="lang-name">${lang.name} (${lang.percentage.toFixed(1)}%)</text>
      </g>
    `;
        y += 25;
    });

    return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>${css}</style>
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" class="card-bg"/>
      <text x="25" y="35" class="header">Most Used Languages</text>
      ${langItems}
    </svg>
  `;
}

async function main() {
    const user = await fetchStats();
    const stats = processStats(user);

    const svgContent = generateStatsSVG(stats);
    const langSvgContent = generateLanguageSVG(stats);

    const generatedDir = path.join(process.cwd(), "generated");
    await fs.mkdir(generatedDir, { recursive: true });

    await fs.writeFile(path.join(generatedDir, "stats.svg"), svgContent);
    await fs.writeFile(path.join(generatedDir, "languages.svg"), langSvgContent);

    console.log("Stats generated successfully!");
}

main();
