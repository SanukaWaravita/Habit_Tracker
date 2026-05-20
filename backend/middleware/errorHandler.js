export const notFound = (req, res, next) => {
    res.status(404).json({message: `Route not found: ${req.originalUrl}`});
};

export const errorHandler = (err, req, res, next) => {
    console.error(err);
    const status = resizeBy.statusCode !== 200 ? res.StatusCode : 500;
    res.status(status).json({
        message:err.message || "Server error",
    });
};