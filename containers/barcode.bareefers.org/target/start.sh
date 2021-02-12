
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker load < ./web-server.tgz
docker load < ./api-server.tgz
docker-compose build
docker-compose up --scale api-server=2 -d
