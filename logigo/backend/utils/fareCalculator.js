// Simple fare estimator for a college project.
// In a production system, distance would come from a maps/geocoding API
// (e.g. Google Distance Matrix). Here the user enters an approximate
// distance in km, and we combine it with vehicle type + weight.

const BASE_FARE = {
  mini_truck: 100,
  pickup_van: 150,
  large_truck: 300
};

const RATE_PER_KM = {
  mini_truck: 12,
  pickup_van: 18,
  large_truck: 28
};

const RATE_PER_KG = {
  mini_truck: 2,
  pickup_van: 1.5,
  large_truck: 1
};

function calculateFare(vehicleType, distanceKm, weightKg) {
  const base = BASE_FARE[vehicleType];
  const perKm = RATE_PER_KM[vehicleType];
  const perKg = RATE_PER_KG[vehicleType];

  if (base === undefined) {
    throw new Error('Invalid vehicle type');
  }

  const distanceCost = distanceKm * perKm;
  const weightCost = weightKg * perKg;
  const total = base + distanceCost + weightCost;

  // Round to 2 decimal places
  return Math.round(total * 100) / 100;
}

module.exports = { calculateFare };
