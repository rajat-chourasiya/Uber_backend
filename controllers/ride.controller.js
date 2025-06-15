const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');



module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, pickup, destination, vehicleType } = req.body;

    try {
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });
        res.status(201).json(ride);

        const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
         


        const captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoordinates.lat, pickupCoordinates.lng, 50);
         
        ride.otp = ""

        console.log("req.user", req.user);

        const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');

       for (const captain of captainsInRadius) {
            const captainLat = captain.location.coordinates[1];
            const captainLng = captain.location.coordinates[0];
            const captainOrigin = `${captainLat},${captainLng}`;

            let distanceText = '';
            let durationText = '';

            try {
                const distanceResult = await mapService.getDistanceTime(captainOrigin, pickup);
                console.log(`Captain ${captain._id} → distance: ${distanceResult.distance.text}, duration: ${distanceResult.duration.text}`);
                distanceText = distanceResult.distance.text;  // e.g., "2.4 km"
                durationText = distanceResult.duration.text;  // e.g., "5 mins"
            } catch (err) {
                console.error('Error getting distance/time for captain:', captain._id);
                console.error('Distance Matrix error:', err.response?.data || err.message);
            }

            sendMessageToSocketId(captain.socketId, {
                event: 'new-ride',
                data: {
                    ...rideWithUser.toObject(),
                    distance: distanceText,
                    duration: durationText
                }
            });
        }

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });

           sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-confirmed',
            data: ride
        })

        return res.status(200).json(ride);
    } catch (err) {

        console.log(err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        console.log(ride);

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-started',
            data: ride
        })

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-ended',
            data: ride
        })



        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    } 
}

exports.submitFeedback = async (req, res) => {
  try {
    const { rideId, rating, comment } = req.body;
    const ride = await rideService.submitFeedback({ rideId, rating, comment });
    res.status(200).json({ message: 'Feedback submitted successfully', ride });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports.getDistanceBetweenLocations = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pickup, destination } = req.query;

  if (!pickup || !destination) {
    return res.status(400).json({ message: 'Pickup and destination are required' });
  }

  try {
    const distanceTime = await mapService.getDistanceTime(pickup, destination);

    return res.status(200).json({
      distance: distanceTime.distance.text,  // e.g. "2.3 km"
      duration: distanceTime.duration.text 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch distance and time' });
  }
};
