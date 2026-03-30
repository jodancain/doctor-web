const success = (data = null) => {
  return {
    code: 0,
    msg: 'success',
    data,
  };
};

const error = (code = 500, msg = 'server error') => {
  return {
    code,
    msg,
    data: null,
  };
};

module.exports = {
  success,
  error,
};

