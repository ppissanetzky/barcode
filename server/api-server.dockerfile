# Slim LTS node on buster (Debian 10)
FROM node:lts-buster-slim

# This is where the application lives
WORKDIR /home/node/app

# Copy package files into the container
COPY package.json package-lock.json ./

# Now, install node modules inside the container
RUN npm ci --only prod

# Copy the server code
COPY . .

# Set the OS time zone
ENV TZ=America/Los_Angeles
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Command to start the server
CMD ["node", "server.js"]
