const express = require('express');
const app = express();
const port = 8001;

// Middleware to parse JSON in the request body
app.use(express.json({ limit: '10mb' }));

// Define a POST route that expects a "file" property in the request body
app.post('/api/add-meeting-rg', (req, res) => {
  const file = req.body;
  console.log(req.body)

  // Respond with a JSON object containing the processed file
  res.json({ value: file });
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
