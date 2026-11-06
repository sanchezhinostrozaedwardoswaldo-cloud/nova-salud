const readline = require('readline/promises');
const { stdin, stdout } = require('process');

const { Usuario, sequelize } = require('../models');
const { hashPassword } = require('../services/auth.service');

async function main() {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout
  });

  try {
    await sequelize.authenticate();

    const existentes = await Usuario.count({
      where: { rol: 'ADMINISTRADOR' }
    });

    if (existentes > 0) {
      throw new Error(
        'Ya existe un administrador. No se creará otro desde este script.'
      );
    }

    console.log('\nCrear administrador inicial de Nova Salud\n');

    const nombre = (await rl.question('Nombre: ')).trim();
    const apellido = (await rl.question('Apellido: ')).trim();
    const correo = (await rl.question('Correo: ')).trim().toLowerCase();

    if (
      nombre.length < 2 ||
      apellido.length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
      throw new Error('Nombre, apellido o correo inválidos');
    }

    const existe = await Usuario.findOne({ where: { correo } });

    if (existe) {
      throw new Error('Ese correo ya está registrado');
    }

    // La contraseña se solicita mediante una variable privada,
    // evitando imprimirla en los registros del programa.
    const password = process.env.ADMIN_INITIAL_PASSWORD;

    if (!password || password.length < 10 || password.length > 128) {
      throw new Error(
        'Configura ADMIN_INITIAL_PASSWORD con 10 a 128 caracteres'
      );
    }

    await Usuario.create({
      nombre,
      apellido,
      correo,
      password_hash: await hashPassword(password),
      rol: 'ADMINISTRADOR',
      activo: true
    });

    console.log('\nAdministrador creado correctamente.');
  } catch (error) {
    console.error('\nError:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await sequelize.close();
  }
}

main();