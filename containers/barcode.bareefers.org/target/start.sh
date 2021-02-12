set -e

docker load < ./web-server.tgz
docker load < ./api-server.tgz

docker stop $(docker ps -aq)

docker-compose up --scale api-server=2 -d
