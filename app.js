require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const userRoutes = require('./backend/routes/index'); // Import your routes file

// Create Express app
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cors()); // Enable CORS


// Sample route
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Use your routes file
app.use('/api', userRoutes); // Mount your routes at '/api'
// const db = require("./config/keys").mongoURI;
const db = process.env.MONGODB_URL;
// Connect to MongoDB with updated options
const monogConnection = async () => {
    try {
        console.log("db::::::::::::", db);
        await mongoose.connect(db)
        console.log("[mongodb service] monogConnection connected")
    } catch (err) {
        console.log("[mongodb service] monogConnection Error", err)
        process.exit(1)
    }
}
const start = async () => {
    try {
        // await checkRedisConnection()
        await monogConnection()
        const port = process.env.PORT;
        app.listen(port, () => console.log(`Server up and running on port ${port} !`));
    } catch (e) {
        console.log("central error", e);
    }
}

start()


