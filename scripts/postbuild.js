import fs from "fs/promises";
import path from "path";
import { Blob } from "buffer";
import { exec } from "child_process";

const INCLUDE_REGEX = /^include\s(\S+)/;

async function explodeTabeName(tables, name) {
  const tableList = [name];
  const visited = new Set();

  while (tableList.length > 0) {
    const tableName = tableList.pop();
    if (visited.has(tableName)) {
      continue;
    }

    visited.add(tableName);

    const tableEntry = (await tables.loadTables([tableName]))[0];

    const decoder = new TextDecoder();
    const tableText = decoder.decode(tableEntry.data);
    const lines = tableText.split("\n");

    for (const line of lines) {
      const match = line.match(INCLUDE_REGEX);
      if (!match) {
        continue;
      }
      const includedTable = `/tables/${match[1]}`;
      if (!tables.tableExists(includedTable)) {
        console.warn(`Included table ${includedTable} not found in metadata, skipping`);
        return new Set();
      }

      tableList.push(includedTable);
    }
  }

  return visited;
}

async function main() {
  const metadataPath = path.join("liblouis", "tables-data.js.metadata");
  const metadataContent = await fs.readFile(metadataPath, "utf-8");
  const metadata = JSON.parse(metadataContent);
  const outputContent = JSON.stringify(metadata.files, null, 4);
  const outputContentPath = path.join("generated", "tables-metadata.json");
  await fs.writeFile(outputContentPath, outputContent, "utf-8");

  const Tables = (await import("../tables.js")).default;

  const tablesDataPath = path.join("generated", "tables.data");
  const tablesData = await fs.readFile(tablesDataPath);
  const tablesBlob = new Blob([tablesData]);
  const tablesUrl = URL.createObjectURL(tablesBlob);

  const tables = new Tables(tablesUrl);

  const explodedTables = {};

  for (const file of metadata.files) {
    const name = file.filename;
    const exploded = await explodeTabeName(tables, name);
    if (exploded.size === 0) {
      continue;
    }
    explodedTables[name] = Array.from(exploded);
  }

  const explodedContent = JSON.stringify(explodedTables, null, 4);
  const explodedPath = path.join("generated", "exploded-tables.json");
  await fs.writeFile(explodedPath, explodedContent, "utf-8");

  await new Promise((resolve, reject) => {
    exec(
      "npx prettier --write generated/",
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
