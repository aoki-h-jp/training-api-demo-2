import serverlessExpress from '@vendia/serverless-express';
import express, { Request, Response } from 'express';
import AWS from 'aws-sdk';
import cors from 'cors';
import { BookReview } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

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

// Secrets ManagerからGEMINI_API_KEYを取得する関数
async function getGeminiApiKey(): Promise<string> {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || '' });
  const command = new GetSecretValueCommand({ SecretId: process.env.GEMINI_API_KEY_SECRET_ARN || '' });

  try {
    const response = await client.send(command);
    if (response.SecretString) {
      return response.SecretString;
    } else {
      throw new Error('SecretStringが取得できませんでした');
    }
  } catch (error) {
    console.error('Secrets ManagerからGEMINI_API_KEYの取得に失敗しました:', error);
    throw error;
  }
}

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

app.get('/generate-review', async (req: Request, res: Response) => {
  const title = req.query.title as string;
  const author = req.query.author as string;

  if (!title || !author) {
    res.status(400).json({ error: 'タイトルと著者が必要です' });
    return;
  }

  try {
    // Secrets ManagerからGEMINI_API_KEYを取得
    const geminiApiKey = await getGeminiApiKey();
    const gemini = new GoogleGenerativeAI(geminiApiKey);

    // gemini-1.5-pro を使用してレビューを生成
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(
      `Generate a review for the book "${title}" by ${author} in Japanese. The review should be 200 characters or less.`
    );

    const response = await result.response;
    res.status(200).json({ message: 'レビューが生成されました', review: response.text() });
  } catch (error) {
    console.error('レビュー生成中にエラーが発生しました:', error);
    res.status(500).json({ error: 'レビュー生成中にエラーが発生しました' });
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
