const express = require("express");
const path = require("path");
const hbs = require("express-handlebars");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { uuid } = require("uuidv4");
const { Client, Config, CheckoutAPI } = require("@adyen/api-library");

const app = express();
// setup request logging
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));


dotenv.config({
  path: "./.env",
});

const config = new Config();
config.apiKey = process.env.API_KEY;
const client = new Client({ config });
client.setEnvironment("TEST");
const checkout = new CheckoutAPI(client);

app.engine(
  "handlebars",
  hbs({
    defaultLayout: "main",
    layoutsDir: __dirname + "/views/layouts",
    helpers: require("./util/helpers"),
  })
);

app.set("view engine", "handlebars");

/* ################# API ENDPOINTS ###################### */

// Get payment methods
app.post("/api/getPaymentMethods", async (req, res) => {
  try {
    const response = await checkout.paymentMethods({
      channel: "Web",
      merchantAccount: process.env.MERCHANT_ACCOUNT,
    });
    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

// Submitting a payment
app.post("/api/initiatePayment", async (req, res) => {
  try {
    const orderRef = uuid();
    const response = await checkout.payments({
      amount: { currency: "EUR", value: 1000 },
      reference: orderRef,
      merchantAccount: process.env.MERCHANT_ACCOUNT,
      channel: "web",
      shopperInteraction: "Ecommerce",
      paymentMethod: req.body.paymentMethod
    });

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});
/* ################# end API ENDPOINTS ###################### */

/* ################# CLIENT SIDE ENDPOINTS ###################### */

// Index (select a demo)
app.get("/", (_, res) => res.render("index"));

// Cart (continue to checkout)
app.get("/preview", (req, res) =>
  res.render("preview", {
    type: req.query.type,
  })
);

// Checkout page (make a payment)
app.get("/checkout", (req, res) =>
  res.render("checkout", {
    type: req.query.type,
    clientKey: process.env.CLIENT_KEY,
  })
);

// Result page
app.get("/result/:type", (req, res) =>
  res.render("result", {
    type: req.params.type,
  })
);

/* ################# end CLIENT SIDE ENDPOINTS ###################### */

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
