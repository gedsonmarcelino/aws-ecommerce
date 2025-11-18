import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cwlogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodejs.NodejsFunction;
  productsAdminHandler: lambdaNodejs.NodejsFunction;
  ordersHandler: lambdaNodejs.NodejsFunction;
}

export class ECommerceApiStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props);

    const logGroup = new cwlogs.LogGroup(this, 'ECommerceApiLogs');

    const api = new apigateway.RestApi(this, 'ECommerceApi', {
      restApiName: 'ECommerceApi',
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      },
    });

    this.productsService(props, api);
    this.ordersService(props, api);
  }

  private ordersService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const ordersIntegration = new apigateway.LambdaIntegration(
      props.ordersHandler
    );

    // Resource: /orders
    const ordersResource = api.root.addResource('orders');

    // GET /orders
    // GET /orders?email={email}
    // GET /orders?email={email}&orderId={orderId}
    ordersResource.addMethod('GET', ordersIntegration);

    // DELETE /orders?email={email}&orderId={orderId}
    ordersResource.addMethod('DELETE', ordersIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.orderId': true,
      },
      requestValidator: new apigateway.RequestValidator(this, 'OrdersDeleteRequestValidator', {
        restApi: api,
        requestValidatorName: 'OrdersDeleteRequestValidator',
        validateRequestParameters: true,
      }),
    });

    // POST /orders
    ordersResource.addMethod('POST', ordersIntegration);
  }

  private productsService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const productsFetchIntegration = new apigateway.LambdaIntegration(
      props.productsFetchHandler
    );

    const productsAdminIntegration = new apigateway.LambdaIntegration(
      props.productsAdminHandler
    );

    // GET /products
    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', productsFetchIntegration);

    // GET /products/{id}
    const productIdResource = productsResource.addResource('{id}');
    productIdResource.addMethod('GET', productsFetchIntegration);

    // POST /products
    productsResource.addMethod('POST', productsAdminIntegration);

    // PUT /products/{id}
    productIdResource.addMethod('PUT', productsAdminIntegration);

    // DELETE /products/{id}
    productIdResource.addMethod('DELETE', productsAdminIntegration);
  }
}