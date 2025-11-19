import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { PRODUCTS } from '../lambda/products/constants';
import { ORDERS } from '../lambda/orders/constants';

export class ECommerceLayersStack extends cdk.Stack {

  private readonly layersInfo = [
    { 
      name: PRODUCTS.LAYERS.PRODUCTS_LAYER.NAME, 
      arn: PRODUCTS.LAYERS.PRODUCTS_LAYER.ARN, 
      path: PRODUCTS.LAYERS.PRODUCTS_LAYER.PATH
    },
    { 
      name: PRODUCTS.LAYERS.PRODUCT_EVENTS_LAYER.NAME,
      arn: PRODUCTS.LAYERS.PRODUCT_EVENTS_LAYER.ARN,
      path: PRODUCTS.LAYERS.PRODUCT_EVENTS_LAYER.PATH 
    },
    { 
      name: ORDERS.LAYERS.ORDERS_LAYER.NAME, 
      arn: ORDERS.LAYERS.ORDERS_LAYER.ARN,
      path: ORDERS.LAYERS.ORDERS_LAYER.PATH 
    },
    { 
      name: ORDERS.LAYERS.ORDERS_API_LAYER.NAME, 
      arn: ORDERS.LAYERS.ORDERS_API_LAYER.ARN,
      path: ORDERS.LAYERS.ORDERS_API_LAYER.PATH,
    },
    { 
      name: ORDERS.LAYERS.ORDERS_EVENTS_LAYER.NAME, 
      arn: ORDERS.LAYERS.ORDERS_EVENTS_LAYER.ARN,
      path: ORDERS.LAYERS.ORDERS_EVENTS_LAYER.PATH,
    },
    { 
      name: ORDERS.LAYERS.ORDERS_EVENTS_REPOSITORY_LAYER.NAME, 
      arn: ORDERS.LAYERS.ORDERS_EVENTS_REPOSITORY_LAYER.ARN,
      path: ORDERS.LAYERS.ORDERS_EVENTS_REPOSITORY_LAYER.PATH,
    },
  ];

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    for (const layer of this.layersInfo) {
      this.createLayerAndSsm(layer.name, layer.path, layer.arn);
    }
  }

  private createLayerAndSsm(name: string, path: string, arn: string) {
    const layer = new lambda.LayerVersion(this, name, {
      code: lambda.Code.fromAsset(path),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      layerVersionName: name,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, arn, {
      parameterName: arn,
      stringValue: layer.layerVersionArn,
    });
  }
}