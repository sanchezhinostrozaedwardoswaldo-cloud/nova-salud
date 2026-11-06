require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) {
  throw new Error('Falta configurar DATABASE_URL');
}

const certificatePath = path.resolve(
  __dirname,
  '../../certificates/supabase-ca.crt'
);

const sslCertificate = fs.readFileSync(
  certificatePath,
  'utf8'
);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: true,
      ca: sslCertificate
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;