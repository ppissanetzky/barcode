# The standard debian nginx image from docker hub
FROM nginx

# Copy our nginx configuration file to the container,
# replacing the existing 'default.conf'
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Copy the generated site
COPY dist /usr/share/nginx/html/

