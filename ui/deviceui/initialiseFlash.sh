#!/bin/bash

COMPRESS_FILES="
bmsseasmartreader.js
d3-combined.js
history.js
index.js
worker.js
main.css
manifest.json
index.html
 "



rm -rf deploy
mkdir deploy
cp src/* deploy
for i in ${COMPRESS_FILES}
do
    gzip deploy/${i}
done


rm -rf ../../data
mkdir ../../data
cp deploy/* ../../data
cp secrets/config.txt ../../data/config.txt

cd ../../
pio run --target buildfs --environment esp32-c3
ls -l data
ls -l .pio/build/esp32-c3/spiffs.bin
pio run --target uploadfs --environment esp32-c3

cd ui/deviceui