const Meeting = require('../models/meeting');
const { v4: uuidv4 } = require('uuid'); // Importing uuidv4 from uuid package
const Department = require('../models/department');
const User = require('../models/user');

exports.addMeeting = async (req, res) => {
    try {
        const { departmentIds, tag, meetingTopic, selectDate, selectTime, imageUrl } = req.body;
        // const { file } = req; // Uploaded file (if any)
        // console.log(file)
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
            imageUrl
        });

        // Save the meeting to the database
        await newMeeting.save();

        // Return success response
        res.status(201).json({ statusTxt: "success", message: 'Meeting added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};


/***
 * @description EditMeetings
 * @Input req param meeting Id
 */
// Controller function to handle PUT request for editing a meeting
exports.editMeeting = async (req, res) => {
    try {
        const { meetingId } = req.query;
        const updateData = { ...req.body }; // Copy the request body to a new object

        // Find the meeting by custom meetingId
        let meeting = await Meeting.findOne({ meetingId: meetingId });

        if (!meeting) {
            return res.status(404).json({ statusTxt: "error", message: 'Meeting not found' });
        }

        // Update other meeting details dynamically based on the fields provided in the request body
        for (let key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                meeting[key] = updateData[key];
            }
        }

        // Save the updated meeting to the database
        await meeting.save();

        // Return success response warcat-144
        res.status(200).json({ statusTxt: "success", message: 'Meeting updated successfully', meeting: meeting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};




exports.getAllMeetings = async (req, res) => {
    const { userId, role_type } = req.body; // Extract userId and role_type from request body

    try {
        if (role_type === 'admin') {
            // If role_type is 'admin', fetch all meetings
            const meetings = await Meeting.find();
            const meetingsWithDepartmentNames = await populateDepartmentNames(meetings);
            return res.status(200).json({ statusTxt: "success", meetings: meetingsWithDepartmentNames });
        }

        // Find the user by userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ statusTxt: "error", message: 'User not found' });
        }

        // Check if the user role_type is 'head_of_office' or 'secretary'
        if (user.role_type !== role_type && user.role_type !== role_type) {
            return res.status(403).json({ statusTxt: "error", message: 'User is not authorized to access meetings' });
        }

        // Get the department IDs of the user
        const depIds = user.departments.map(department => department.dep_id);

        // Find meetings associated with the user's departments
        const meetings = await Meeting.find({ departmentIds: { $in: depIds } });
        const meetingsWithDepartmentNames = await populateDepartmentNames(meetings);

        if (!meetings || meetings.length === 0) {
            return res.status(404).json({ statusTxt: "error", message: 'No meetings found for the user' });
        }

        return res.status(200).json({ statusTxt: "success", meetings: meetingsWithDepartmentNames });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};

// Function to populate department names for meetings
async function populateDepartmentNames(meetings) {
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
    return await Promise.all(promises);
}



