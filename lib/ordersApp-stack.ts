import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs';

interface OrdersAppStackProps extends cdk.StackProps {
  productsDdb: dynamoDb.Table;
  eventsDdb: dynamoDb.Table;
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
    
    const ordersEventsLayerArn = ssm.StringParameter.valueForStringParameter(this,'OrdersEventsLayerVersionArn');    
    const ordersEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "OrdersEventsLayerVersionArn", ordersEventsLayerArn);
    
    const ordersEventsRepositoryLayerArn = ssm.StringParameter.valueForStringParameter(this,'OrdersEventsRepostiroyLayerVersionArn');    
    const ordersEventsRepositoryLayer = lambda.LayerVersion.fromLayerVersionArn(this, "OrdersEventsRepostiroyLayerVersionArn", ordersEventsRepositoryLayerArn);

    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this,'ProductsLayerVersionArn');    
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn);

    // Topic
    const ordersTopic = new sns.Topic(this, "OrderEventsTopic", {
      displayName: "Order events topic",
      topicName: "order-events"
    })
    
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
          ORDERS_EVENTS_TOPIC_ARN: ordersTopic.topicArn
        },
        layers:[productsLayer, ordersLayer, ordersApiLayer, ordersEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
      }
    );

    ordersDdb.grantReadWriteData(this.ordersHandler);
    props.productsDdb.grantReadData(this.ordersHandler);
    ordersTopic.grantPublish(this.ordersHandler)

    const orderEventsHandler = new lambdaNodejs.NodejsFunction(
      this, 
      'OrderEventsFunction', 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: 'OrderEventsFunction',
        entry: 'lambda/orders/orderEventsFunction.ts',
        handler: 'handler',    
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: false,
          sourceMap: false,
          nodeModules: ['aws-xray-sdk-core'],
        },
        environment: {
          EVENTS_DDB: props.eventsDdb.tableName,
        },
        layers:[ordersEventsLayer, ordersEventsRepositoryLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
      }
    );

    ordersTopic.addSubscription(new subs.LambdaSubscription(orderEventsHandler))
    
    const eventsDdbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:PutItem"],
      resources: [props.eventsDdb.tableArn],
      conditions: {
        ['ForAllValues:StringLike']: {
          'dynamodb:LeadingKeys': ["#order_*"]
        }
      }
    })

    orderEventsHandler.addToRolePolicy(eventsDdbPolicy)

  }
}