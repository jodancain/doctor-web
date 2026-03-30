const { call } = require('../utils/request');

const fetchHomeSummary = async () => {
  return await call('getHomeSummary');
};

module.exports = {
  fetchHomeSummary,
};

