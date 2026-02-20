import liblouisBuild from "./generated/build";
import explodedTableNames from "./generated/exploded-tables.json" with { type: "json" };
import Tables from "./tables.js";

const INT_SIZE = 4;
const TABLES_URL = new URL("./generated/tables.data", import.meta.url).href;

export default class Liblouis {
  #esInstance;
  #tables;
  #loadedTables = new Set();

  constructor(esInstance) {
    this.#esInstance = esInstance;
    this.#tables = new Tables(TABLES_URL);
  }

  static async initLiblouis() {
    const esInstance = await liblouisBuild();
    esInstance.FS.createPath("/", "tables", true, true);

    const liblouis = new Liblouis(esInstance);

    console.log(liblouis.version());

    return liblouis;
  }

  version() {
    const stringPtr = this.#lou_version();
    return this.#esInstance.UTF8ToString(stringPtr);
  }

  translateString(table, text) {
    const [inbufPtr, inbufLen] = this.#jsStringToUTF16(text);
    const inlenPtr = this.#esInstance._malloc(INT_SIZE);
    this.#esInstance.setValue(inlenPtr, inbufLen, "i32");

    const outbufPtr = this.#esInstance._malloc(inbufLen);
    const outlenPtr = this.#esInstance._malloc(INT_SIZE);
    this.#esInstance.setValue(outlenPtr, (inbufLen + 5) * 1.2, "i32");

    const returnCode = this.#lou_translateString(
      table,
      inbufPtr,
      inlenPtr,
      outbufPtr,
      outlenPtr,
      null,
      null,
      0,
    );

    if (returnCode != 1) {
      throw new Error("Liblouis lou_translateString returned error code");
    }
    const inLengthProcessed = this.#esInstance.getValue(inlenPtr, "i32");
    if (inLengthProcessed != text.length) {
      throw new Error("Liblouis did not process entire input string");
    }

    const outlen = this.#esInstance.getValue(outlenPtr, "i32");

    return this.#esInstance.UTF16ToString(outbufPtr, outlen * 2);
  }

  async loadTable(table) {
    // add leading slash if not present
    const tablesSplit = table
      .split(",")
      .map((t) => (t.startsWith("/") ? t : `/${t}`));

    const exploded = tablesSplit.flatMap((name) => explodedTableNames[name]);
    const uniqueTables = Array.from(new Set(exploded));
    const newTables = uniqueTables.filter((t) => !this.#loadedTables.has(t));

    if (newTables.length === 0) {
      return;
    }

    const tables = await this.#tables.loadTables(uniqueTables);
    for (const table of tables) {
      const bufferView = new Uint8Array(table.data);
      this.#esInstance.FS.createDataFile(
        table.name,
        null,
        bufferView,
        true,
        true,
        true,
      );
      this.#loadedTables.add(table.name);
    }
  }

  #jsStringToUTF16(jsString) {
    const outLen = this.#calcBufSizeUTF16(jsString.length);
    const outPtr = this.#esInstance._malloc(outLen);
    this.#esInstance.stringToUTF16(jsString, outPtr, outLen);

    return [outPtr, outLen];
  }

  #calcBufSizeUTF16(jsStrLen) {
    return (jsStrLen + 1) * 2;
  }

  #lou_version() {
    // char *lou_version ()
    const stringPtr = this.#esInstance._lou_version();
    return stringPtr;
  }

  #lou_translateString(
    tableList,
    inbuf,
    inlen,
    outbuf,
    outlen,
    typeform,
    spacing,
    mode,
  ) {
    /* int lou_translateString(
      const char *tableList,
      const widechar *inbuf,
      int *inlen,
      widechar *outbuf,
      int *outlen,
      formtype *typeform,
      char *spacing,
      int mode);
    */
    const returnCode = this.#esInstance.ccall(
      "lou_translateString",
      "number",
      [
        "string",
        "number",
        "number",
        "number",
        "number",
        "number",
        "number",
        "number",
      ],
      [tableList, inbuf, inlen, outbuf, outlen, typeform, spacing, mode],
    );

    return returnCode;
  }
}
