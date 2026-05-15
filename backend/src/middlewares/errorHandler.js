function errorHandler(error, req, res, next) {
  console.error(error);

  return res.status(500).json({
    error: "Erro interno do servidor."
  });
}

module.exports = errorHandler;