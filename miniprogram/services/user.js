const { call } = require('../utils/request');

const login = async (data) => {
  return await call('login', data);
};

const register = async (data) => {
  return await call('register', data);
};

const updateProfile = async (data) => {
  return await call('updateProfile', data);
};

const getDoctorInfo = async (doctorOpenid) => {
  return await call('getDoctorInfo', { doctorOpenid });
};

const listDoctors = async () => {
  return await call('listDoctors');
};

module.exports = {
  login,
  register,
  updateProfile,
  getDoctorInfo,
  listDoctors,
};
