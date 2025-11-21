import {Context, SQSEvent} from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as AWSXray from "aws-xray-sdk-core"

AWSXray.captureAWS(AWS);

export const handler = async (
  event: SQSEvent, 
  context: Context
) : Promise<void> => {

  event.Records.forEach(async (record) => {
    const snsMessage = JSON.parse(record.body);
    console.log('Received SNS message:', JSON.stringify(snsMessage, null, 2));

    // Here you can implement the logic to send email notifications
    // For example, using AWS SES or any other email service

    console.log(`Order email notification processed for Order ID: ${snsMessage.orderId}`);
  });
}