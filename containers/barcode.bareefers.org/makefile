
VERSION 	:= $(shell git describe --dirty)

SITE_DIR	:= ../../site
SERVER_DIR	:= ../../server

TARGET_DIR	:= ./target

TARGET		:= barcode@barcode.bareefers.org

build:
	cd ${SITE_DIR} && npm i && npm run generate
	docker build -t barcode-web-server -f web-server.dockerfile ${SITE_DIR}
	docker build -t barcode-api-server -f api-server.dockerfile ${SERVER_DIR}

push:
	docker save barcode-web-server | gzip -v > ${TARGET_DIR}/web-server.tgz
	docker save barcode-api-server | gzip -v > ${TARGET_DIR}/api-server.tgz
	ssh ${TARGET} "mkdir -p ~/${VERSION}"
	scp -r ${TARGET_DIR}/* ${TARGET}:~/${VERSION}/
	ssh ${TARGET} "cd ~/${VERSION} && ./start.sh"


