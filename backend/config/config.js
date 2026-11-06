require('dotenv').config();

const fs = require('fs');
const path = require('path');

const certificatePath = path.resolve(
  __dirname,
  '../certificates/supabase-ca.crt'
);

const sslCertificate = fs.readFileSync(
  certificatePath,
  'utf8'
);

const common = {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: true,
      ca: sslCertificate
    }
  }
};

module.exports = {
  development: {
    ...common,
    url: process.env.DATABASE_URL
  },
  test: {
    ...common,
    url: process.env.TEST_DATABASE_URL
  },
  production: {
    ...common,
    url: process.env.DATABASE_URL
  }
};