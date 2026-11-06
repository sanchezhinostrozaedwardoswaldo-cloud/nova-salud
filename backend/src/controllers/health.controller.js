exports.getHealth = (req, res) => {
  res.json({
    success: true,
    message: 'API Nova Salud funcionando correctamente',
    service: 'nova-salud-backend',
    timestamp: new Date().toISOString()
  });
};