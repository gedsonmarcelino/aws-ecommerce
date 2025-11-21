import { Context, SNSEvent } from "aws-lambda";
import * as AWS from 'aws-sdk';
import * as AWSXray from "aws-xray-sdk-core"

AWSXray.captureAWS(AWS);

export const handler = async (
  event: SNSEvent,  
  _: Context
): Promise<void> => {
  event.Records.forEach(record => {
    const snsMessage = record.Sns;
    console.log("SNS Message ID:", snsMessage.MessageId);
    console.log("SNS Message:", snsMessage.Message);
  });
  return ;
}