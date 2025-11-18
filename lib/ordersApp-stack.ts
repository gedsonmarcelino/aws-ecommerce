import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface OrdersAppStackProps extends cdk.StackProps {
  productsDdb: dynamoDb.Table;
}

export class OrdersAppStack extends cdk.Stack {
  
  readonly ordersHandler: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const ordersDdb = new dynamoDb.Table(this, 'OrdersDdb', {
      tableName: 'orders',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'pk',
        type: dynamoDb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamoDb.AttributeType.STRING,
      },
      billingMode: dynamoDb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    // Layers
    const ordersLayerArn = ssm.StringParameter.valueForStringParameter(this,'OrdersLayerVersionArn');    
    const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(this, "OrdersLayerVersionArn", ordersLayerArn);

    const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(this,'OrdersApiLayerVersionArn');    
    const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(this, "OrdersApiLayerVersionArn", ordersApiLayerArn);

    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this,'ProductsLayerVersionArn');    
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn);

    // Lambda Functions
    this.ordersHandler = new lambdaNodejs.NodejsFunction(
      this, 
      'OrdersFunction', 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: 'OrdersFunction',
        entry: 'lambda/orders/ordersFunction.ts',
        handler: 'handler',    
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: false,
          sourceMap: false,
          nodeModules: ['aws-xray-sdk-core'],
        },
        environment: {
          PRODUCTS_DDB: props.productsDdb.tableName,
          ORDERS_DDB: ordersDdb.tableName,
        },
        layers:[productsLayer, ordersLayer, ordersApiLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
      }
    );

    ordersDdb.grantReadWriteData(this.ordersHandler);
    props.productsDdb.grantReadData(this.ordersHandler);
  }
}