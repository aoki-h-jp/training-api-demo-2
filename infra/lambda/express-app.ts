import serverlessExpress from '@vendia/serverless-express';
import express, { Request, Response } from 'express';
import AWS from 'aws-sdk';
import cors from 'cors';
import { BookReview } from './types';

const app = express();

const corsOptions = {
  origin: 'https://training-api-demo-2.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['*'],
};

app.use(cors(corsOptions));
app.use(express.json());

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello from Express on Lambda using Function URLs!' });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ message: 'OK' });
});

app.get('/get-reviews', async (req: Request, res: Response) => {
  const username = req.query.username as string;

  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': username,
    },
  };

  try {
    const data = await dynamoDb.query(params).promise();
    if (data.Items && data.Items.length > 0) {
      res.status(200).json({ message: 'Reviews fetched successfully', data: data.Items });
    } else {
      res.status(404).json({ error: 'Review not found' });
    }
  } catch (error) {
    console.error('Error getting reviews:', error);
    if (isServiceUnavailable(error)) {
      res.status(503).json({ error: 'Service Unavailable' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

app.post('/add-review', async (req: Request, res: Response) => {
  const review: BookReview = req.body;

  if (!review.username || !review.title || !review.author || !review.review) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    Item: review,
  };

  try {
    await dynamoDb.put(params).promise();
    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    console.error('Error adding review:', error);
    if (isServiceUnavailable(error)) {
      res.status(503).json({ error: 'Service Unavailable' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

app.put('/update-review', async (req: Request, res: Response) => {
  const review: BookReview = req.body;

  if (!review.username || !review.title || !review.author || !review.review) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    Item: review,
  };

  try {
    await dynamoDb.put(params).promise();
    res.status(200).json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Error updating review:', error);
    if (isServiceUnavailable(error)) {
      res.status(503).json({ error: 'Service Unavailable' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

app.delete('/delete-review', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const title = req.query.title as string;

  if (!username || !title) {
    res.status(400).json({ error: 'Username and title are required' });
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    Key: { username, title },
    ReturnValues: 'ALL_OLD',
  };

  try {
    const data = await dynamoDb.delete(params).promise();
    if (data.Attributes) {
      res.status(200).json({ message: 'Review deleted successfully' });
    } else {
      res.status(404).json({ error: 'Review not found' });
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    if (isServiceUnavailable(error)) {
      res.status(503).json({ error: 'Service Unavailable' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

export const handler = serverlessExpress({ app });

/**
 * AWS SDK のエラーがサービス利用不可 (503) に該当するかを判定する関数
 * @param error - キャッチされたエラーオブジェクト
 * @returns サービス利用不可の場合は true, それ以外は false
 */
function isServiceUnavailable(error: any): boolean {
  if (error && error.code) {
    const serviceUnavailableErrors = [
      'ProvisionedThroughputExceededException',
      'ThrottlingException',
      'ServiceUnavailable',
      'InternalServerError',
    ];
    return serviceUnavailableErrors.includes(error.code);
  }
  return false;
}
