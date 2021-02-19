set -e

# Set them to not restart

docker update --restart=no $(docker ps -aq)

# Stop all containers

docker stop $(docker ps -aq)

# Remove them

docker container rm $(docker ps -aq)