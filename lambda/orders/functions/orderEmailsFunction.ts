import {Context, SNSMessage, SQSEvent} from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as AWSXray from "aws-xray-sdk-core"
import { Envelope, OrderEvent } from '/opt/nodejs/orders/orderEvent';
import { PromiseResult } from 'aws-sdk/lib/request';

AWSXray.captureAWS(AWS);

const sesClient = new AWS.SES();

export const handler = async (
  event: SQSEvent, 
  _: Context
) : Promise<void> => {

  const promises:Promise<PromiseResult<AWS.SES.SendEmailResponse, AWS.AWSError>>[] = [];
  event.Records.forEach(async (record) => {
    const body = JSON.parse(record.body) as SNSMessage;
    console.log("🚀 ~ handler ~ body:", body)
    promises.push(sendOrderEmail(body));
  });

  await Promise.all(promises);

  return 
}

function sendOrderEmail(body: SNSMessage) {
  const envelope = JSON.parse(body.Message) as Envelope;
  const event = JSON.parse(envelope.data) as OrderEvent;

  return sesClient.sendEmail({
    Destination: {
      ToAddresses: [event.email],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: `Your order with id ${event.orderId} with value ${event.billing.totalPrice}`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `Order ${event.orderId} Confirmation`,
      },
    },
    Source: 'gdev.ltda@gmail.com',
    ReplyToAddresses: ['gdev.ltda@gmail.com'],
  }).promise();
}