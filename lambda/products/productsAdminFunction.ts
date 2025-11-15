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

    if ( httpMethod === 'POST' ) {
      console.log("🚀 ~ handler ~ httpMethod:", httpMethod)

      const { name, price } = JSON.parse(event.body!);

      const newProduct = {
        id: String(mockProducts.length + 1),
        name,
        price,
      };

      mockProducts.push(newProduct);

      return {
        statusCode: 201,
        body: JSON.stringify(mockProducts),
      };
    }
  } else if ( resource === '/products/{id}' ) {
    const {id} = event.pathParameters!;
    if ( httpMethod === 'PUT' ) {
      const product = mockProducts.find(product => product.id === id);

      if ( !product ) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Product not found",
          }),
        };
      }

      const { name, price } = JSON.parse(event.body!);

      product.name = name;
      product.price = price;

      return {
        statusCode: 200,
        body: JSON.stringify(product),
      }
    } else if ( httpMethod === 'DELETE' ) {
      const productIndex = mockProducts.findIndex(product => product.id === id);

      if ( productIndex === -1 ) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Product not found",
          }),
        };
      }

      mockProducts.splice(productIndex, 1);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Product deleted successfully",
        }),
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
  