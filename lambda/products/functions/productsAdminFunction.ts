import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as AWS from 'aws-sdk';
import * as AWSXray from "aws-xray-sdk-core"
import { Product, ProductRepository } from "/opt/nodejs/products/productRepository";
import { ProductEvent, ProductEventType } from "/opt/nodejs/products/productEvent";


AWSXray.captureAWS(AWS);

const ddbClient = new DocumentClient();
const lambdaClient = new AWS.Lambda();

const productsTableName = process.env.PRODUCTS_DDB!;
const productsEventsFunctionName = process.env.PRODUCTS_EVENTS_FUNCTION_NAME!;

const productRepository = new ProductRepository(ddbClient, productsTableName);

export const handler = async (
  event: APIGatewayProxyEvent,  
  context: Context
): Promise<APIGatewayProxyResult> => {

  const { awsRequestId } = context;
  console.log("🚀 ~ handler ~ awsRequestId:", awsRequestId)
  
  const { resource, httpMethod, requestContext: { requestId} } = event;
  console.log("🚀 ~ handler ~ requestId:", requestId)

  if ( resource === '/products' ) {
    console.log("🚀 ~ handler ~ resource:", resource)

    if ( httpMethod === 'POST' ) {
      console.log("🚀 ~ handler ~ httpMethod:", httpMethod)

      const data = JSON.parse(event.body!) as Product;

      const newProduct = await productRepository.createProduct(data);

      const response = await sendProductEvent(
        newProduct, 
        ProductEventType.CREATED, 
        "test@test.com", 
        awsRequestId
      );
      console.log("Response event invocation:", response);

      return {
        statusCode: 201,
        body: JSON.stringify(newProduct),
      };
    }
  } else if ( resource === '/products/{id}' ) {
    const id = event.pathParameters?.id!;

    if ( httpMethod === 'PUT' ) {
      const data = JSON.parse(event.body!) as Product;

      try {
        const product = await productRepository.updateProduct(id, data);  

        const response = await sendProductEvent(
          product, 
          ProductEventType.UPDATED, 
          "test@test.com", 
          awsRequestId
        );
        console.log("Response event invocation:", response);

        return {
          statusCode: 200,
          body: JSON.stringify(product),
        }
      } catch {
        return {
          statusCode: 404,
          body: 'Product not found',
        };
      }
    } else if ( httpMethod === 'DELETE' ) {
      try {
        const product = await productRepository.deleteProduct(id);

        const response = await sendProductEvent(
          product, 
          ProductEventType.DELETED, 
          "test@test.com", 
          awsRequestId
        );
        console.log("Response event invocation:", response);
        
        return {
          statusCode: 200,
          body: JSON.stringify(product),
        }
      } catch (error) {
        console.error((<Error>error).message)
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: (<Error>error).message,
          }),
        };
      }
    }
  }

  return {
    statusCode: 404,
    body: JSON.stringify({
      message: "Not Found",
    }),
  };
}
  
function sendProductEvent(
  product: Product, 
  eventType: ProductEventType,
  email: string,
  lambdaRequestId: string
) {

  const event: ProductEvent = {
    productId: product.id,
    productCode: product.code,
    productPrice: product.price,
    eventType,
    email,
    requestId: lambdaRequestId
  };

  return lambdaClient.invoke({
    FunctionName: productsEventsFunctionName,
    InvocationType: 'Event', //  RequestResponse - Synchronous invocation | Event - Assynchronous invocation | DryRun
    Payload: JSON.stringify(event)
  }).promise();
}