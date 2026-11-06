const sequelize = require('../config/database');

exports.getDatabaseStatus = async (req, res) => {
  try {
    await sequelize.authenticate();

    const [results] = await sequelize.query(`
      SELECT
        current_database() AS database,
        current_schema() AS schema,
        NOW() AS server_time
    `);

    res.json({
      success: true,
      message: 'Conexión con PostgreSQL establecida',
      database: results[0].database,
      schema: results[0].schema,
      serverTime: results[0].server_time
    });
  } catch (error) {
    console.error('Error de conexión PostgreSQL:', error.message);

    res.status(503).json({
      success: false,
      message: 'No se pudo conectar con PostgreSQL'
    });
  }
};