import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { ORDERS } from '../lambda/orders/constants';

interface OrdersAppStackProps extends cdk.StackProps {
  productsDdb: dynamoDb.Table;
  eventsDdb: dynamoDb.Table;
}

export class OrdersAppStack extends cdk.Stack {
  
  readonly ordersHandler: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const ordersDdb = new dynamoDb.Table(this, ORDERS.DDB.NAME, {
      tableName: ORDERS.DDB.TABLE_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: ORDERS.DDB.PK,
        type: dynamoDb.AttributeType.STRING,
      },
      sortKey: {
        name: ORDERS.DDB.SK,
        type: dynamoDb.AttributeType.STRING,
      },
      billingMode: dynamoDb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    // Layers
    const ordersLayerArn = ssm.StringParameter.valueForStringParameter(this, ORDERS.LAYERS.ORDERS_LAYER.ARN);    
    const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(this, ORDERS.LAYERS.ORDERS_LAYER.ARN, ordersLayerArn);

    const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(this,ORDERS.LAYERS.ORDERS_API_LAYER.ARN);    
    const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(this, ORDERS.LAYERS.ORDERS_API_LAYER.ARN, ordersApiLayerArn);
    
    const ordersEventsLayerArn = ssm.StringParameter.valueForStringParameter(this,ORDERS.LAYERS.ORDERS_EVENTS_LAYER.ARN);    
    const ordersEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, ORDERS.LAYERS.ORDERS_EVENTS_LAYER.ARN, ordersEventsLayerArn);
    
    const ordersEventsRepositoryLayerArn = ssm.StringParameter.valueForStringParameter(this,ORDERS.LAYERS.ORDERS_EVENTS_REPOSITORY_LAYER.ARN);    
    const ordersEventsRepositoryLayer = lambda.LayerVersion.fromLayerVersionArn(this, ORDERS.LAYERS.ORDERS_EVENTS_REPOSITORY_LAYER.ARN, ordersEventsRepositoryLayerArn);

    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this,'ProductsLayerVersionArn');    
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn);

    // Topic
    const ordersTopic = new sns.Topic(this, ORDERS.TOPIC.ID, {
      displayName: ORDERS.TOPIC.DISPLAY_NAME,
      topicName: ORDERS.TOPIC.NAME,
    })
    
    // Lambda Functions
    this.ordersHandler = new lambdaNodejs.NodejsFunction(
      this, 
      ORDERS.LAMBDA.ORDERS_FUNCTION.NAME, 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName:ORDERS.LAMBDA.ORDERS_FUNCTION.NAME,
        entry: ORDERS.LAMBDA.ORDERS_FUNCTION.PATH,
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
      ORDERS.LAMBDA.ORDERS_EVENTS_FUNCTION.NAME, 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: ORDERS.LAMBDA.ORDERS_EVENTS_FUNCTION.NAME,
        entry: ORDERS.LAMBDA.ORDERS_EVENTS_FUNCTION.PATH,
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


    const billingHandler = new lambdaNodejs.NodejsFunction(
      this, 
      ORDERS.LAMBDA.BILLING_FUNCTION.NAME, 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: ORDERS.LAMBDA.BILLING_FUNCTION.NAME,
        entry: ORDERS.LAMBDA.BILLING_FUNCTION.PATH,
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
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
      }
    );

    ordersTopic.addSubscription(
      new subs.LambdaSubscription(billingHandler, {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['ORDER_CREATED']
          })
        }
      })
    )

    const orderEventsDlq = new sqs.Queue(this, `${ORDERS.QUEUE.ID}Dlq`, {
      queueName: `${ORDERS.QUEUE.NAME}-dlq`,
      retentionPeriod: cdk.Duration.days(10),
      enforceSSL: false,
      encryption: sqs.QueueEncryption.UNENCRYPTED,
    });

    const orderEventsQueue = new sqs.Queue(this, ORDERS.QUEUE.ID, {
      queueName: ORDERS.QUEUE.NAME,
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: orderEventsDlq,
      },
      enforceSSL: false,
      encryption: sqs.QueueEncryption.UNENCRYPTED,
    });

    ordersTopic.addSubscription(
      new subs.SqsSubscription(orderEventsQueue,{
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['ORDER_CREATED']
          })
        }
      })
    );

    const orderEmailsHandler = new lambdaNodejs.NodejsFunction(
      this, 
      ORDERS.LAMBDA.ORDERS_EMAILS_FUNCTION.NAME, 
      { 
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 256,
        functionName: ORDERS.LAMBDA.ORDERS_EMAILS_FUNCTION.NAME,
        entry: ORDERS.LAMBDA.ORDERS_EMAILS_FUNCTION.PATH,
        handler: 'handler',    
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: false,
          sourceMap: false,
          nodeModules: ['aws-xray-sdk-core'],
        },
        layers: [ordersEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
      }
    );

    orderEmailsHandler.addEventSource(
      new lambdaEventSources.SqsEventSource(orderEventsQueue, {
        batchSize: 5,
        enabled: true,
        maxBatchingWindow: cdk.Duration.minutes(1),
      })
    );
    orderEventsQueue.grantConsumeMessages(orderEmailsHandler);

    const orderEmailSesPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: ["*"],
    })

    orderEmailsHandler.addToRolePolicy(orderEmailSesPolicy)
  }
}