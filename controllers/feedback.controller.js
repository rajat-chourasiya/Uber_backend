const Feedback = require('../models/Feedback');
const Ride = require('../models/ride.model');

exports.submitFeedback = async (req, res) => {
  try {
    const { rideId, rating, comment } = req.body;
    const userId = req.user._id; // assuming auth middleware adds user to req

    // Check if feedback already exists for this ride & user
    const existing = await Feedback.findOne({ rideId: rideId, user: userId });
    if (existing) {
      return res.status(400).json({ message: 'Feedback already submitted for this ride' });
    }

    // Create feedback
    const feedback = new Feedback({
      rideId: rideId,
      user: userId,
      rating,
      comment,
    });
    await feedback.save();

    // Optionally update ride to mark feedback given
    await Ride.findByIdAndUpdate(rideId, { feedbackGiven: true });

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
