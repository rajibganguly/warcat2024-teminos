const Meeting = require('../models/meeting');
const { v4: uuidv4 } = require('uuid'); // Importing uuidv4 from uuid package
const Department = require('../models/department');


/***
 * @description AddMeetings
 * @Input req fields {departmentIds:String, tag:String, meetingTopic:String, selectDate:String, selectTime:string, imageUrl:String}
 */
exports.addMeeting = async (req, res) => {
    const { departmentIds, tag, meetingTopic, selectDate, selectTime, imageUrl } = req.body;
    // Generate a unique meeting ID combining project name and random value
    const randomValue = Math.floor(Math.random() * 1000); // Generate a random number
    const meetingId = process.env.PROJECT_NAME + '-' + randomValue; // Combine project name and random value
    
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
    
    try {

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

