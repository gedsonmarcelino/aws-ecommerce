import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class ECommerceLayersStack extends cdk.Stack {

  private readonly layersInfo = [
    { name: 'ProductsLayer', path: 'lambda/products/layers/productsLayer' },
    { name: 'ProductEventsLayer', path: 'lambda/products/layers/productEventsLayer' },
  ];

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    for (const layer of this.layersInfo) {
      this.createLayerAndSsm(layer.name, layer.path);
    }
  }

  private createLayerAndSsm(name: string, path: string) {
    const layer = new lambda.LayerVersion(this, name, {
      code: lambda.Code.fromAsset(path),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      layerVersionName: name,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, `${name}VersionArn`, {
      parameterName: `${name}VersionArn`,
      stringValue: layer.layerVersionArn,
    });
  }
}