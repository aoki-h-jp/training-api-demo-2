import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
// import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface InfraStackProps extends cdk.StackProps {
  aiToken: string;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: InfraStackProps) {
    super(scope, id, props);

    // // Secrets Manager シークレットの作成
    // const secret = new secretsmanager.Secret(this, 'training-api-demo-2-secret', {
    //   secretName: 'training-api-demo-2-secret',
    //   secretStringValue: cdk.SecretValue.unsafePlainText(props?.aiToken || ''),
    // });

    // DynamoDB テーブルの作成
    const table = new dynamodb.Table(this, 'training-api-demo-2-table', {
      tableName: 'training-api-demo-2-table',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'title', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda 関数の作成
    const lambdaFunction = new lambda.Function(this, 'training-api-demo-2-lambda', {
      functionName: 'training-api-demo-2-lambda',
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'express-app.handler',
      environment: {
        TABLE_NAME: table.tableName,
        // SECRET_NAME: secret.secretName,
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

    // メソッド設定関数
    const addMethod = (
      resource: apigateway.Resource,
      httpMethod: string,
      integration: apigateway.Integration
    ) => {
      resource.addMethod(httpMethod, integration, {
        requestParameters: getRequestParameters(httpMethod),
        methodResponses: [
          {
            statusCode: '200',
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

    // GET /get-reviews
    addMethod(api.root.addResource('get-reviews'), 'GET', lambdaIntegration);

    // POST /add-review
    addMethod(api.root.addResource('add-review'), 'POST', lambdaIntegration);

    // PUT /update-review
    addMethod(api.root.addResource('update-review'), 'PUT', lambdaIntegration);

    // DELETE /delete-review
    addMethod(api.root.addResource('delete-review'), 'DELETE', lambdaIntegration);
  }
}
