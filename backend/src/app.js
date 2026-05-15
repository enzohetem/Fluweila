const express = require("express");
const cors = require("cors");

require("./database/schema");

const printersRoutes = require("./routes/printers.routes");
const filamentsRoutes = require("./routes/filaments.routes");
const productsRoutes = require("./routes/products.routes");
const ordersRoutes = require("./routes/orders.routes");
const jobsRoutes = require("./routes/jobs.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API da fila de impressão 3D funcionando!"
  });
});

app.use("/printers", printersRoutes);
app.use("/filaments", filamentsRoutes);
app.use("/products", productsRoutes);
app.use("/orders", ordersRoutes);
app.use("/jobs", jobsRoutes);
app.use("/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada."
  });
});

app.use(errorHandler);

module.exports = app;
