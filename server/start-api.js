const { app } = require('./simple-api');

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});