import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Order } from "aws-sdk/clients/mediaconvert";

export interface OrderEventDdb {
  pk: string;
  sk: string;
  ttl: number;
  email: string;
  createdAt: number;
  requestId: string;
  eventType: string;
  info: {
    orderId: string;
    productCodes: string[];
    messageId: string;
  }
}

export class OrderEventRepository {
  private ddbClient: DocumentClient;
  private eventsTableName: string;

  constructor(ddbClient: DocumentClient, eventsTableName: string) {
    this.ddbClient = ddbClient;
    this.eventsTableName = eventsTableName;
  }

  async createOrderEvent(orderEventDdb: OrderEventDdb){
    const params: DocumentClient.PutItemInput = {
      TableName: this.eventsTableName,
      Item: orderEventDdb,
    };
    return this.ddbClient.put(params).promise();
  }
}