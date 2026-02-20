#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

LIBLOUIS_VERSION="v3.36.0"
MODULE_ROOT_DIR="$(pwd)"
LIBLOUIS_DIR="$MODULE_ROOT_DIR/liblouis"
GENERATED_DIR="$MODULE_ROOT_DIR/generated"

UID_CURRENT="$(id -u)"
GID_CURRENT="$(id -g)"

if [ ! -d "$LIBLOUIS_DIR/.git" ]; then
    git clone --depth 1 --branch "$LIBLOUIS_VERSION" https://github.com/liblouis/liblouis.git "$LIBLOUIS_DIR"
else
    (
        cd "$LIBLOUIS_DIR"
        git fetch --depth 1 origin "$LIBLOUIS_VERSION"
        git checkout "$LIBLOUIS_VERSION"
    )
fi

docker build -t liblouis-emscripten .

docker run --rm --user "${UID_CURRENT}:${GID_CURRENT}" -v "$LIBLOUIS_DIR:/liblouis" liblouis-emscripten

mkdir -p "$GENERATED_DIR"

cp "$LIBLOUIS_DIR/build.js" "$LIBLOUIS_DIR/build.wasm" "$LIBLOUIS_DIR/tables.data" "$GENERATED_DIR/"

node ./scripts/postbuild.js