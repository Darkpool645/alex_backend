const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'API Documentation',
        version: '1.0.0',
        descrption: 'Documentación de ALEX'
    },
    servers: [
        {
            url: 'http://localhost:8000',
            descrption: 'Servidor local'
        },
    ],
};

const options = {
    swaggerDefinition,
    apis: ['../routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec