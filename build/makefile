
VERSION 	:= $(shell git describe --dirty)

SITE_DIR	:= ../site
SERVER_DIR	:= ../server

TARGET_DIR	:= ./target

TARGET		:= barcode@barcode.bareefers.org

build:
	cd ${SITE_DIR} && npm ci && npm run generate
	cd ${SITE_DIR} && docker build -t ppissanetzky/barcode-web-server:${VERSION} -f web-server.dockerfile .
	cd ${SERVER_DIR} && docker build -t ppissanetzky/barcode-api-server:${VERSION} -f api-server.dockerfile .
	docker push ppissanetzky/barcode-web-server:${VERSION}
	docker push ppissanetzky/barcode-api-server:${VERSION}
	echo "VERSION=${VERSION}" > ${TARGET_DIR}/barcode-prod/.env
	echo "VERSION=${VERSION}" > ${TARGET_DIR}/barcode-demo/.env

push:
	ssh ${TARGET} "mkdir -p ~/${VERSION}"
	scp -r ${TARGET_DIR}/* ${TARGET}:~/${VERSION}/
	ssh ${TARGET} "cd ~/${VERSION} && ./start-all.sh"
