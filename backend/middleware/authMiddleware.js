const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Extract token from request headers
    const authHeader = req.headers.authorization;

    // Check if token is present
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Split header to extract token
    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, 'your_secret_key');

        // Attach user data to request object
        req.user = decoded;

        // Call next middleware or controller function
        next();
    } catch (error) {
        // Token is invalid
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = authMiddleware;
