import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
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

    if ( httpMethod === 'POST' ) {
      console.log("🚀 ~ handler ~ httpMethod:", httpMethod)

      const data = JSON.parse(event.body!) as Product;

      const newProduct = await productRepository.createProduct(data);

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
  