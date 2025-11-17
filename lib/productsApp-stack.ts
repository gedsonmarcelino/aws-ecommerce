import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface ProductsAppStackProps extends cdk.StackProps {
  eventsDdb: dynamoDb.Table;
}

export class ProductsAppStack extends cdk.Stack {

  readonly productsFetchHandler: lambdaNodejs.NodejsFunction;
  readonly productsAdminHandler: lambdaNodejs.NodejsFunction;
  readonly productsDdb: dynamoDb.Table;

  constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
    super(scope, id, props);

    // DynamoDB Table
    this.productsDdb = new dynamoDb.Table(this, 'ProductsDdb', {
      tableName: 'products',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'id',
        type: dynamoDb.AttributeType.STRING,
      },
      billingMode: dynamoDb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    // Layers
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this,'ProductsLayerVersionArn');    
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn);

    const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this,'ProductEventsLayerVersionArn');
    const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductEventsLayerVersionArn", productEventsLayerArn);

    // Lambda Functions
    this.productsFetchHandler = new lambdaNodejs.NodejsFunction(
      this, 
      'ProductsFetchFunction', 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: 'ProductsFetchFunction',
        entry: 'lambda/products/productsFetchFunction.ts',
        handler: 'handler',    
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: false,
          sourceMap: false,
          nodeModules: ['aws-xray-sdk-core'],
        },
        environment: {
          PRODUCTS_DDB: this.productsDdb.tableName,
        },
        layers:[productsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
      }
    );

    this.productsDdb.grantReadData(this.productsFetchHandler);

    const productsEventsHandler = new lambdaNodejs.NodejsFunction(
      this, 
      'ProductsEventsFunction', 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: 'ProductsEventsFunction',
        entry: 'lambda/products/productEventsFunction.ts',
        handler: 'handler',    
        timeout: cdk.Duration.seconds(2),
        bundling: {
          minify: false,
          sourceMap: false,
          nodeModules: ['aws-xray-sdk-core'],
        },
        environment: {
          EVENTS_DDB: props.eventsDdb.tableName,
        },
        layers:[productEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
      }
    );
    props.eventsDdb.grantWriteData(productsEventsHandler);

    this.productsAdminHandler = new lambdaNodejs.NodejsFunction(
      this, 
      'ProductsAdminFunction', 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: 'ProductsAdminFunction',
        entry: 'lambda/products/productsAdminFunction.ts',
        handler: 'handler',    
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: false,
          sourceMap: false,
          nodeModules: ['aws-xray-sdk-core'],
        },
        environment: {
          PRODUCTS_DDB: this.productsDdb.tableName,
          PRODUCTS_EVENTS_FUNCTION_NAME: productsEventsHandler.functionName,
        },
        layers:[productsLayer, productEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
      }
    );

    this.productsDdb.grantWriteData(this.productsAdminHandler);
    productsEventsHandler.grantInvoke(this.productsAdminHandler);

  }
}