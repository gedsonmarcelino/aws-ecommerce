import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as AWS from 'aws-sdk';
import * as AWSXray from "aws-xray-sdk-core"
import { Order, OrderRepository } from "/opt/nodejs/ordersLayer";
import { CarrierType, OrderRequest, OrderResponse, PaymentType, ShippingType } from "/opt/nodejs/ordersApiLayer";

AWSXray.captureAWS(AWS);

const ddbClient = new DocumentClient();

const productsTableName = process.env.PRODUCTS_DDB!;
const ordersTableName = process.env.ORDERS_DDB!;

const productRepository = new ProductRepository(ddbClient, productsTableName);
const orderRepository = new OrderRepository(ddbClient, ordersTableName);

const REQUEST = {
  "GET": async (
    event: APIGatewayProxyEvent,  
    _: Context    
  ) => {
    const {email, orderId} = event.queryStringParameters || {};

    if ( email && orderId ) {
      try {
        const response = await orderRepository.getOrderByEmailAndOrderId(email, orderId);
        return {
          statusCode: 200,
          body: JSON.stringify(convertToOrderResponse(response)),
        };
      } catch (error) {
        console.error("Error fetching order:", (<Error>error).message);
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: "Internal Server Error: Unable to fetch order",
          }),
        };
      }
    }

    if ( email && !orderId ) {
      const response = await orderRepository.getOrdersByEmail(email);
      return {
        statusCode: 200,
        body: JSON.stringify(response.map(convertToOrderResponse)),
      };
    }

    const response = await orderRepository.getAllOrders();
    return {
      statusCode: 200,
      body: JSON.stringify(response.map(convertToOrderResponse)),
    };
  },
  "POST": async (
    event: APIGatewayProxyEvent,  
    _: Context    
  ) => {
    try {
      const orderRequest: OrderRequest = JSON.parse(event.body!);
      const products = await productRepository.getProductsByIds(orderRequest.productIds);

      if ( products.length === 0 || products.length !== orderRequest.productIds.length ) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Bad Request: No valid products found for the order",
          }),
        };
      }

      const order = buildOrder(orderRequest, products);
      const orderCreated = await orderRepository.createOrder(order);

      return {
        statusCode: 201,
        body: JSON.stringify(convertToOrderResponse(orderCreated)),
      };
    } catch (error) {
      console.error("Error creating order:", (<Error>error).message);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal Server Error: Unable to create order",
        }),
      };
    }
  },
  "DELETE": async (
    event: APIGatewayProxyEvent,  
    _: Context    
  ) => {
    try {
      const {email, orderId} = event.queryStringParameters! as {email: string, orderId: string };
      const orderDeleted = await orderRepository.deleteOrder(email, orderId);
      return {
        statusCode: 200,
        body: JSON.stringify(convertToOrderResponse(orderDeleted)),
      };
    } catch (error) {
      console.error("Error deleting order:", (<Error>error).message);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal Server Error: Unable to delete order",
        }),
      };
    }
  }
} as { [key:string]: Function };

export const handler = async (
  event: APIGatewayProxyEvent,  
  context: Context
): Promise<APIGatewayProxyResult> => {

  const { awsRequestId } = context;
  const { httpMethod, requestContext: { requestId} } = event;

  const methodHandler = REQUEST[httpMethod]

  if (!methodHandler) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Bad request: Unsupported resource or method",
      }),
    };
  }

  return methodHandler(event, context);
}
  
function buildOrder( orderRequest: OrderRequest, products: Product[] ) : Order {
  const order: Order = {
    pk: orderRequest.email,
    products: products.map( product => ({
      code: product.code,
      price: product.price,
    })),
    billing: {
      payment: orderRequest.payment,
      totalPrice: products.reduce( (total, product) => total + product.price, 0),
    },
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier,
    },
  }

  return order;
}

function convertToOrderResponse(order: Order): OrderResponse {
  return {
    id: order.sk!,
    email: order.pk,
    createdAt: order.createdAt!,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice,
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType,
    },
    products: order.products.map( product => ({
      code: product.code,
      price: product.price,
    })),
  };
}