import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const mockProducts = [
  { id: '1', name: 'Product 1', price: 100 },
  { id: '2', name: 'Product 2', price: 200 },
];

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

      return {
        statusCode: 200,
        body: JSON.stringify(mockProducts),
      };
    }
  } else if ( resource === '/products/{id}' ) {
    if ( httpMethod === 'GET' ) {
      const {id} = event.pathParameters!;

      const product = mockProducts.find(product => product.id === id);

      if ( !product ) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Product not found",
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(product),
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
  