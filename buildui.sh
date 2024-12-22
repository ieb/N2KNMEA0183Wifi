#!/bin/bash

FILES="
 "

function minify {
    npx minify $1 > $2
}

cd ui/deviceui
for i in ${FILES}
do
    minify src/${i}.js ../../data/${i}.min.js
done

cp index.html ../../data/index.html
cp secrets/config.txt ../../data/config.txt
#cp src/admin.html ../../data/admin.html
#cp src/admin.js ../../data/admin.js
#cp src/admin.css ../../data/admin.css

cd ../../

#cp lib/TFTDisplay/images/*.jpg data/

pio run --target buildfs --environment esp32-c3
ls -l data
ls -l .pio/build/nodemcu-32s/spiffs.bin
pio run --target uploadfs --environment esp32-c3
