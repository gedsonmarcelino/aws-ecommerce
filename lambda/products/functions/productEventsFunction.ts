import { Callback, Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import * as AWS from 'aws-sdk';
import * as AWSXray from "aws-xray-sdk-core"
import { ProductEvent } from "/opt/nodejs/products/productEvent";

AWSXray.captureAWS(AWS);

const eventsDdb = process.env.EVENTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();

export const handler = async (
  event: ProductEvent,
  context: Context,
  callback: Callback
) : Promise<void> => {
  console.log('Event:', event);
  console.log('Context:', context)
  await createEvent(event);
  callback(null, JSON.stringify({
    productEventCreated: true,
    message: "OK"
  }));
}

function createEvent(event:ProductEvent) {
  const createdAt = Date.now();
  const ttl = Math.floor(createdAt / 1000) + 5 * 60; // 5 minutes

  return ddbClient.put({
    TableName: eventsDdb,
    Item: {
      pk: `#product_${event.productCode}`,
      sk: `${event.eventType}#${createdAt}`,
      email: event.email,
      createdAt,
      requesId: event.requestId,
      eventType: event.eventType,
      info: {
        productId: event.productId,
        price: event.productPrice
      },
      ttl
    }
  }).promise()
}