const Meeting = require('../models/meeting');
const { v4: uuidv4 } = require('uuid'); // Importing uuidv4 from uuid package

// Controller function to handle POST request for adding a meeting
exports.addMeeting = async (req, res) => {
    try {
        const { departmentId, tag, meetingTopic, selectDate, selectTime } = req.body;
        const { file } = req; // Uploaded file (if any)
        // Generate a unique meeting ID
        const meetingId = uuidv4(); // Using uuidv4 to generate a unique ID

        // Create a new Meeting instance
        const newMeeting = new Meeting({
            meetingId: meetingId, // Assign the generated meeting ID
            departmentId, 
            tag,
            meetingTopic,
            selectDate,
            selectTime,
            imageUrl: file ? file.path : null // Store the file buffer if uploaded, otherwise null
        });

        // Save the meeting to the database
        await newMeeting.save();

        // Return success response
        res.status(201).json({ message: 'Meeting added successfully', meeting: newMeeting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
};
