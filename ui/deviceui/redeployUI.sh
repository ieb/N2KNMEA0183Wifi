#!/bin/bash

. secrets/deploy

function upload {
    file=$1
    path=$2
    echo uploading $file to $path
    curl \
      -H "authorization: ${authorization}" \
      -F "op=upload" \
      -F "path=${path}" \
      -F "file=@${file}" \
      -w "%{http_code}\n" \
      http://${deviceHost}/api/fs.json
}
function check {
    file=$1
    path=$2
    curl -s http://${deviceHost}${path} -o ${file}.deployed
    diff ${file} ${file}.deployed
}

function minify {
    npx minify --js $1 > $2
}




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

for i in $(ls deploy/*)
do
    target=$(basename $i)
    upload $i /$target
    check $i /$target
done
