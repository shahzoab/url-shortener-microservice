require("dotenv").config();

// Connect to database
let mongoose = require("mongoose");
mongoose.connect(process.env["MONGO_URI"], {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// init express
const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const cors = require("cors");

// Basic Configuration
const port = process.env.PORT || 8080;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (_req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Create Url schema
let UrlShema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true
  }
});

// Create Url model
let Url = mongoose.model("Url", UrlShema);

// Parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: false }));

// API endpoint to create shorturl
app.post("/api/shorturl", async function (req, res) {
  const count = await Url.countDocuments();
  const original_url = req.body.url;
  const short_url = count + 1;

  // Check if url is valid
  const pattern = new RegExp(
    "^([a-zA-Z]+:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR IP (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$", // fragment locator
    "i"
  );
  if (!pattern.test(original_url)) {
    res.json({ error: "invalid url" });
    return;
  }

  // Check if original_url is already in db then return it
  const exist = await Url.findOne({ original_url }).select("-_id -__v");
  if (exist) {
    res.json(exist);
    return;
  }
  // else create new document in db and return it
  const newUrl = new Url({ original_url, short_url });
  newUrl
    .save()
    .then(data => {
      res.json({ original_url: data.original_url, short_url: data.short_url });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

// API endpoint for shorturl redirection
app.get("/api/shorturl/:id", async function (req, res) {
  const doc = await Url.findOne({ short_url: req.params.id });
  res.redirect(doc.original_url);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
