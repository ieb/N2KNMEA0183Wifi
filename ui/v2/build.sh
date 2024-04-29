#!/bin/bash
rm -rf dist
npm run build
cp src/index.css dist/index.css
sed 's/index.js/main.js/' src/index.html > dist/index.html
ls -l dist

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

upload dist/main.js.gz /main.js.gz
upload dist/main.js.map.gz /main.js.map.gz
upload dist/index.html /index.html
upload dist/index.css /index.css

check dist/main.js.gz /main.js.gz
check dist/main.js.map.gz /main.js.map.gz
check dist/index.html /index.html
check dist/index.css /index.css

