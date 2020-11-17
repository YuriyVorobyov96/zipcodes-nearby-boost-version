const CONVERT = 1609.34;

const initGeo = async(filepath, options) => {
  const Csv = require('fast-csv');
  const geolib = require('geolib');
  const _ = require('lodash');

  if (!filepath) {
    throw new Error('Cannot find file');
  }

  const csvOptions = {
    discardUnmappedColumns: true,
    headers: true,
    ignoreEmpty: true,
    trim: true,
  };

  const parsedDataFile = await new Promise(resolve => {
    const columns = {
      long: options && options.long !== undefined ? options.long : 'Long',
      lat: options && options.lat !== undefined ? options.lat : 'Lat',
      zipcode: options && options.zipcode !== undefined ? options.zipcode : 'Zipcode',
    };

    const resultRows = [];

    Csv.fromPath(filepath, csvOptions)
      .validate(data => data
          && _.has(data, columns.long) && !_.isEmpty(data[columns.long])
          && _.has(data, columns.lat) && !_.isEmpty(data[columns.lat])
          && _.has(data, columns.zipcode) && !_.isEmpty(data[columns.zipcode]))
      .on('data', row => {
        resultRows.push(row);
      })
      .on('end', () => {
        resolve(resultRows);
      });
  });

  const findCoordinates = (zipcode, columns) => {
    const index = parsedDataFile.findIndex(el => zipcode === el[columns.zipcode]);

    if (index === -1) {
      throw new Error(`Cannot find zipcode ${zipcode}`);
    }

    const found = parsedDataFile[index];

    return {
      latitude: found[columns.lat],
      longitude: found[columns.long],
    };
  };

  const findNear = (center, radius, columns) => parsedDataFile
    .filter(el => {
      const distance = geolib.getDistance(
        center,
        { latitude: el[columns.lat], longitude: el[columns.long] },
      );

      return distance <= radius;
    })
    .map(location => location[columns.zipcode]);

  return {
    near(origin, distance) {
      const columns = {
        long: options && options.long !== undefined ? options.long : 'Long',
        lat: options && options.lat !== undefined ? options.lat : 'Lat',
        zipcode: options && options.zipcode !== undefined ? options.zipcode : 'Zipcode',
      };

      if (_.isObject(origin) && _.has(origin, 'longitude') && _.has(origin, 'latitude')) {
        return findNear(origin, distance, columns);
      }

      const center = findCoordinates(origin, columns);

      return findNear(center, distance, columns);
    },
  };
};

let geo;

initGeo(path.join(__dirname, '../zipcodes.csv'))
  .then(created => {
    geo = created;
  });

module.exports = {
  async getZipCodes(zip, area) {
    if (!geo) {
      throw new Error('sorry');
    }

    const nearby = await geo.near(zip, area);

    return nearby;
  },
};
