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

    // Validators
    // DELETE /orders request validator
    const ordersDeleteRequestValidator = new apigateway.RequestValidator(this, 'OrdersDeleteRequestValidator', {
      restApi: api,
      requestValidatorName: 'OrdersDeleteRequestValidator',
      validateRequestParameters: true,
    });

    // POST /orders request validator
    const ordersPostRequestValidator = new apigateway.RequestValidator(this, 'OrdersPostRequestValidator', {
      restApi: api,
      requestValidatorName: 'OrdersPostRequestValidator',
      validateRequestBody: true,
    });

    const ordersModel = new apigateway.Model(this, 'OrderModel', {
      restApi: api,
      modelName: 'OrderModel',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          email: { type: apigateway.JsonSchemaType.STRING },
          productIds: { 
            type: apigateway.JsonSchemaType.ARRAY,
            items: { type: apigateway.JsonSchemaType.STRING },
            minItems: 1,
          },
          payment: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
          },
          shipping: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              type: { 
                type: apigateway.JsonSchemaType.STRING,
                enum: ['ECONOMIC', 'URGENT'],
              },
              carrier: {
                type: apigateway.JsonSchemaType.STRING,
                enum: ['CORREIOS', 'FEDEX'],
              }
            }
          }
        },
        required: ['email', 'productIds', 'shipping'],
      }
    });

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
      requestValidator: ordersDeleteRequestValidator,
    });

    // POST /orders
    ordersResource.addMethod('POST', ordersIntegration, {
      requestValidator: ordersPostRequestValidator,
      requestModels: {
        'application/json': ordersModel,
      },
    });
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
    productsResource.addMethod('POST', productsAdminIntegration,{
      requestValidator: new apigateway.RequestValidator(this, 'ProductsPostRequestValidator', {
        restApi: api,
        requestValidatorName: 'ProductsPostRequestValidator',
        validateRequestBody: true,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'ProductModel', {
          restApi: api,
          modelName: 'ProductModel',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              productName: { type: apigateway.JsonSchemaType.STRING },
              code: { type: apigateway.JsonSchemaType.STRING },
              price: { type: apigateway.JsonSchemaType.NUMBER },
              model: { type: apigateway.JsonSchemaType.STRING },
              productUrl: { type: apigateway.JsonSchemaType.STRING },
            },
            required: ['productName', 'code'],
          }
        })
      }
    });

    // PUT /products/{id}
    productIdResource.addMethod('PUT', productsAdminIntegration, {
      requestValidator: new apigateway.RequestValidator(this, 'ProductsPutRequestValidator', {
        restApi: api,
        requestValidatorName: 'ProductsPutRequestValidator',
        validateRequestBody: true,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'ProductModel', {
          restApi: api,
          modelName: 'ProductModel',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              productName: { type: apigateway.JsonSchemaType.STRING },
              code: { type: apigateway.JsonSchemaType.STRING },
              price: { type: apigateway.JsonSchemaType.NUMBER },
              model: { type: apigateway.JsonSchemaType.STRING },
              productUrl: { type: apigateway.JsonSchemaType.STRING },
            },
            required: ['productName', 'code'],
          }
        })
      }
    });

    // DELETE /products/{id}
    productIdResource.addMethod('DELETE', productsAdminIntegration);
  }
}