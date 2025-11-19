import { Context, SNSEvent, SNSEventRecord } from "aws-lambda";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as AWS from 'aws-sdk';
import * as AWSXray from "aws-xray-sdk-core"
import { PromiseResult } from "aws-sdk/lib/request";
import { OrderEventRepository, OrderEventDdb } from "/opt/nodejs/orders/orderEventRepository";
import { Envelope, OrderEvent } from "/opt/nodejs/orders/orderEvent";

AWSXray.captureAWS(AWS);

const eventsTableName = process.env.EVENTS_DDB!;

const ddbClient = new DocumentClient();

const orderEventRepository = new OrderEventRepository(ddbClient, eventsTableName);

export const handler = async (
  event: SNSEvent,  
  _: Context
): Promise<void> => {
  const promises: Promise<
    PromiseResult<AWS.DynamoDB.DocumentClient.PutItemOutput, 
    AWS.AWSError>
  >[] = [];

  event.Records.forEach((record) => {
    promises.push(createEvent(record));
  });  

  await Promise.all(promises)
}

async function createEvent(record:SNSEventRecord) {
  const currentDate = Date.now();
  const envelope = JSON.parse(record.Sns.Message) as Envelope;
  const orderEvent = JSON.parse(envelope.data) as OrderEvent;

  const orderEventDdb: OrderEventDdb = {
    pk: `#order_${orderEvent.orderId}`,
    sk: `${envelope.eventType}#${currentDate}`,
    ttl: Math.floor(currentDate / 1000) + 5 * 60, // 5 minutes
    email: orderEvent.email,
    createdAt: currentDate,
    requestId: orderEvent.requestId,
    eventType: envelope.eventType,
    info: {
      orderId: orderEvent.orderId,
      productCodes: orderEvent.productCodes,
      messageId: record.Sns.MessageId,
    }
  }
  return orderEventRepository.createOrderEvent(orderEventDdb);
};