ARG EMSCRIPTEN_TAG=5.0.0
FROM emscripten/emsdk:${EMSCRIPTEN_TAG}

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    autoconf \
    automake \
    libtool \
    licensecheck \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /liblouis

COPY scripts/docker_build_liblouis.sh /usr/local/bin/docker_build_liblouis.sh
RUN chmod +x /usr/local/bin/docker_build_liblouis.sh

ENTRYPOINT ["/usr/local/bin/docker_build_liblouis.sh"]