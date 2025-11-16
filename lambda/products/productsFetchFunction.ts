import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ProductRepository } from "/opt/nodejs/productsLayer";
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import * as AWS from 'aws-sdk';
import * as AWSXray from "aws-xray-sdk-core"

AWSXray.captureAWS(AWS);

const ddbClient = new DocumentClient();
const productsTableName = process.env.PRODUCTS_DDB!;

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

    if ( httpMethod === 'GET' ) {
      console.log("🚀 ~ handler ~ httpMethod:", httpMethod)
      const data = await productRepository.getAllProducts();
      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };
    }
  } else if ( resource === '/products/{id}' ) {
    if ( httpMethod === 'GET' ) {
      const id = event.pathParameters?.id!;

      try {
        const product = await productRepository.getProductById(id);
        return {
          statusCode: 200,
          body: JSON.stringify(product),
        };
      } catch (error) {
        console.error((<Error>error).message)
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Product not found",
          }),
        };
      }
    }

  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Not Found",
    }),
  };
}
  