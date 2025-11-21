import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs';
import { PRODUCTS } from '../lambda/products/constants';

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
    this.productsDdb = new dynamoDb.Table(this, PRODUCTS.DDB.NAME, {
      tableName: PRODUCTS.DDB.TABLE_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: PRODUCTS.DDB.PK,
        type: dynamoDb.AttributeType.STRING,
      },
      billingMode: dynamoDb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    // Layers
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this,PRODUCTS.LAYERS.PRODUCTS_LAYER.ARN);    
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, PRODUCTS.LAYERS.PRODUCTS_LAYER.ARN, productsLayerArn);

    const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, PRODUCTS.LAYERS.PRODUCT_EVENTS_LAYER.ARN);
    const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this,  PRODUCTS.LAYERS.PRODUCT_EVENTS_LAYER.ARN, productEventsLayerArn);

    // Lambda Functions
    this.productsFetchHandler = new lambdaNodejs.NodejsFunction(
      this, 
      PRODUCTS.LAMBDA.FETCH_FUNCTION.NAME, 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: PRODUCTS.LAMBDA.FETCH_FUNCTION.NAME,
        entry: PRODUCTS.LAMBDA.FETCH_FUNCTION.PATH,
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
      PRODUCTS.LAMBDA.EVENTS_FUNCTION.NAME, 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: PRODUCTS.LAMBDA.EVENTS_FUNCTION.NAME,
        entry: PRODUCTS.LAMBDA.EVENTS_FUNCTION.PATH,
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

    const eventsDdbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:PutItem"],
      resources: [props.eventsDdb.tableArn],
      conditions: {
        ['ForAllValues:StringLike']: {
          'dynamodb:LeadingKeys': ["#product_*"]
        }
      }
    })
    productsEventsHandler.addToRolePolicy(eventsDdbPolicy);

    this.productsAdminHandler = new lambdaNodejs.NodejsFunction(
      this, 
      PRODUCTS.LAMBDA.ADMIN_FUNCTION.NAME, 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: PRODUCTS.LAMBDA.ADMIN_FUNCTION.NAME,
        entry: PRODUCTS.LAMBDA.ADMIN_FUNCTION.PATH,
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