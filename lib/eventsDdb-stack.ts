import * as cdk from 'aws-cdk-lib';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class EventsDdbStack extends cdk.Stack {

  readonly table: dynamoDb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    this.table = new dynamoDb.Table(this, 'EventsDdb', {
      tableName: 'events',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'pk',
        type: dynamoDb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamoDb.AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamoDb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    const readScale = this.table.autoScaleReadCapacity({
      maxCapacity: 2,
      minCapacity: 1,
    });

    readScale.scaleOnUtilization({
      targetUtilizationPercent: 50, 
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    const writeScale = this.table.autoScaleWriteCapacity({
      maxCapacity: 4,
      minCapacity: 1,
    });

    writeScale.scaleOnUtilization({
      targetUtilizationPercent: 30, 
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
  }
}