import tablesMetadata from "./generated/tables-metadata.json" with { type: "json" };

export default class Tables {
  #tables = {};
  #packageUrl;

  constructor(packageUrl) {
    this.#packageUrl = packageUrl;

    for (const table of tablesMetadata) {
      this.#tables[table.filename] = {
        filename: table.filename,
        start: table.start,
        end: table.end,
        data: null,
      };
    }
  }

  tableExists(name) {
    return name in this.#tables;
  }

  async loadTables(tableNames) {
    for (const name of tableNames) {
      if (!this.#tables[name]) {
        throw new Error(`Table ${name} not found in metadata`);
      }
    }

    const toLoad = tableNames.filter((name) => !this.#tables[name].data);
    const promises = [];

    for (const name of toLoad) {
      const table = this.#tables[name];
      const promise = fetch(this.#packageUrl, {
        headers: {
          Range: `bytes=${table.start}-${table.end - 1}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to load table ${name}: ${response.status} ${response.statusText}`,
            );
          }
          return response.arrayBuffer();
        })
        .then((arrayBuffer) => {
          table.data = arrayBuffer;
        });
      promises.push(promise);
    }

    await Promise.all(promises);

    return tableNames.map((name) => ({
      name: name,
      data: this.#tables[name].data,
    }));
  }
}
