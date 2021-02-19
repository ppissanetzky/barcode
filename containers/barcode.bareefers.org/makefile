
VERSION 	:= $(shell git describe)

SITE_DIR	:= ../../site
SERVER_DIR	:= ../../server

TARGET_DIR	:= ./target

TARGET		:= barcode@barcode.bareefers.org

build:
	cd ${SITE_DIR} && npm i && npm run generate
	docker build -t ppissanetzky/barcode-web-server:${VERSION} -f web-server.dockerfile ${SITE_DIR}
	docker build -t ppissanetzky/barcode-api-server:${VERSION} -f api-server.dockerfile ${SERVER_DIR}
	docker push ppissanetzky/barcode-web-server:${VERSION}
	docker push ppissanetzky/barcode-api-server:${VERSION}
	echo "VERSION=${VERSION}" > ${TARGET_DIR}/version

push:
	ssh ${TARGET} "mkdir -p ~/${VERSION}"
	scp -r ${TARGET_DIR}/* ${TARGET}:~/${VERSION}/
	ssh ${TARGET} "cd ~/${VERSION} && ./start.sh"


