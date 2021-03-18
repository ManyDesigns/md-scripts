FROM node:lts-alpine

COPY . .

RUN yarn

ENTRYPOINT [ "npm", "run" ]