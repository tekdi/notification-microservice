FROM node:20 as dependencies
WORKDIR /app
COPY . ./
RUN npm i --force
RUN npm install fcm-node --force
RUN apt-get update 

# Set default port (can be overridden via environment variable)
ENV PORT=4001
EXPOSE 4001

# Health check for Docker - checks if service and database are ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 4001; require('http').get('http://127.0.0.1:' + port + '/health/ready', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

CMD ["npm", "start"]
