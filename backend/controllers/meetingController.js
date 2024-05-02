const Meeting = require('../models/meeting');
const { v4: uuidv4 } = require('uuid'); // Importing uuidv4 from uuid package
const Department = require('../models/department');

exports.addMeeting = async (req, res) => {
    try {
        const { departmentIds, tag, meetingTopic, selectDate, selectTime } = req.body;
        const { file } = req; // Uploaded file (if any)
        console.log(file)
        // Generate a unique meeting ID combining project name and random value
        const projectName = 'Warcat'; // Replace 'Warcat' with your actual project name
        const randomValue = Math.floor(Math.random() * 1000); // Generate a random number
        const meetingId = projectName + '-' + randomValue; // Combine project name and random value

        // Create a new Meeting instance
        const newMeeting = new Meeting({
            meetingId, // Assign the generated meeting ID
            departmentIds, 
            tag,
            meetingTopic,
            selectDate,
            selectTime,
            imageUrl: file ? file.path : null // Store the file buffer if uploaded, otherwise null
        });

        // Save the meeting to the database
        await newMeeting.save();

        // Return success response
        res.status(201).json({ statusTxt: "success", message: 'Meeting added successfully', meeting: newMeeting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};


// Controller function to handle PUT request for editing a meeting
exports.editMeeting = async (req, res) => {
    try {
        const { meetingId } = req.body;
        const updateData = { ...req.body }; // Copy the request body to a new object

        // Find the meeting by custom meetingId
        let meeting = await Meeting.findOne({ meetingId: meetingId });
        
        if (!meeting) {
            return res.status(404).json({ statusTxt: "error", message: 'Meeting not found' });
        }

        // Check if file data exists in the request
        if (req.file) {
            // If file data exists, update the imageUrl property of the meeting
            meeting.imageUrl = req.file.path;
        }

        // Remove meetingId and file from updateData as we don't want to update these properties
        delete updateData.meetingId;
        delete updateData.file;

        // Update other meeting details dynamically based on the fields provided in the request body
        for (let key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                meeting[key] = updateData[key];
            }
        }

        // Save the updated meeting to the database
        await meeting.save();

        // Return success response
        res.status(200).json({ statusTxt: "success", message: 'Meeting updated successfully', meeting: meeting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};




exports.getAllMeetings = async (req, res) => {
    try {
        // Retrieve all meetings from the database
        const meetings = await Meeting.find();

        // Array to store promises for populating department names
        const promises = meetings.map(async (meeting) => {
            // Retrieve department names for the meeting
            const departments = await Department.find({ _id: { $in: meeting.departmentIds } }).select('department_name');
            // Map department names from the populated departments
            const departmentNames = departments.map(department => department.department_name);
            // Create a new object for the meeting with department names included
            return {
                meetingId: meeting.meetingId,
                tag: meeting.tag,
                meetingTopic: meeting.meetingTopic,
                selectDate: meeting.selectDate,
                selectTime: meeting.selectTime,
                imageUrl: meeting.imageUrl,
                departmentNames: departmentNames
            };
        });

        // Resolve all promises and return the response
        const meetingsWithDepartmentNames = await Promise.all(promises);
        res.status(200).json({ statusTxt: "success", meetings: meetingsWithDepartmentNames });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};

