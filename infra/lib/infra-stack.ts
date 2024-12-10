import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
// import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // DynamoDB テーブルの作成
    const table = new dynamodb.Table(this, 'training-api-demo-2-table', {
      tableName: 'training-api-demo-2-table',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'title', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda 関数の作成
    const lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'training-api-demo-2-lambda', {
      functionName: 'training-api-demo-2-lambda',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/express-app.ts',
      handler: 'handler',
      architecture: lambda.Architecture.ARM_64,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(lambdaFunction);

    // ロググループの作成
    const logGroup = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
      logGroupName: 'training-api-demo-2-apigw-access-logs',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にロググループを削除
    });

    // API Gateway の作成と Lambda 統合の設定
    const api = new apigateway.RestApi(this, 'training-api-demo-2-apigw', {
      restApiName: 'training-api-demo-2-apigw',
      description: 'example REST API',
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.clf(),
      },
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      requestTemplates: {
        'application/json': JSON.stringify({
          statusCode: 200,
        }),
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'https://training-api-demo-2.vercel.app'",
            'method.response.header.Access-Control-Allow-Credentials': "'true'",
          },
          responseTemplates: {
            'application/json': JSON.stringify({ message: '成功しました' }),
          },
        },
        {
          statusCode: '400',
          responseTemplates: {
            'application/json': JSON.stringify({ error: 'リクエストが無効です' }),
          },
        },
        {
          statusCode: '401',
          responseTemplates: {
            'application/json': JSON.stringify({ error: '認証が必要です' }),
          },
        },
        {
          statusCode: '500',
          responseTemplates: {
            'application/json': JSON.stringify({ error: '内部サーバーエラー' }),
          },
        },
        {
          statusCode: '503',
          responseTemplates: {
            'application/json': JSON.stringify({ error: 'サービス利用不可' }),
          },
        },
      ],
    });

    // メソッド追加関数を修正
    const addMethod = (
      resource: apigateway.Resource,
      httpMethod: string,
      integration: apigateway.Integration,
      customRequestParameters?: { [param: string]: boolean }
    ) => {
      resource.addMethod(httpMethod, integration, {
        requestParameters: customRequestParameters || getRequestParameters(httpMethod),
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true,
            },
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            },
          },
          {
            statusCode: '201',
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            },
          },
          {
            statusCode: '400',
            responseModels: {
              'application/json': apigateway.Model.ERROR_MODEL,
            },
          },
          {
            statusCode: '404',
            responseModels: {
              'application/json': apigateway.Model.ERROR_MODEL,
            },
          },
          {
            statusCode: '500',
            responseModels: {
              'application/json': apigateway.Model.ERROR_MODEL,
            },
          },
          {
            statusCode: '503',
            responseModels: {
              'application/json': apigateway.Model.ERROR_MODEL,
            },
          },
        ],
      });
    };

    // リクエストパラメータ取得関数
    const getRequestParameters = (httpMethod: string): { [param: string]: boolean } => {
      switch (httpMethod) {
        case 'GET':
          return { 'method.request.querystring.username': true };
        case 'POST':
        case 'PUT':
          return { 'method.request.querystring.body': true };
        case 'DELETE':
          return {
            'method.request.querystring.username': true,
            'method.request.querystring.title': true,
          };
        default:
          return {};
      }
    };

    // CORS設定を追加する関数を修正
    const addCorsOptions = (resource: apigateway.Resource) => {
      resource.addCorsPreflight({
        // 特定のオリジンを許可
        allowOrigins: [
          'https://training-api-demo-2.vercel.app',
        ],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        // レスポンスヘッダーを追加
        allowCredentials: true,
        exposeHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      });
    };

    // GET /get-reviews
    const getReviews = api.root.addResource('get-reviews');
    addMethod(getReviews, 'GET', lambdaIntegration);
    addCorsOptions(getReviews);

    // POST /add-review
    const addReview = api.root.addResource('add-review');
    addMethod(addReview, 'POST', lambdaIntegration);
    addCorsOptions(addReview);

    // PUT /update-review
    const updateReview = api.root.addResource('update-review');
    addMethod(updateReview, 'PUT', lambdaIntegration);
    addCorsOptions(updateReview);

    // DELETE /delete-review
    const deleteReview = api.root.addResource('delete-review');
    addMethod(deleteReview, 'DELETE', lambdaIntegration);
    addCorsOptions(deleteReview);

    // GET /generate-review の修正
    const generateReview = api.root.addResource('generate-review');
    addMethod(
      generateReview,
      'GET',
      lambdaIntegration,
      {
        'method.request.querystring.title': true,
        'method.request.querystring.author': true,
      }
    );
    addCorsOptions(generateReview);
  }
}
