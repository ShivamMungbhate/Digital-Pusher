import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'ai-mock', port });
});

app.listen(port, () => {
  console.log(`[AI-Mock] Service listening on port ${port}`);
});
