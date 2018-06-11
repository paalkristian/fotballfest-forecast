const express = require("express");
const values = require("object.values");
if (!Object.values) {
  values.shim();
}

const yrno = require("yr.no-forecast")({
  version: "1.9", // this is the default if not provided,
  request: {
    // make calls to locationforecast timeout after 15 seconds
    timeout: 10000,
  },
});

const app = express();

// Middlewares
app.use("/icons", express.static("icons"));
app.use(express.json());

const KONTRASKJAERET = {
  lat: 59.910341,
  lon: 10.736276,
};

let weatherData = {};
let lastTimeDataWasFetched = new Date(0);

app.get("/api/weather", (req, res) => {
  let time = new Date(req.query.time);
  if (
    !req.query.time ||
    Object.prototype.toString.call(time) !== "[object Date]" ||
    isNaN(time.getTime())
  ) {
    res
      .status(504)
      .send(
        "APIet krever at en gyldig datostreng blir sendt med requesten på dette formatet: /api/weather?date=2018-06-19T21:00:00+03:00",
      );
  }
  if (new Date() - lastTimeDataWasFetched > 180000) {
    yrno
      .getWeather(KONTRASKJAERET)
      .then(weather => {
        lastTimeDataWasFetched = new Date();
        weatherData = weather;
        respondToRequestForWeather(weatherData, time, res);
      })
      .catch(err => {
        console.log(err);
        res.status(500).send(err);
      });
  } else {
    respondToRequestForWeather(weatherData, time, res);
  }
});

function respondToRequestForWeather(weather, forecastTime, res) {
  let forecastArray = Object.values(weather.times);
  if (
    forecastTime < new Date(forecastArray[0].from) ||
    forecastTime > new Date(forecastArray[forecastArray.length - 1].from)
  ) {
    res.send({});
    return;
  }
  let forecast = forecastArray.reduce((acc, val) => {
    if (forecastTime >= new Date(val.from)) {
      return val;
    }
    return acc;
  }, {});
  forecast.symbolUrl = getSymbolUrl(forecast.symbolNumber);
  res.send(forecast);
}

function getSymbolUrl(symbolNumber) {
  let symbolString = String(symbolNumber);
  if (symbolString.length === 1) {
    symbolString = "0" + symbolString;
  }
  return "/icons/" + symbolString + ".svg";
}

// PORT
const port = process.env.PORT || 3030;

app.listen(port, () => console.log(`Weather app listening on port ${port}...`));
