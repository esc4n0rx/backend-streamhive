# Usando uma imagem oficial do Node.js
FROM node:22.14.0

# Definir diretório de trabalho
WORKDIR /src

# Copiar arquivos para dentro do container
COPY package.json package-lock.json ./
RUN npm install

# Copiar todo o código para o container
COPY . .

# Expor a porta usada pelo backend
EXPOSE 3000

# Comando para rodar a API
CMD ["node", "index.js"]
