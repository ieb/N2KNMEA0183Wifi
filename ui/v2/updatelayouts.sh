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

for i in $(ls src/layouts/layout-*.json)
do
    target=$(basename $i)
    upload $i /$target
    check $i /$target
done

