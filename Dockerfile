# Usando uma imagem oficial do Node.js
FROM node:22.14.0

# Definir diretório de trabalho
WORKDIR /src

# Copiar package.json e package-lock.json primeiro para otimizar o cache
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm install

# Copiar todo o código do projeto
COPY . . 

# Expor a porta usada pelo backend
#EXPOSE 3000

# Comando para rodar a API
CMD ["node", "src/index.js"]  

