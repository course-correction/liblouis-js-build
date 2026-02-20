#!/bin/bash
set -euo pipefail

SRC_DIR=/liblouis
OUT_DIR=/liblouis

mkdir -p "$OUT_DIR"
cd "$SRC_DIR"

./autogen.sh
emconfigure ./configure --disable-shared
emmake make

emcc ./liblouis/.libs/liblouis.a \
  -s EXPORTED_RUNTIME_METHODS=ccall,stringToUTF16,stackAlloc,UTF8ToString,UTF16ToString,setValue,getValue,FS \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='"liblouisBuild"' \
  -s EXPORT_ES6=1 \
  -s LINKABLE=1 \
  -s STACK_SIZE=1MB \
  -s EXPORTED_FUNCTIONS=_lou_version,_lou_translateString,_malloc \
  -s ENVIRONMENT=web \
  -Os \
  -s EVAL_CTORS=2 \
  -flto \
  -o "$OUT_DIR/build.js" 

# exclude all tables that are not licensed under LGPL-2.1
licensecheck --machine --shortname-scheme=spdx tables | grep -v "LGPL-2.1" | cut -f1 | xargs rm -f

/emsdk/upstream/emscripten/tools/file_packager tables.data --no-node --js-output=tables-data.js --export-es6 --export-name=liblouisBuild --separate-metadata --preload tables/  