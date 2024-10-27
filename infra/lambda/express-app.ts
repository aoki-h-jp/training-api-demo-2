import serverlessExpress from '@vendia/serverless-express';
import express, { Request, Response } from 'express';
import AWS from 'aws-sdk';
import cors from 'cors';
import { BookReview } from './types';

const app = express();

const corsOptions = {
  origin: 'https://training-api-demo.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['*'],
};

app.use(cors(corsOptions));
app.use(express.json());

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Hello from Express on Lambda using Function URLs!');
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

app.get('/get-reviews', async (req: Request, res: Response) => {
  const username = req.query.username as string;

  if (!username) {
    res.status(400).send('Username is required');
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
    res.status(200).json(data.Items);
  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/add-review', async (req: Request, res: Response) => {
  const review: BookReview = req.body;

  if (!review.username || !review.title || !review.author || !review.review) {
    res.status(400).send('All fields are required');
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    Item: review,
  };

  try {
    await dynamoDb.put(params).promise();
    res.status(201).send('Review added successfully');
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.put('/update-review', async (req: Request, res: Response) => {
  const review: BookReview = req.body;

  if (!review.username || !review.title || !review.author || !review.review) {
    res.status(400).send('All fields are required');
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    Item: review,
  };

  try {
    await dynamoDb.put(params).promise();
    res.status(200).send('Review updated successfully');
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/delete-review', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const title = req.query.title as string;

  if (!username || !title) {
    res.status(400).send('Username and title are required');
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    Key: { username, title },
  };

  try {
    await dynamoDb.delete(params).promise();
    res.status(200).send('Review deleted successfully');
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).send('Internal Server Error');
  }
});

export const handler = serverlessExpress({ app });
