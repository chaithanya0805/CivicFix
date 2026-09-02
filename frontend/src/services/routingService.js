import api from './api';

export const resolveSmartRouting = async (locationData, issueType) => {
  const payload = {
    issue_type: issueType,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    area: locationData.area,
    city: locationData.city,
    state: locationData.state,
    pincode: locationData.pincode,
    ward: locationData.ward || '',
    zone: locationData.zone || ''
  };
  const res = await api.post('/routing/resolve/', payload);
  return res.data;
};
