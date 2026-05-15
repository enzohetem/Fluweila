require("dotenv").config();

const app = require("./app");
const { completePackedOrdersAfterCutoff } = require("./controllers/orders.controller");

const PORT = process.env.PORT || 3333;

function runPackingCloseRoutine() {
  try {
    completePackedOrdersAfterCutoff();
  } catch (error) {
    console.error("Falha ao finalizar pedidos embalados automaticamente:", error);
  }
}

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  runPackingCloseRoutine();
  setInterval(runPackingCloseRoutine, 60 * 1000);
});
