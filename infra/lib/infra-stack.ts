import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      },
    });

    table.grantReadWriteData(lambdaFunction);

    // API Gateway の作成と Lambda 統合の設定
    const api = new apigateway.RestApi(this, 'training-api-demo-2-apigw', {
      restApiName: 'training-api-demo-2-apigw',
      description: 'example REST API',
      // ログレベルを INFO に設定
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      requestTemplates: {
        'application/json': JSON.stringify({
          statusCode: 200,
        }),
      },
    });

    // GET /get-reviews
    api.root.addResource('get-reviews').addMethod('GET', lambdaIntegration, {
      requestParameters: {
        'method.request.querystring.username': true,
      },
    });

    // POST /add-review
    api.root.addResource('add-review').addMethod('POST', lambdaIntegration, {
      requestParameters: {
        'method.request.querystring.body': true,
      },
    });

    // PUT /update-review
    api.root.addResource('update-review').addMethod('PUT', lambdaIntegration, {
      requestParameters: {
        'method.request.querystring.body': true,
      },
    });

    // DELETE /delete-review
    api.root.addResource('delete-review').addMethod('DELETE', lambdaIntegration, {
      requestParameters: {
        'method.request.querystring.username': true,
        'method.request.querystring.title': true,
      },
    });
  }
}
