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

app.get("/api/weather", (req, res) => {
  let dateString = req.query.time;
  let date = new Date(dateString);
  if (
    !dateString ||
    Object.prototype.toString.call(date) !== "[object Date]" ||
    isNaN(date.getTime())
  ) {
    // res
    //   .status(504)
    //   .send(
    //     "APIet krever at en gyldig datostreng blir sendt med requesten på dette formatet: /api/weather?date=2018-06-19T21:00:00+03:00",
    //   );
    date = new Date("2018-06-12T13:00:00Z");
  }
  yrno
    .getWeather(KONTRASKJAERET)
    .then(weather => {
      let forecastArray = Object.values(weather.times);
      if (
        date < new Date(forecastArray[0].from) ||
        date > new Date(forecastArray[forecastArray.length - 1].from)
      ) {
        res.send({});
        return;
      }
      let forecast = forecastArray.reduce((acc, val) => {
        if (date >= new Date(val.from)) {
          return val;
        }
        return acc;
      }, {});
      forecast.symbolUrl = getSymbolUrl(forecast.symbolNumber);
      res.send(forecast);
      return;
    })
    .catch(e => {
      console.log(e);
      res.status(500).send(e);
    });
});

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
